import { describe, expect, it } from "vitest";
import {
  EMPTY_CHAT_STATE,
  chatStorageKey,
  groupConversations,
  loadChatState,
  migrateAnonymousChatState,
  normalizeChatState,
  saveChatState,
  toApiHistory,
} from "@/components/buzzbot/chat-storage";
import type {
  StoredChatState,
  StoredConversation,
  StoredMessage,
} from "@/components/buzzbot/chat-types";

function memoryStorage(initial: string | null = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
  };
}

function keyedMemoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values,
  };
}

function message(index: number, status: "complete" | "failed" = "complete"): StoredMessage {
  return {
    id: `message-${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    content: `Message ${index}`,
    createdAt: `2026-08-25T00:${String(index).padStart(2, "0")}:00.000Z`,
    status,
  };
}

function conversation(id: string, updatedAt: string, messages = [message(0)]): StoredConversation {
  return {
    id,
    title: `Conversation ${id}`,
    createdAt: updatedAt,
    updatedAt,
    messages,
  };
}

describe("chat storage", () => {
  it("uses separate anonymous and account storage keys", () => {
    expect(chatStorageKey()).toBe("buzzbot.chat.v1");
    expect(chatStorageKey("uid-1")).toBe("buzzbot.chat.v1.user.uid-1");
  });

  it("moves anonymous history into an empty account exactly once", () => {
    const state = storedMigrationState();
    const storage = keyedMemoryStorage({
      [chatStorageKey()]: JSON.stringify(state),
    });

    migrateAnonymousChatState(storage, "uid-1");

    expect(loadChatState(storage, "uid-1")).toEqual(state);
    expect(storage.getItem(chatStorageKey())).toBeNull();
    expect(storage.getItem("buzzbot.chat.v1.migrated.uid-1")).toBe("1");

    storage.setItem(chatStorageKey(), JSON.stringify(EMPTY_CHAT_STATE));
    migrateAnonymousChatState(storage, "uid-1");
    expect(loadChatState(storage, "uid-1")).toEqual(state);
  });

  it("never overwrites account history or removes anonymous history after a failed copy", () => {
    const anonymous = storedMigrationState();
    const account = { ...storedMigrationState(), activeConversationId: null };
    const existing = keyedMemoryStorage({
      [chatStorageKey()]: JSON.stringify(anonymous),
      [chatStorageKey("uid-1")]: JSON.stringify(account),
    });

    migrateAnonymousChatState(existing, "uid-1");
    expect(loadChatState(existing, "uid-1")).toEqual(account);
    expect(loadChatState(existing)).toEqual(anonymous);

    const failing = keyedMemoryStorage({
      [chatStorageKey()]: JSON.stringify(anonymous),
    });
    const originalSet = failing.setItem;
    failing.setItem = (key, value) => {
      if (key === chatStorageKey("uid-2")) throw new Error("full");
      return originalSet(key, value);
    };
    expect(() => migrateAnonymousChatState(failing, "uid-2")).toThrow("full");
    expect(loadChatState(failing)).toEqual(anonymous);
  });

  it("starts empty and round-trips valid versioned state", () => {
    const storage = memoryStorage();
    expect(loadChatState(storage)).toEqual(EMPTY_CHAT_STATE);

    const state: StoredChatState = {
      version: 1,
      activeConversationId: "thread-1",
      conversations: [conversation("thread-1", "2026-08-25T00:00:00.000Z")],
    };
    saveChatState(storage, state);
    expect(loadChatState(storage)).toEqual(state);
  });

  it("fails closed for malformed or unknown storage", () => {
    expect(loadChatState(memoryStorage("not json"))).toEqual(EMPTY_CHAT_STATE);
    expect(loadChatState(memoryStorage(JSON.stringify({ version: 2 })))).toEqual(
      EMPTY_CHAT_STATE,
    );
    expect(
      loadChatState(memoryStorage(JSON.stringify({ version: 1, conversations: "bad" }))),
    ).toEqual(EMPTY_CHAT_STATE);
  });

  it("projects only the latest 20 completed turns into API history", () => {
    const messages = Array.from({ length: 23 }, (_, index) => message(index));
    messages[21] = message(21, "failed");

    const history = toApiHistory(messages);

    expect(history).toHaveLength(20);
    expect(history[0]).toEqual({ role: "user", content: "Message 2" });
    expect(history.at(-1)).toEqual({ role: "user", content: "Message 22" });
    expect(history.some((turn) => turn.content === "Message 21")).toBe(false);
  });

  it("bounds local state to 50 conversations and 100 messages each", () => {
    const state: StoredChatState = {
      version: 1,
      activeConversationId: "thread-54",
      conversations: Array.from({ length: 55 }, (_, index) =>
        conversation(
          `thread-${index}`,
          `2026-08-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
          Array.from({ length: 105 }, (_value, messageIndex) => message(messageIndex)),
        ),
      ),
    };

    const normalized = normalizeChatState(state);

    expect(normalized.conversations).toHaveLength(50);
    expect(normalized.conversations[0].id).toBe("thread-54");
    expect(normalized.conversations[0].messages).toHaveLength(100);
    expect(normalized.conversations[0].messages[0].id).toBe("message-5");
  });

  it("loads legacy conversations and groups pinned chats first by pin time", () => {
    const legacy = conversation("legacy", "2026-08-25T01:00:00.000Z");
    const storage = memoryStorage(
      JSON.stringify({ version: 1, activeConversationId: "legacy", conversations: [legacy] }),
    );

    expect(loadChatState(storage).conversations[0].pinnedAt).toBeUndefined();

    const olderPin = {
      ...conversation("older-pin", "2026-08-21T12:00:00.000Z"),
      pinnedAt: "2026-08-24T12:00:00.000Z",
    };
    const newerPin = {
      ...conversation("newer-pin", "2026-08-20T12:00:00.000Z"),
      pinnedAt: "2026-08-25T12:00:00.000Z",
    };
    const groups = groupConversations(
      [legacy, olderPin, newerPin],
      new Date("2026-08-25T12:00:00.000Z"),
    );

    expect(groups[0].label).toBe("Pinned");
    expect(groups[0].conversations.map((item) => item.id)).toEqual([
      "newer-pin",
      "older-pin",
    ]);
    expect(groups[0].conversations.every((item) => item.pinned)).toBe(true);
  });

  it("sorts and groups conversations by recency", () => {
    const groups = groupConversations(
      [
        conversation("older", "2026-08-01T12:00:00.000Z"),
        conversation("week", "2026-08-21T12:00:00.000Z"),
        conversation("today", "2026-08-25T02:00:00.000Z"),
      ],
      new Date("2026-08-25T12:00:00.000Z"),
    );

    expect(groups.map((group) => group.label)).toEqual([
      "Today",
      "Previous 7 days",
      "Older",
    ]);
    expect(groups[0].conversations[0]).toMatchObject({ id: "today" });
    expect(groups[1].conversations[0]).toMatchObject({ id: "week" });
    expect(groups[2].conversations[0]).toMatchObject({ id: "older" });
  });
});

function storedMigrationState(): StoredChatState {
  return {
    version: 1,
    activeConversationId: "thread-1",
    conversations: [conversation("thread-1", "2026-08-25T00:00:00.000Z")],
  };
}
