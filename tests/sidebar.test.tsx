import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Sidebar } from "@/components/buzzbot/Sidebar";

function SidebarHarness() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Sidebar
      collapsed={collapsed}
      mobileOpen={false}
      onToggle={() => setCollapsed((value) => !value)}
      onClose={() => undefined}
      onNewChat={() => undefined}
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

  it("keeps settings honest while personalization is outside this milestone", () => {
    render(<SidebarHarness />);

    expect(
      screen.getByRole("button", { name: "Settings, available after account integration" }),
    ).toBeDisabled();
  });
});
