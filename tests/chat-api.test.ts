import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatApiError, sendChat } from "@/components/buzzbot/chat-api";

const validResponse = {
  thread_id: "thread-1",
  answer: "CS 6601 is offered in Fall 2026.",
  citations: [
    {
      url: "https://oscar.gatech.edu/",
      title: "Georgia Tech OSCAR",
      fetched_at: "2026-08-24T00:00:00+00:00",
      quote: "CS 6601 A",
      page: null,
    },
  ],
  confidence: 0.9,
  freshness: { strategy: "langgraph_controlled", as_of: "2026-08-25T00:00:00Z" },
  notes: [],
};

describe("sendChat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_BUZZBOT_API_URL;
  });

  it("posts the exact v2 chat contract and returns a validated response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(validResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendChat({
        query: "Is it offered in Fall 2026?",
        thread_id: "thread-1",
        history: [{ role: "user", content: "Tell me about CS 6601" }],
      }),
    ).resolves.toEqual(validResponse);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/v2/chat");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(String(init.body))).toEqual({
      query: "Is it offered in Fall 2026?",
      thread_id: "thread-1",
      history: [{ role: "user", content: "Tell me about CS 6601" }],
    });
  });

  it("normalizes a configured API origin", async () => {
    process.env.NEXT_PUBLIC_BUZZBOT_API_URL = "https://api.example.edu/";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(validResponse), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sendChat({ query: "Hello", thread_id: "thread-1", history: [] });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.edu/v2/chat",
      expect.any(Object),
    );
  });

  it("fails closed on an invalid success response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ answer: "Missing contract fields" }), {
          status: 200,
        }),
      ),
    );

    await expect(
      sendChat({ query: "Hello", thread_id: "thread-1", history: [] }),
    ).rejects.toThrow("BuzzBot returned an invalid response.");
  });

  it("uses the safe backend message for a rate-limit response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: {
              error: "guardrail_violation",
              message: "Please wait before sending another question.",
              retry_after_seconds: 3,
            },
          }),
          { status: 429 },
        ),
      ),
    );

    const promise = sendChat({ query: "Hello", thread_id: "thread-1", history: [] });
    await expect(promise).rejects.toBeInstanceOf(ChatApiError);
    await expect(promise).rejects.toThrow("Please wait before sending another question. Retry in 3s.");
  });
});
