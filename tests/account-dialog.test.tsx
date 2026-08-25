import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountDialog } from "@/components/buzzbot/AccountDialog";
import { PersonalizationDialog } from "@/components/buzzbot/PersonalizationDialog";
import type { AuthState } from "@/components/buzzbot/auth";

function authState(overrides: Partial<AuthState> = {}): AuthState {
  return {
    configured: true,
    loading: false,
    user: null,
    personalizationEligible: false,
    signUp: vi.fn().mockResolvedValue(undefined),
    signIn: vi.fn().mockResolvedValue(undefined),
    sendReset: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("AccountDialog", () => {
  it("validates matching passwords before creating an account", async () => {
    const auth = authState();
    render(<AccountDialog auth={auth} onClose={() => undefined} open />);

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "student@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "secret2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Passwords do not match");
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("creates an account and shows the verification confirmation", async () => {
    const auth = authState();
    render(<AccountDialog auth={auth} onClose={() => undefined} open />);

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "student@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "secret1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() =>
      expect(auth.signUp).toHaveBeenCalledWith("student@example.com", "secret1"),
    );
    expect(await screen.findByText(/verification link/i)).toBeVisible();
  });

  it("keeps anonymous chat available when Firebase is not configured", () => {
    render(
      <AccountDialog
        auth={authState({ configured: false })}
        onClose={() => undefined}
        open
      />,
    );

    expect(screen.getByText(/has not been configured/i)).toBeVisible();
  });
});

describe("PersonalizationDialog", () => {
  it.each([
    [null, false, "Sign in with a verified Georgia Tech email"],
    ["student@example.com", false, "verified @gatech.edu email is required"],
    ["student@gatech.edu", true, "Add your current courses"],
  ] as const)("renders the correct eligibility state", (email, eligible, copy) => {
    render(
      <PersonalizationDialog
        accountEmail={email}
        eligible={eligible}
        onClose={() => undefined}
        open
      />,
    );

    expect(screen.getByText(new RegExp(copy, "i"))).toBeVisible();
  });
});
