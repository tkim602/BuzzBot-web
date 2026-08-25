import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BuzzBotApp } from "@/components/buzzbot/BuzzBotApp";
import { CHAT_STORAGE_KEY, chatStorageKey } from "@/components/buzzbot/chat-storage";
import type { StoredChatState } from "@/components/buzzbot/chat-types";
import { SUGGESTIONS } from "@/components/buzzbot/mock-data";

const mockedAuth = vi.hoisted(() => ({
  current: {
    configured: false,
    loading: false,
    user: null as null | { uid: string; email: string; emailVerified: boolean },
    personalizationEligible: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    sendReset: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock("@/components/buzzbot/auth", () => ({
  useAuth: () => mockedAuth.current,
}));

function apiResponse(threadId: string, answer: string) {
  return {
    thread_id: threadId,
    answer,
    citations: [],
    confidence: 0.85,
    freshness: { strategy: "langgraph_controlled", as_of: "2026-08-25T00:00:00Z" },
    notes: [],
  };
}

function jsonResponse(body: object) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function storedState(): StoredChatState {
  return {
    version: 1,
    activeConversationId: "thread-cs",
    conversations: [
      {
        id: "thread-cs",
        title: "CS 6601 schedule",
        createdAt: "2026-08-25T00:00:00Z",
        updatedAt: "2026-08-25T00:00:01Z",
        messages: [
          {
            id: "message-1",
            role: "user",
            content: "Is CS 6601 offered?",
            createdAt: "2026-08-25T00:00:00Z",
            status: "complete",
          },
          {
            id: "message-2",
            role: "assistant",
            content: "Yes, it has published sections.",
            createdAt: "2026-08-25T00:00:01Z",
            status: "complete",
          },
        ],
      },
      {
        id: "thread-omscs",
        title: "OMSCS requirements",
        createdAt: "2026-08-24T00:00:00Z",
        updatedAt: "2026-08-24T00:00:00Z",
        messages: [
          {
            id: "message-3",
            role: "user",
            content: "How many OMSCS courses?",
            createdAt: "2026-08-24T00:00:00Z",
            status: "complete",
          },
        ],
      },
    ],
  };
}

describe("BuzzBotApp", () => {
  beforeEach(() => {
    localStorage.clear();
    mockedAuth.current.configured = false;
    mockedAuth.current.loading = false;
    mockedAuth.current.user = null;
    mockedAuth.current.personalizationEligible = false;
    let nextId = 0;
    vi.spyOn(globalThis.crypto, "randomUUID").mockImplementation(
      () =>
        `00000000-0000-4000-8000-${String(++nextId).padStart(12, "0")}` as `${string}-${string}-${string}-${string}-${string}`,
    );
  });

  it("waits for auth and moves anonymous history into the verified account namespace", async () => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(storedState()));
    mockedAuth.current.configured = true;
    mockedAuth.current.loading = true;
    const view = render(<BuzzBotApp />);

    expect(screen.queryByText("Yes, it has published sections.")).not.toBeInTheDocument();
    expect(localStorage.getItem(chatStorageKey("uid-1"))).toBeNull();

    mockedAuth.current.loading = false;
    mockedAuth.current.user = {
      uid: "uid-1",
      email: "student@gatech.edu",
      emailVerified: true,
    };
    mockedAuth.current.personalizationEligible = true;
    view.rerender(<BuzzBotApp />);

    expect(await screen.findByText("Yes, it has published sections.")).toBeVisible();
    expect(localStorage.getItem(CHAT_STORAGE_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(chatStorageKey("uid-1")) ?? "null")).toMatchObject({
      activeConversationId: "thread-cs",
    });
    expect(screen.getByText("student@gatech.edu")).toBeVisible();
  });

  it("switches account namespaces without exposing another user's history", async () => {
    localStorage.setItem(chatStorageKey("uid-1"), JSON.stringify(storedState()));
    mockedAuth.current.configured = true;
    mockedAuth.current.user = {
      uid: "uid-1",
      email: "one@example.com",
      emailVerified: true,
    };
    const view = render(<BuzzBotApp />);
    expect(await screen.findByText("Yes, it has published sections.")).toBeVisible();

    mockedAuth.current.user = {
      uid: "uid-2",
      email: "two@example.com",
      emailVerified: true,
    };
    view.rerender(<BuzzBotApp />);

    expect(
      await screen.findByRole("heading", { name: "What can I help you with at Tech?" }),
    ).toBeVisible();
    expect(screen.queryByText("Yes, it has published sections.")).not.toBeInTheDocument();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("stores a first answer and sends prior completed turns on continuation", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce((_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body));
        return Promise.resolve(jsonResponse(apiResponse(body.thread_id, "First answer")));
      })
      .mockImplementationOnce((_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body));
        return Promise.resolve(jsonResponse(apiResponse(body.thread_id, "Second answer")));
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<BuzzBotApp />);

    fireEvent.click(screen.getByRole("button", { name: `Ask: ${SUGGESTIONS[0]}` }));
    expect(screen.getByRole("status")).toHaveTextContent("Thinking");
    await screen.findByText("First answer");

    const firstBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(firstBody.history).toEqual([]);
    expect(firstBody.query).toBe(SUGGESTIONS[0]);

    fireEvent.change(screen.getByRole("textbox", { name: "Message BuzzBot" }), {
      target: { value: "Which section is online?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByText("Second answer");

    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(secondBody.thread_id).toBe(firstBody.thread_id);
    expect(secondBody.history).toEqual([
      { role: "user", content: SUGGESTIONS[0] },
      { role: "assistant", content: "First answer" },
    ]);
    expect(JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) ?? "null")).toMatchObject({
      version: 1,
      activeConversationId: firstBody.thread_id,
    });
  });

  it("restores saved conversations, selects history, and starts a new draft", () => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(storedState()));
    render(<BuzzBotApp />);

    expect(screen.getByText("Yes, it has published sections.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "OMSCS requirements" }));
    expect(screen.getByText("How many OMSCS courses?")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(
      screen.getByRole("heading", { name: "What can I help you with at Tech?" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "CS 6601 schedule" })).toBeVisible();
  });

  it("returns home from the wordmark and persists pin and confirmed deletion", async () => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(storedState()));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<BuzzBotApp />);

    fireEvent.click(screen.getByRole("button", { name: "BuzzBot home" }));
    expect(
      screen.getByRole("heading", { name: "What can I help you with at Tech?" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "CS 6601 schedule" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Pin CS 6601 schedule" }));
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) ?? "null");
      expect(saved.conversations.find((item: { id: string }) => item.id === "thread-cs").pinnedAt)
        .toEqual(expect.any(String));
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete CS 6601 schedule" }));
    expect(window.confirm).toHaveBeenCalledOnce();
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) ?? "null");
      expect(saved.conversations.map((item: { id: string }) => item.id)).toEqual([
        "thread-omscs",
      ]);
    });
  });

  it("retries a failed question without duplicating the user turn", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementationOnce((_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body));
        return Promise.resolve(jsonResponse(apiResponse(body.thread_id, "Recovered answer")));
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<BuzzBotApp />);

    fireEvent.click(screen.getByRole("button", { name: `Ask: ${SUGGESTIONS[1]}` }));
    await screen.findByText("Unable to reach BuzzBot. Check that the API is running.");
    fireEvent.click(screen.getByRole("button", { name: "Retry question" }));
    await screen.findByText("Recovered answer");

    expect(within(screen.getByRole("main")).getAllByText(SUGGESTIONS[1])).toHaveLength(1);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).history).toEqual([]);
  });

  it("aborts an in-flight request when another conversation is selected", async () => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(storedState()));
    let requestSignal: AbortSignal | null = null;
    let requestAborted = false;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        requestSignal = init.signal as AbortSignal;
        requestSignal.addEventListener("abort", () => {
          requestAborted = true;
        });
        return new Promise<Response>(() => undefined);
      }),
    );
    render(<BuzzBotApp />);

    fireEvent.change(screen.getByRole("textbox", { name: "Message BuzzBot" }), {
      target: { value: "Tell me more" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(requestSignal).not.toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "OMSCS requirements" }));

    expect(requestAborted).toBe(true);
  });
});
