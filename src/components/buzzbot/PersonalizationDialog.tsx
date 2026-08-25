"use client";

import { X } from "lucide-react";
import styles from "./buzzbot.module.css";

export function PersonalizationDialog({
  accountEmail,
  eligible,
  onClose,
  open,
}: {
  accountEmail: string | null;
  eligible: boolean;
  onClose(): void;
  open: boolean;
}) {
  if (!open) return null;
  return (
    <div className={styles.dialogBackdrop} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby="personalization-title" aria-modal="true" className={styles.dialog} role="dialog">
        <button aria-label="Close personalization" className={styles.dialogClose} onClick={onClose} type="button">
          <X aria-hidden="true" size={19} />
        </button>
        <p className={styles.dialogEyebrow}>Personalization</p>
        <h2 id="personalization-title">Your courses, your context.</h2>
        {eligible ? (
          <p>Add your current courses to receive personalized answers. This feature is coming soon.</p>
        ) : accountEmail ? (
          <p>A verified @gatech.edu email is required for course personalization.</p>
        ) : (
          <p>Sign in with a verified Georgia Tech email to use course personalization when it launches.</p>
        )}
      </section>
    </div>
  );
}
