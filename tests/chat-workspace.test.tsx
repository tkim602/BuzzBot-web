import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatWorkspace } from "@/components/buzzbot/ChatWorkspace";
import { SUGGESTIONS } from "@/components/buzzbot/mock-data";

describe("ChatWorkspace", () => {
  it("shows one simple empty-state idea and submits a likely question", () => {
    const onSubmit = vi.fn();
    render(
      <ChatWorkspace
        phase="empty"
        question=""
        input=""
        onInputChange={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "What can I help you with at Tech?",
      }),
    ).toBeVisible();
    expect(screen.getAllByRole("button", { name: /Ask:/ })).toHaveLength(3);
    expect(
      screen.getByRole("textbox", { name: "Message BuzzBot" }),
    ).toHaveAttribute("rows", "1");
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: `Ask: ${SUGGESTIONS[0]}` }),
    );
    expect(onSubmit).toHaveBeenCalledWith(SUGGESTIONS[0]);
  });

  it("submits Enter but preserves Shift+Enter for a line break", () => {
    const onSubmit = vi.fn();
    render(
      <ChatWorkspace
        phase="empty"
        question=""
        input="When is registration?"
        onInputChange={() => undefined}
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
