import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatWorkspace } from "@/components/buzzbot/ChatWorkspace";
import type { StoredMessage } from "@/components/buzzbot/chat-types";
import { SUGGESTIONS } from "@/components/buzzbot/mock-data";

const messages: StoredMessage[] = [
  {
    id: "user-1",
    role: "user",
    content: "Is CS 6601 offered?",
    createdAt: "2026-08-25T00:00:00Z",
    status: "complete",
  },
  {
    id: "assistant-1",
    role: "assistant",
    content: "CS 6601 has published sections for Fall 2026.",
    createdAt: "2026-08-25T00:00:01Z",
    status: "complete",
    citations: [
      {
        url: "https://oscar.gatech.edu/",
        title: "Georgia Tech OSCAR",
        fetched_at: "2026-08-24T00:00:00Z",
        quote: "CS 6601 A",
        page: null,
      },
      {
        url: "javascript:alert(1)",
        title: "Unsafe source",
        fetched_at: null,
        quote: "Do not link this",
        page: null,
      },
    ],
    confidence: 0.88,
    freshness: { strategy: "langgraph_controlled", as_of: "2026-08-25T00:00:00Z" },
    notes: ["Verify the latest listing before registration."],
  },
];

const baseProps = {
  input: "",
  pending: false,
  error: null,
  onInputChange: () => undefined,
  onSubmit: () => undefined,
  onRetry: () => undefined,
};

describe("ChatWorkspace", () => {
  it("shows the compact empty state and submits a likely question", () => {
    const onSubmit = vi.fn();
    render(<ChatWorkspace {...baseProps} messages={[]} onSubmit={onSubmit} />);

    expect(
      screen.getByRole("heading", { name: "What can I help you with at Tech?" }),
    ).toBeVisible();
    expect(screen.getAllByRole("button", { name: /Ask:/ })).toHaveLength(3);
    expect(screen.getByRole("textbox", { name: "Message BuzzBot" })).toHaveAttribute(
      "rows",
      "1",
    );
    fireEvent.click(screen.getByRole("button", { name: `Ask: ${SUGGESTIONS[0]}` }));
    expect(onSubmit).toHaveBeenCalledWith(SUGGESTIONS[0]);
  });

  it("renders real messages, grounded citations, and response metadata", () => {
    render(<ChatWorkspace {...baseProps} messages={messages} />);

    expect(screen.getByText("Is CS 6601 offered?")).toBeVisible();
    expect(screen.getByText("CS 6601 has published sections for Fall 2026.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Georgia Tech OSCAR" })).toHaveAttribute(
      "href",
      "https://oscar.gatech.edu/",
    );
    expect(screen.getByText("CS 6601 A")).toBeVisible();
    expect(screen.getByText("Unsafe source")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Unsafe source" })).not.toBeInTheDocument();
    expect(screen.getByText("Confidence 88%")).toBeVisible();
    expect(screen.getByText(/Data as of Aug 25, 2026/)).toBeVisible();
    expect(screen.getByText("Verify the latest listing before registration.")).toBeVisible();
  });

  it("disables composition while pending and exposes a retryable error", () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <ChatWorkspace {...baseProps} messages={messages} pending onRetry={onRetry} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Thinking");
    expect(screen.getByRole("textbox", { name: "Message BuzzBot" })).toBeDisabled();

    rerender(
      <ChatWorkspace
        {...baseProps}
        error="Unable to reach BuzzBot."
        messages={messages}
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry question" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("submits Enter but preserves Shift+Enter for a line break", () => {
    const onSubmit = vi.fn();
    render(
      <ChatWorkspace
        {...baseProps}
        input="When is registration?"
        messages={[]}
        onSubmit={onSubmit}
      />,
    );
    const textbox = screen.getByRole("textbox", { name: "Message BuzzBot" });
    fireEvent.keyDown(textbox, { key: "Enter", shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(textbox, { key: "Enter", shiftKey: false });
    expect(onSubmit).toHaveBeenCalledWith("When is registration?");
  });
});
