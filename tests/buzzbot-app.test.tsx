import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BuzzBotApp } from "@/components/buzzbot/BuzzBotApp";
import { MOCK_ANSWER, SUGGESTIONS } from "@/components/buzzbot/mock-data";

describe("BuzzBotApp", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("moves from question to thinking to an evidence-rich mock answer", async () => {
    render(<BuzzBotApp />);
    fireEvent.click(
      screen.getByRole("button", { name: `Ask: ${SUGGESTIONS[0]}` }),
    );

    expect(screen.getByText(SUGGESTIONS[0])).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Thinking");

    await act(async () => vi.advanceTimersByTimeAsync(650));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText(MOCK_ANSWER.answer)).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: /CS 6601.*Artificial Intelligence/,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Georgia Tech OSCAR" }),
    ).toHaveAttribute("href", "https://oscar.gatech.edu/");
  });
});
