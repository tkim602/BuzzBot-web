import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  SquarePen,
  X,
} from "lucide-react";
import { HISTORY_GROUPS } from "./mock-data";
import styles from "./buzzbot.module.css";

export type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle(): void;
  onClose(): void;
  onNewChat(): void;
};

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggle,
  onClose,
  onNewChat,
}: SidebarProps) {
  const toggleLabel = collapsed ? "Expand sidebar" : "Collapse sidebar";
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      id="buzzbot-sidebar"
      aria-label="Chat sidebar"
      className={styles.sidebar}
      data-collapsed={collapsed}
      data-mobile-open={mobileOpen}
    >
      <div className={styles.sidebarHeader}>
        <div className={styles.wordmark} aria-label="BuzzBot">
          <span className={styles.wordmarkGlyph} aria-hidden="true">
            B
          </span>
          {!collapsed && <span>BuzzBot</span>}
        </div>
        <button
          type="button"
          className={styles.iconButton}
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
          aria-controls="buzzbot-sidebar"
          title={toggleLabel}
          onClick={onToggle}
        >
          <ToggleIcon aria-hidden="true" size={19} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.mobileClose}`}
          aria-label="Close sidebar"
          onClick={onClose}
        >
          <X aria-hidden="true" size={19} strokeWidth={1.8} />
        </button>
      </div>

      <nav className={styles.primaryNav} aria-label="Chat actions">
        <button type="button" className={styles.navAction} aria-label="New chat" onClick={onNewChat}>
          <SquarePen aria-hidden="true" size={19} strokeWidth={1.8} />
          {!collapsed && <span>New chat</span>}
        </button>
        <button
          type="button"
          className={styles.navAction}
          aria-label="Search chats"
          title="Search chats, available after chat persistence"
          disabled
        >
          <Search aria-hidden="true" size={19} strokeWidth={1.8} />
          {!collapsed && <span>Search chats</span>}
        </button>
      </nav>

      {!collapsed && (
        <nav className={styles.history} aria-label="Chat history">
          {HISTORY_GROUPS.map((group) => (
            <section key={group.label} className={styles.historyGroup}>
              <h2>{group.label}</h2>
              <ul>
                {group.conversations.map((conversation, index) => (
                  <li key={conversation} data-active={group.label === "Today" && index === 0}>
                    {conversation}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
      )}

      <div className={styles.sidebarFooter}>
        <button
          type="button"
          className={styles.navAction}
          aria-label="Settings, available after account integration"
          title="Settings, available after account integration"
          disabled
        >
          <Settings aria-hidden="true" size={19} strokeWidth={1.8} />
          {!collapsed && <span>Settings</span>}
        </button>
        <div className={styles.account}>
          <span className={styles.avatar} aria-hidden="true">
            TK
          </span>
          {!collapsed && (
            <span className={styles.accountCopy}>
              TaeHo Kim<small>Student</small>
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
