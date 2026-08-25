import type {
  ChatHistoryGroup,
  ChatTurn,
  StoredChatState,
  StoredConversation,
  StoredMessage,
} from "./chat-types";

export const CHAT_STORAGE_KEY = "buzzbot.chat.v1";
export const EMPTY_CHAT_STATE: StoredChatState = {
  version: 1,
  activeConversationId: null,
  conversations: [],
};

const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES = 100;
const MAX_API_HISTORY = 20;

export function chatStorageKey(userId?: string | null): string {
  return userId ? `${CHAT_STORAGE_KEY}.user.${userId}` : CHAT_STORAGE_KEY;
}

function migrationMarkerKey(userId: string): string {
  return `${CHAT_STORAGE_KEY}.migrated.${userId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMessage(value: unknown): value is StoredMessage {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string" &&
    typeof value.createdAt === "string" &&
    (value.status === "complete" || value.status === "failed") &&
    (value.citations === undefined || Array.isArray(value.citations)) &&
    (value.confidence === undefined || typeof value.confidence === "number") &&
    (value.freshness === undefined || isRecord(value.freshness)) &&
    (value.notes === undefined || Array.isArray(value.notes))
  );
}

function isConversation(value: unknown): value is StoredConversation {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    (value.pinnedAt === undefined || typeof value.pinnedAt === "string") &&
    Array.isArray(value.messages) &&
    value.messages.every(isMessage)
  );
}

function isChatState(value: unknown): value is StoredChatState {
  if (!isRecord(value)) return false;
  return (
    value.version === 1 &&
    (value.activeConversationId === null || typeof value.activeConversationId === "string") &&
    Array.isArray(value.conversations) &&
    value.conversations.every(isConversation)
  );
}

export function normalizeChatState(state: StoredChatState): StoredChatState {
  const conversations = [...state.conversations]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, MAX_CONVERSATIONS)
    .map((conversation) => ({
      ...conversation,
      messages: conversation.messages.slice(-MAX_MESSAGES),
    }));
  const activeConversationId = conversations.some(
    (conversation) => conversation.id === state.activeConversationId,
  )
    ? state.activeConversationId
    : null;
  return { version: 1, activeConversationId, conversations };
}

export function loadChatState(
  storage: Pick<Storage, "getItem">,
  userId?: string | null,
): StoredChatState {
  try {
    const raw = storage.getItem(chatStorageKey(userId));
    if (!raw) return EMPTY_CHAT_STATE;
    const parsed: unknown = JSON.parse(raw);
    return isChatState(parsed) ? normalizeChatState(parsed) : EMPTY_CHAT_STATE;
  } catch {
    return EMPTY_CHAT_STATE;
  }
}

export function saveChatState(
  storage: Pick<Storage, "setItem">,
  state: StoredChatState,
  userId?: string | null,
): void {
  storage.setItem(chatStorageKey(userId), JSON.stringify(normalizeChatState(state)));
}

export function migrateAnonymousChatState(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  userId: string,
): void {
  const marker = migrationMarkerKey(userId);
  if (storage.getItem(marker)) return;
  if (storage.getItem(chatStorageKey(userId))) {
    storage.setItem(marker, "1");
    return;
  }
  const anonymous = storage.getItem(CHAT_STORAGE_KEY);
  if (anonymous) {
    saveChatState(storage, loadChatState(storage), userId);
    storage.removeItem(CHAT_STORAGE_KEY);
  }
  storage.setItem(marker, "1");
}

export function toApiHistory(messages: readonly StoredMessage[]): ChatTurn[] {
  return messages
    .filter((message) => message.status === "complete")
    .slice(-MAX_API_HISTORY)
    .map(({ role, content }) => ({ role, content }));
}

function startOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

export function groupConversations(
  conversations: readonly StoredConversation[],
  now = new Date(),
): ChatHistoryGroup[] {
  const groups = new Map<ChatHistoryGroup["label"], ChatHistoryGroup["conversations"]>([
    ["Pinned", []],
    ["Today", []],
    ["Previous 7 days", []],
    ["Older", []],
  ]);
  const today = startOfDay(now);

  [...conversations]
    .sort((left, right) => {
      if (left.pinnedAt && right.pinnedAt) return right.pinnedAt.localeCompare(left.pinnedAt);
      if (left.pinnedAt) return -1;
      if (right.pinnedAt) return 1;
      return right.updatedAt.localeCompare(left.updatedAt);
    })
    .forEach((conversation) => {
      const ageInDays = Math.floor(
        (today - startOfDay(new Date(conversation.updatedAt))) / 86_400_000,
      );
      const label = conversation.pinnedAt
        ? "Pinned"
        : ageInDays <= 0
          ? "Today"
          : ageInDays <= 7
            ? "Previous 7 days"
            : "Older";
      groups.get(label)?.push({
        id: conversation.id,
        title: conversation.title,
        pinned: Boolean(conversation.pinnedAt),
        searchableText: `${conversation.title} ${conversation.messages
          .map((message) => message.content)
          .join(" ")}`,
      });
    });

  return (["Pinned", "Today", "Previous 7 days", "Older"] as const)
    .map((label) => ({ label, conversations: groups.get(label) ?? [] }))
    .filter((group) => group.conversations.length > 0);
}
