"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { AccountDialog } from "./AccountDialog";
import { ChatWorkspace } from "./ChatWorkspace";
import { PersonalizationDialog } from "./PersonalizationDialog";
import { Sidebar } from "./Sidebar";
import { useAuth } from "./auth";
import { sendChat } from "./chat-api";
import {
  EMPTY_CHAT_STATE,
  groupConversations,
  loadChatState,
  migrateAnonymousChatState,
  saveChatState,
  toApiHistory,
} from "./chat-storage";
import type {
  ChatTurn,
  StoredChatState,
  StoredConversation,
  StoredMessage,
} from "./chat-types";
import styles from "./buzzbot.module.css";

type ActiveRequest = {
  controller: AbortController;
  conversationId: string;
  messageId: string;
};

function compactTitle(question: string): string {
  return question.length <= 58 ? question : `${question.slice(0, 57).trimEnd()}…`;
}

function replaceConversation(
  state: StoredChatState,
  conversation: StoredConversation,
): StoredChatState {
  return {
    ...state,
    activeConversationId: conversation.id,
    conversations: [
      conversation,
      ...state.conversations.filter((item) => item.id !== conversation.id),
    ],
  };
}

export function BuzzBotApp() {
  const auth = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatState, setChatState] = useState<StoredChatState>(EMPTY_CHAT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const [storageUserId, setStorageUserId] = useState<string | null>();
  const openSidebarButton = useRef<HTMLButtonElement>(null);
  const activeRequest = useRef<ActiveRequest | null>(null);

  const activeConversation = chatState.conversations.find(
    (conversation) => conversation.id === chatState.activeConversationId,
  );
  const messages = activeConversation?.messages ?? [];
  const historyGroups = useMemo(
    () => groupConversations(chatState.conversations),
    [chatState.conversations],
  );
  const failedQuestion = [...messages]
    .reverse()
    .find((message) => message.role === "user" && message.status === "failed");
  const displayError =
    error ?? (failedQuestion ? "This question was not completed." : null);

  useEffect(() => {
    if (auth.loading) return;
    const request = activeRequest.current;
    if (request) {
      activeRequest.current = null;
      request.controller.abort();
      setPending(false);
    }
    const userId = auth.user?.uid ?? null;
    try {
      if (userId) migrateAnonymousChatState(window.localStorage, userId);
    } catch {
      // Account switching must remain usable when storage is unavailable.
    }
    // Browser-only persistence must hydrate after auth chooses its namespace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChatState(loadChatState(window.localStorage, userId));
    setStorageUserId(userId);
    setHydrated(true);
    setError(null);
  }, [auth.loading, auth.user?.uid]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      saveChatState(window.localStorage, chatState, storageUserId);
    } catch {
      // A full or unavailable localStorage must not break chat.
    }
  }, [chatState, hydrated, storageUserId]);

  useEffect(
    () => () => {
      activeRequest.current?.controller.abort();
    },
    [],
  );

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobileOpen(false);
      openSidebarButton.current?.focus();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  const markMessageFailed = (conversationId: string, messageId: string) => {
    setChatState((state) => ({
      ...state,
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: conversation.messages.map((message) =>
                message.id === messageId ? { ...message, status: "failed" } : message,
              ),
            }
          : conversation,
      ),
    }));
  };

  const abortRequest = () => {
    const request = activeRequest.current;
    if (!request) return;
    activeRequest.current = null;
    request.controller.abort();
    markMessageFailed(request.conversationId, request.messageId);
    setPending(false);
  };

  const runRequest = async (
    conversationId: string,
    messageId: string,
    question: string,
    history: ChatTurn[],
  ) => {
    const controller = new AbortController();
    activeRequest.current = { controller, conversationId, messageId };
    setPending(true);
    setError(null);
    try {
      const response = await sendChat(
        { query: question, thread_id: conversationId, history },
        controller.signal,
      );
      const now = new Date().toISOString();
      const assistantMessage: StoredMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.answer,
        createdAt: now,
        status: "complete",
        citations: response.citations,
        confidence: response.confidence,
        freshness: response.freshness,
        notes: response.notes,
      };
      setChatState((state) => ({
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                updatedAt: now,
                messages: [
                  ...conversation.messages.map((message) =>
                    message.id === messageId
                      ? { ...message, status: "complete" as const }
                      : message,
                  ),
                  assistantMessage,
                ],
              }
            : conversation,
        ),
      }));
    } catch (requestError) {
      if (controller.signal.aborted) return;
      markMessageFailed(conversationId, messageId);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "BuzzBot could not answer that request. Please try again.",
      );
    } finally {
      if (activeRequest.current?.controller === controller) {
        activeRequest.current = null;
        setPending(false);
      }
    }
  };

  const submitQuestion = (nextQuestion: string) => {
    const question = nextQuestion.trim();
    if (!question || pending) return;
    const now = new Date().toISOString();
    const conversation =
      activeConversation ??
      ({
        id: crypto.randomUUID(),
        title: compactTitle(question),
        createdAt: now,
        updatedAt: now,
        messages: [],
      } satisfies StoredConversation);
    const history = toApiHistory(conversation.messages);
    const userMessage: StoredMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      createdAt: now,
      status: "complete",
    };
    const nextConversation = {
      ...conversation,
      updatedAt: now,
      messages: [...conversation.messages, userMessage],
    };
    setChatState((state) => replaceConversation(state, nextConversation));
    setInput("");
    void runRequest(conversation.id, userMessage.id, question, history);
  };

  const retryQuestion = () => {
    if (!activeConversation || !failedQuestion || pending) return;
    const history = toApiHistory(activeConversation.messages);
    setChatState((state) => ({
      ...state,
      conversations: state.conversations.map((conversation) =>
        conversation.id === activeConversation.id
          ? {
              ...conversation,
              messages: conversation.messages.map((message) =>
                message.id === failedQuestion.id
                  ? { ...message, status: "complete" }
                  : message,
              ),
            }
          : conversation,
      ),
    }));
    void runRequest(
      activeConversation.id,
      failedQuestion.id,
      failedQuestion.content,
      history,
    );
  };

  const resetChat = () => {
    abortRequest();
    setChatState((state) => ({ ...state, activeConversationId: null }));
    setInput("");
    setError(null);
    setMobileOpen(false);
  };

  const selectConversation = (id: string) => {
    abortRequest();
    setChatState((state) => ({ ...state, activeConversationId: id }));
    setInput("");
    setError(null);
    setMobileOpen(false);
  };

  const togglePin = (id: string) => {
    const now = new Date().toISOString();
    setChatState((state) => ({
      ...state,
      conversations: state.conversations.map((conversation) =>
        conversation.id === id
          ? { ...conversation, pinnedAt: conversation.pinnedAt ? undefined : now }
          : conversation,
      ),
    }));
  };

  const deleteConversation = (id: string) => {
    const conversation = chatState.conversations.find((item) => item.id === id);
    if (!conversation || !window.confirm(`Delete "${conversation.title}"?`)) return;
    if (chatState.activeConversationId === id) abortRequest();
    setChatState((state) => ({
      ...state,
      activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
      conversations: state.conversations.filter((item) => item.id !== id),
    }));
    setError(null);
    setMobileOpen(false);
  };

  return (
    <>
      <a className={styles.skipLink} href="#chat-workspace">
        Skip to chat
      </a>
      <div className={styles.appShell}>
        <Sidebar
          accountEmail={auth.user?.email ?? null}
          activeConversationId={chatState.activeConversationId}
          collapsed={collapsed}
          historyGroups={historyGroups}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          onDeleteConversation={deleteConversation}
          onNewChat={resetChat}
          onOpenAccount={() => setAccountOpen(true)}
          onOpenPersonalization={() =>
            auth.user ? setPersonalizationOpen(true) : setAccountOpen(true)
          }
          onSelectConversation={selectConversation}
          onToggle={() => setCollapsed((value) => !value)}
          onTogglePin={togglePin}
          personalizationEligible={auth.personalizationEligible}
        />
        {mobileOpen && (
          <button
            aria-label="Close sidebar backdrop"
            className={styles.backdrop}
            onClick={() => setMobileOpen(false)}
            type="button"
          />
        )}
        <button
          aria-label="Open sidebar"
          aria-controls="buzzbot-sidebar"
          aria-expanded={mobileOpen}
          className={styles.mobileMenu}
          onClick={() => setMobileOpen(true)}
          ref={openSidebarButton}
          type="button"
        >
          <Menu aria-hidden="true" size={20} />
        </button>
        <div id="chat-workspace" className={styles.workspaceSlot}>
          <ChatWorkspace
            error={displayError}
            input={input}
            messages={messages}
            onInputChange={setInput}
            onRetry={retryQuestion}
            onSubmit={submitQuestion}
            pending={pending}
          />
        </div>
      </div>
      <AccountDialog auth={auth} onClose={() => setAccountOpen(false)} open={accountOpen} />
      <PersonalizationDialog
        accountEmail={auth.user?.email ?? null}
        eligible={auth.personalizationEligible}
        onClose={() => setPersonalizationOpen(false)}
        open={personalizationOpen}
      />
    </>
  );
}
