"use client";

import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { ChatWorkspace, type ChatPhase } from "./ChatWorkspace";
import { Sidebar } from "./Sidebar";
import styles from "./buzzbot.module.css";

export function BuzzBotApp() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [phase, setPhase] = useState<ChatPhase>("empty");
  const [question, setQuestion] = useState("");
  const [input, setInput] = useState("");
  const openSidebarButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (phase !== "thinking") return;
    const timeout = window.setTimeout(() => setPhase("answer"), 650);
    return () => window.clearTimeout(timeout);
  }, [phase]);

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
    setQuestion(trimmed);
    setInput("");
    setPhase("thinking");
  };

  const resetChat = () => {
    setQuestion("");
    setInput("");
    setPhase("empty");
    setMobileOpen(false);
  };

  return (
    <>
      <a className={styles.skipLink} href="#chat-workspace">
        Skip to chat
      </a>
      <div className={styles.appShell}>
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          onNewChat={resetChat}
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
            input={input}
            onInputChange={setInput}
            onSubmit={submitQuestion}
            phase={phase}
            question={question}
          />
        </div>
      </div>
    </>
  );
}
