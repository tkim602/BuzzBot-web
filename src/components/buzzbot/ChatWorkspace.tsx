"use client";

import { useEffect, useRef } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { ResponseEvidence } from "./Evidence";
import type { StoredMessage } from "./chat-types";
import { SUGGESTIONS } from "./mock-data";
import styles from "./buzzbot.module.css";

export type ChatWorkspaceProps = {
  messages: readonly StoredMessage[];
  input: string;
  pending: boolean;
  error: string | null;
  onInputChange(value: string): void;
  onSubmit(question: string): void;
  onRetry(): void;
};

type ComposerProps = Pick<
  ChatWorkspaceProps,
  "input" | "pending" | "onInputChange" | "onSubmit"
>;

function Composer({ input, pending, onInputChange, onSubmit }: ComposerProps) {
  const submit = () => {
    const question = input.trim();
    if (question && !pending) onSubmit(question);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form aria-label="Message BuzzBot" className={styles.composer} onSubmit={handleSubmit}>
      <textarea
        aria-label="Message BuzzBot"
        disabled={pending}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about Georgia Tech"
        rows={1}
        value={input}
      />
      <button
        aria-label="Send message"
        disabled={pending || !input.trim()}
        type="submit"
      >
        <ArrowUp aria-hidden="true" size={18} strokeWidth={2} />
      </button>
    </form>
  );
}

function Messages({ messages }: { messages: readonly StoredMessage[] }) {
  return messages.map((message) =>
    message.role === "user" ? (
      <p
        className={`${styles.userMessage} ${styles.messageTurn}`}
        data-failed={message.status === "failed"}
        data-testid="message-turn"
        key={message.id}
      >
        {message.content}
      </p>
    ) : (
      <article
        className={`${styles.answer} ${styles.messageTurn}`}
        data-testid="message-turn"
        key={message.id}
      >
        <p>{message.content}</p>
        <ResponseEvidence message={message} />
      </article>
    ),
  );
}

export function ChatWorkspace({
  messages,
  input,
  pending,
  error,
  onInputChange,
  onSubmit,
  onRetry,
}: ChatWorkspaceProps) {
  const empty = messages.length === 0 && !pending && !error;
  const messageScroll = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);

  useEffect(() => {
    const element = messageScroll.current;
    if (element && followLatest.current && typeof element.scrollTo === "function") {
      element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length, pending, error]);
  return (
    <main className={styles.workspace}>
      <section className={styles.chatCanvas}>
        {empty ? (
          <div className={styles.emptyState}>
            <h1>What can I help you with at Tech?</h1>
            <Composer
              input={input}
              onInputChange={onInputChange}
              onSubmit={onSubmit}
              pending={pending}
            />
            <div aria-label="Likely questions" className={styles.suggestions}>
              {SUGGESTIONS.map((suggestion) => (
                <button
                  aria-label={`Ask: ${suggestion}`}
                  key={suggestion}
                  onClick={() => onSubmit(suggestion)}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.thread}>
            <div
              className={styles.messages}
              data-testid="message-scroll"
              onScroll={(event) => {
                const element = event.currentTarget;
                followLatest.current =
                  element.scrollHeight - element.scrollTop - element.clientHeight <= 120;
              }}
              ref={messageScroll}
            >
              <Messages messages={messages} />
              {pending && (
                <div aria-live="polite" className={styles.thinking} role="status">
                  <span aria-hidden="true" />
                  Thinking
                </div>
              )}
              {error && (
                <div className={styles.chatError} role="alert">
                  <p>{error}</p>
                  <button aria-label="Retry question" onClick={onRetry} type="button">
                    Retry
                  </button>
                </div>
              )}
            </div>
            <div className={styles.stickyComposer}>
              <Composer
                input={input}
                onInputChange={onInputChange}
                onSubmit={onSubmit}
                pending={pending}
              />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
