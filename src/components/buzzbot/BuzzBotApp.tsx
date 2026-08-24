"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (phase !== "thinking") return;
    const timeout = window.setTimeout(() => setPhase("answer"), 650);
    return () => window.clearTimeout(timeout);
  }, [phase]);

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
        <button
          aria-label="Open sidebar"
          className={styles.mobileMenu}
          onClick={() => setMobileOpen(true)}
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
