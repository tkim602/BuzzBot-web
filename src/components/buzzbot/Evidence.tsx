import type { MockAnswer, SourceCitation } from "./mock-data";
import styles from "./buzzbot.module.css";

export function SourceList({
  sources,
  freshAsOf,
}: {
  sources: readonly SourceCitation[];
  freshAsOf: string;
}) {
  return (
    <section className={styles.sources} aria-labelledby="source-heading">
      <h3 id="source-heading">Official sources</h3>
      <ol>
        {sources.map((source) => (
          <li key={source.id}>
            <a href={source.url} rel="noreferrer" target="_blank">
              {source.title}
            </a>
            <span>{source.authority}</span>
          </li>
        ))}
      </ol>
      <p>Data as of {freshAsOf}</p>
    </section>
  );
}

export function ScheduleResult({ answer }: { answer: MockAnswer }) {
  return (
    <section className={styles.schedule} aria-labelledby="course-heading">
      <header>
        <p>{answer.course.term}</p>
        <h2 id="course-heading">
          {answer.course.code} · {answer.course.title}
        </h2>
      </header>
      <div className={styles.tableFrame}>
        <table>
          <thead>
            <tr>
              <th scope="col">CRN</th>
              <th scope="col">Section</th>
              <th scope="col">Days</th>
              <th scope="col">Time</th>
              <th scope="col">Instructor</th>
            </tr>
          </thead>
          <tbody>
            {answer.sections.map((section) => (
              <tr key={section.crn}>
                <td data-label="CRN">{section.crn}</td>
                <td data-label="Section">{section.section}</td>
                <td data-label="Days">{section.days}</td>
                <td data-label="Time">{section.time}</td>
                <td data-label="Instructor">{section.instructor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
