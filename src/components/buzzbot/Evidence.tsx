import type { StoredMessage } from "./chat-types";
import styles from "./buzzbot.module.css";

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function shortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function ResponseEvidence({ message }: { message: StoredMessage }) {
  const citations = message.citations ?? [];
  const notes = message.notes ?? [];

  return (
    <>
      {citations.length > 0 && (
        <section aria-label="Official sources" className={styles.sources}>
          <h3>Official sources</h3>
          <ol>
            {citations.map((citation, index) => {
              const href = safeHttpUrl(citation.url);
              const title = citation.title || `Official source ${index + 1}`;
              return (
                <li key={`${citation.url}-${index}`}>
                  {href ? (
                    <a href={href} rel="noreferrer" target="_blank">
                      {title}
                    </a>
                  ) : (
                    <strong>{title}</strong>
                  )}
                  <blockquote>{citation.quote}</blockquote>
                  {(citation.page || citation.fetched_at) && (
                    <small>
                      {citation.page ? `Page ${citation.page}` : ""}
                      {citation.page && citation.fetched_at ? " · " : ""}
                      {citation.fetched_at
                        ? `Source updated ${shortDate(citation.fetched_at)}`
                        : ""}
                    </small>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}
      <div className={styles.responseMeta}>
        {message.confidence !== undefined && (
          <span>Confidence {Math.round(message.confidence * 100)}%</span>
        )}
        {message.freshness?.as_of && (
          <span>Data as of {shortDate(message.freshness.as_of)}</span>
        )}
      </div>
      {notes.length > 0 && (
        <ul aria-label="Answer notes" className={styles.answerNotes}>
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </>
  );
}
