"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { AuthState } from "./auth";
import styles from "./buzzbot.module.css";

type Mode = "sign-in" | "sign-up" | "reset" | "sent";

export function AccountDialog({
  auth,
  onClose,
  open,
}: {
  auth: AuthState;
  onClose(): void;
  open: boolean;
}) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === "sign-up" && password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "sign-up") {
        await auth.signUp(email, password);
        setMode("sent");
      } else if (mode === "reset") {
        await auth.sendReset(email);
        setMode("sent");
      } else {
        await auth.signIn(email, password);
        onClose();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    setError(null);
    try {
      await auth.signOut();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign out failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={styles.dialogBackdrop}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section aria-labelledby="account-dialog-title" aria-modal="true" className={styles.dialog} role="dialog">
        <button aria-label="Close account dialog" className={styles.dialogClose} onClick={onClose} type="button">
          <X aria-hidden="true" size={19} />
        </button>

        {auth.user ? (
          <>
            <p className={styles.dialogEyebrow}>Account</p>
            <h2 id="account-dialog-title">{auth.user.email}</h2>
            <p>Your conversations are stored separately for this account on this browser.</p>
            {error && <p role="alert">{error}</p>}
            <button className={styles.primaryButton} disabled={busy} onClick={() => void signOut()} type="button">
              Sign out
            </button>
          </>
        ) : !auth.configured ? (
          <>
            <p className={styles.dialogEyebrow}>Account</p>
            <h2 id="account-dialog-title">Authentication unavailable</h2>
            <p>Firebase authentication has not been configured yet. Anonymous chat is still available.</p>
          </>
        ) : mode === "sent" ? (
          <>
            <p className={styles.dialogEyebrow}>Check your inbox</p>
            <h2 id="account-dialog-title">Email sent</h2>
            <p>Use the verification link or password-reset link in your email, then return to sign in.</p>
            <button className={styles.primaryButton} onClick={() => switchMode("sign-in")} type="button">
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <p className={styles.dialogEyebrow}>BuzzBot account</p>
            <h2 id="account-dialog-title">
              {mode === "sign-up" ? "Create your account" : mode === "reset" ? "Reset your password" : "Sign in"}
            </h2>
            <form className={styles.authForm} onSubmit={submit}>
              <label>
                Email
                <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
              </label>
              {mode !== "reset" && (
                <label>
                  Password
                  <input autoComplete={mode === "sign-up" ? "new-password" : "current-password"} minLength={6} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
                </label>
              )}
              {mode === "sign-up" && (
                <label>
                  Confirm password
                  <input autoComplete="new-password" minLength={6} onChange={(event) => setConfirmation(event.target.value)} required type="password" value={confirmation} />
                </label>
              )}
              {error && <p role="alert">{error}</p>}
              <button className={styles.primaryButton} disabled={busy} type="submit">
                {busy ? "Please wait…" : mode === "sign-up" ? "Sign up" : mode === "reset" ? "Send reset email" : "Sign in"}
              </button>
            </form>
            <div className={styles.dialogLinks}>
              {mode === "sign-in" ? (
                <>
                  <button onClick={() => switchMode("sign-up")} type="button">Create account</button>
                  <button onClick={() => switchMode("reset")} type="button">Forgot password?</button>
                </>
              ) : (
                <button onClick={() => switchMode("sign-in")} type="button">Back to sign in</button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
