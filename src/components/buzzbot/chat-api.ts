import type {
  ChatApiRequest,
  ChatApiResponse,
  ChatCitation,
  FreshnessInfo,
} from "./chat-types";

const DEFAULT_API_ORIGIN = "http://localhost:8000";

export class ChatApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isCitation(value: unknown): value is ChatCitation {
  if (!isRecord(value)) return false;
  return (
    typeof value.url === "string" &&
    isNullableString(value.title) &&
    isNullableString(value.fetched_at) &&
    typeof value.quote === "string" &&
    (value.page === null ||
      (typeof value.page === "number" && Number.isInteger(value.page) && value.page >= 1))
  );
}

function isFreshness(value: unknown): value is FreshnessInfo {
  return (
    isRecord(value) &&
    typeof value.strategy === "string" &&
    isNullableString(value.as_of)
  );
}

function isChatApiResponse(value: unknown): value is ChatApiResponse {
  if (!isRecord(value)) return false;
  return (
    typeof value.thread_id === "string" &&
    typeof value.answer === "string" &&
    Array.isArray(value.citations) &&
    value.citations.every(isCitation) &&
    typeof value.confidence === "number" &&
    Number.isFinite(value.confidence) &&
    value.confidence >= 0 &&
    value.confidence <= 1 &&
    isFreshness(value.freshness) &&
    Array.isArray(value.notes) &&
    value.notes.every((note) => typeof note === "string")
  );
}

function apiOrigin(): string {
  return (process.env.NEXT_PUBLIC_BUZZBOT_API_URL?.trim() || DEFAULT_API_ORIGIN).replace(
    /\/+$/,
    "",
  );
}

function errorMessage(status: number, body: unknown): string {
  if (isRecord(body) && isRecord(body.detail) && typeof body.detail.message === "string") {
    const retry = body.detail.retry_after_seconds;
    return `${body.detail.message}${typeof retry === "number" ? ` Retry in ${retry}s.` : ""}`;
  }
  if (status === 429) return "BuzzBot is busy. Please wait and try again.";
  return "BuzzBot could not answer that request. Please try again.";
}

export async function sendChat(
  request: ChatApiRequest,
  signal?: AbortSignal,
): Promise<ChatApiResponse> {
  let response: Response;
  try {
    response = await fetch(`${apiOrigin()}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ChatApiError("Unable to reach BuzzBot. Check that the API is running.");
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ChatApiError(errorMessage(response.status, body));
  if (!isChatApiResponse(body)) {
    throw new ChatApiError("BuzzBot returned an invalid response.");
  }
  return body;
}
