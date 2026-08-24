"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { ScheduleResult, SourceList } from "./Evidence";
import { MOCK_ANSWER } from "./mock-data";
import { SUGGESTIONS } from "./mock-data";
import styles from "./buzzbot.module.css";

export type ChatPhase = "empty" | "thinking" | "answer";

export type ChatWorkspaceProps = {
  phase: ChatPhase;
  question: string;
  input: string;
  onInputChange(value: string): void;
  onSubmit(question: string): void;
};

type ComposerProps = Pick<
  ChatWorkspaceProps,
  "input" | "onInputChange" | "onSubmit"
>;

function Composer({ input, onInputChange, onSubmit }: ComposerProps) {
  const submit = () => {
    const question = input.trim();
    if (question) onSubmit(question);
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
    <form
      aria-label="Message BuzzBot"
      className={styles.composer}
      onSubmit={handleSubmit}
    >
      <textarea
        aria-label="Message BuzzBot"
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about Georgia Tech"
        rows={1}
        value={input}
      />
      <button aria-label="Send message" disabled={!input.trim()} type="submit">
        <ArrowUp aria-hidden="true" size={18} strokeWidth={2} />
      </button>
    </form>
  );
}

export function ChatWorkspace({
  phase,
  question,
  input,
  onInputChange,
  onSubmit,
}: ChatWorkspaceProps) {
  return (
    <main className={styles.workspace}>
      <section className={styles.chatCanvas}>
        {phase === "empty" ? (
          <div className={styles.emptyState}>
            <h1>What can I help you with at Tech?</h1>
            <Composer
              input={input}
              onInputChange={onInputChange}
              onSubmit={onSubmit}
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
            <div className={styles.messages}>
              <p className={styles.userMessage}>{question}</p>
              {phase === "thinking" ? (
                <div aria-live="polite" className={styles.thinking} role="status">
                  <span aria-hidden="true" />
                  Thinking
                </div>
              ) : (
                <article className={styles.answer}>
                  <p>{MOCK_ANSWER.answer}</p>
                  <ScheduleResult answer={MOCK_ANSWER} />
                  <SourceList
                    freshAsOf={MOCK_ANSWER.freshAsOf}
                    sources={MOCK_ANSWER.sources}
                  />
                </article>
              )}
            </div>
            <div className={styles.stickyComposer}>
              <Composer
                input={input}
                onInputChange={onInputChange}
                onSubmit={onSubmit}
              />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
