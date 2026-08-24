import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "@/components/buzzbot/Sidebar";
import type { ChatHistoryGroup } from "@/components/buzzbot/chat-types";

const historyGroups: ChatHistoryGroup[] = [
  {
    label: "Today",
    conversations: [
      {
        id: "thread-cs",
        title: "CS 6601 Fall schedule",
        searchableText: "CS 6601 Fall schedule artificial intelligence",
      },
      {
        id: "thread-registration",
        title: "Registration dates",
        searchableText: "Registration dates withdrawal deadline",
      },
    ],
  },
  {
    label: "Previous 7 days",
    conversations: [
      {
        id: "thread-omscs",
        title: "OMSCS graduation requirements",
        searchableText: "OMSCS graduation requirements 10 courses",
      },
    ],
  },
];

function SidebarHarness() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <Sidebar
      activeConversationId="thread-cs"
      collapsed={collapsed}
      historyGroups={historyGroups}
      mobileOpen={false}
      onClose={() => undefined}
      onNewChat={() => undefined}
      onSelectConversation={() => undefined}
      onToggle={() => setCollapsed((value) => !value)}
    />
  );
}

describe("Sidebar", () => {
  it("collapses history while preserving named primary actions", () => {
    render(<SidebarHarness />);
    expect(screen.getByText("CS 6601 Fall schedule")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(screen.queryByText("CS 6601 Fall schedule")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: "New chat" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Search chats" })).toBeVisible();
  });

  it("selects a real conversation and exposes the active item", () => {
    const onSelectConversation = vi.fn();
    render(
      <Sidebar
        activeConversationId="thread-cs"
        collapsed={false}
        historyGroups={historyGroups}
        mobileOpen={false}
        onClose={() => undefined}
        onNewChat={() => undefined}
        onSelectConversation={onSelectConversation}
        onToggle={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "CS 6601 Fall schedule" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    fireEvent.click(screen.getByRole("button", { name: "Registration dates" }));
    expect(onSelectConversation).toHaveBeenCalledWith("thread-registration");
  });

  it("filters stored history by title or message content", () => {
    render(<SidebarHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Search chats" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search conversations" }), {
      target: { value: "10 courses" },
    });

    expect(screen.getByText("OMSCS graduation requirements")).toBeVisible();
    expect(screen.queryByText("CS 6601 Fall schedule")).not.toBeInTheDocument();
  });

  it("shows an honest empty state and disabled future settings", () => {
    render(
      <Sidebar
        activeConversationId={null}
        collapsed={false}
        historyGroups={[]}
        mobileOpen={false}
        onClose={() => undefined}
        onNewChat={() => undefined}
        onSelectConversation={() => undefined}
        onToggle={() => undefined}
      />,
    );

    expect(screen.getByText("Your conversations will appear here.")).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Settings, available after account integration",
      }),
    ).toBeDisabled();
  });
});
