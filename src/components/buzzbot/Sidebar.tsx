import {
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PinOff,
  Search,
  Settings,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ChatHistoryGroup } from "./chat-types";
import styles from "./buzzbot.module.css";

export type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  historyGroups: readonly ChatHistoryGroup[];
  activeConversationId: string | null;
  onToggle(): void;
  onClose(): void;
  onDeleteConversation(id: string): void;
  onNewChat(): void;
  onSelectConversation(id: string): void;
  onTogglePin(id: string): void;
};

export function Sidebar({
  collapsed,
  mobileOpen,
  historyGroups,
  activeConversationId,
  onToggle,
  onClose,
  onDeleteConversation,
  onNewChat,
  onSelectConversation,
  onTogglePin,
}: SidebarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const toggleLabel = collapsed ? "Expand sidebar" : "Collapse sidebar";
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return historyGroups;
    return historyGroups
      .map((group) => ({
        ...group,
        conversations: group.conversations.filter((conversation) =>
          conversation.searchableText.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.conversations.length > 0);
  }, [historyGroups, searchQuery]);

  const toggleSearch = () => {
    if (collapsed) onToggle();
    setSearchOpen((value) => !value);
  };

  return (
    <aside
      id="buzzbot-sidebar"
      aria-label="Chat sidebar"
      className={styles.sidebar}
      data-collapsed={collapsed}
      data-mobile-open={mobileOpen}
    >
      <div className={styles.sidebarHeader}>
        <button
          aria-label="BuzzBot home"
          className={styles.wordmark}
          onClick={onNewChat}
          type="button"
        >
          <span className={styles.wordmarkGlyph} aria-hidden="true">
            B
          </span>
          {!collapsed && <span>BuzzBot</span>}
        </button>
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
          aria-expanded={searchOpen}
          onClick={toggleSearch}
        >
          <Search aria-hidden="true" size={19} strokeWidth={1.8} />
          {!collapsed && <span>Search chats</span>}
        </button>
      </nav>

      {!collapsed && (
        <nav className={styles.history} aria-label="Chat history">
          {searchOpen && (
            <input
              aria-label="Search conversations"
              className={styles.historySearch}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search conversations"
              type="search"
              value={searchQuery}
            />
          )}
          {historyGroups.length === 0 && (
            <p className={styles.historyEmpty}>Your conversations will appear here.</p>
          )}
          {historyGroups.length > 0 && filteredGroups.length === 0 && (
            <p className={styles.historyEmpty}>No matching conversations.</p>
          )}
          {filteredGroups.map((group) => (
            <section key={group.label} className={styles.historyGroup}>
              <h2>{group.label}</h2>
              <ul>
                {group.conversations.map((conversation) => (
                  <li className={styles.historyRow} key={conversation.id}>
                    <button
                      aria-current={
                        activeConversationId === conversation.id ? "page" : undefined
                      }
                      className={styles.historyItem}
                      onClick={() => {
                        onSelectConversation(conversation.id);
                        onClose();
                      }}
                      type="button"
                    >
                      {conversation.title}
                    </button>
                    <button
                      aria-label={`${conversation.pinned ? "Unpin" : "Pin"} ${conversation.title}`}
                      className={styles.historyRowAction}
                      onClick={() => onTogglePin(conversation.id)}
                      type="button"
                    >
                      {conversation.pinned ? (
                        <PinOff aria-hidden="true" size={15} />
                      ) : (
                        <Pin aria-hidden="true" size={15} />
                      )}
                    </button>
                    <button
                      aria-label={`Delete ${conversation.title}`}
                      className={styles.historyRowAction}
                      onClick={() => onDeleteConversation(conversation.id)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={15} />
                    </button>
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
