export type SourceCitation = {
  id: number;
  title: string;
  url: string;
  authority: "Official source" | "Structured schedule data";
};

export type ScheduleSection = {
  crn: string;
  section: string;
  days: string;
  time: string;
  instructor: string;
};

export type MockAnswer = {
  question: string;
  answer: string;
  course: { code: string; title: string; term: string };
  sections: readonly ScheduleSection[];
  sources: readonly SourceCitation[];
  freshAsOf: string;
};

export const SUGGESTIONS = [
  "Which CS courses are offered in Fall 2026?",
  "When is the withdrawal deadline?",
  "What does OMSCS require for graduation?",
] as const;

export const MOCK_ANSWER: MockAnswer = {
  question: SUGGESTIONS[0],
  answer:
    "Yes. CS 6601 has published sections for Fall 2026. Review the section details below and verify the current listing before registering.",
  course: { code: "CS 6601", title: "Artificial Intelligence", term: "Fall 2026" },
  sections: [
    {
      crn: "12345",
      section: "A",
      days: "M W",
      time: "3:30–4:45 PM",
      instructor: "Staff",
    },
    {
      crn: "12346",
      section: "O01",
      days: "Online",
      time: "Asynchronous",
      instructor: "Staff",
    },
  ],
  sources: [
    {
      id: 1,
      title: "Georgia Tech OSCAR",
      url: "https://oscar.gatech.edu/",
      authority: "Structured schedule data",
    },
    {
      id: 2,
      title: "Georgia Tech Catalog",
      url: "https://catalog.gatech.edu/coursesaz/cs/",
      authority: "Official source",
    },
  ],
  freshAsOf: "August 24, 2026",
};
