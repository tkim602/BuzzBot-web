"use client";

import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { ChatWorkspace } from "./ChatWorkspace";
import { Sidebar } from "./Sidebar";
import styles from "./buzzbot.module.css";

export function BuzzBotApp() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [input, setInput] = useState("");
  const openSidebarButton = useRef<HTMLButtonElement>(null);

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

  const submitQuestion = (nextQuestion: string) => {
    const trimmed = nextQuestion.trim();
    if (!trimmed) return;
    setInput("");
  };

  const resetChat = () => {
    setInput("");
    setMobileOpen(false);
  };

  return (
    <>
      <a className={styles.skipLink} href="#chat-workspace">
        Skip to chat
      </a>
      <div className={styles.appShell}>
        <Sidebar
          activeConversationId={null}
          collapsed={collapsed}
          historyGroups={[]}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          onNewChat={resetChat}
          onSelectConversation={() => undefined}
          onToggle={() => setCollapsed((value) => !value)}
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
            error={null}
            input={input}
            messages={[]}
            onInputChange={setInput}
            onRetry={() => undefined}
            onSubmit={submitQuestion}
            pending={false}
          />
        </div>
      </div>
    </>
  );
}
