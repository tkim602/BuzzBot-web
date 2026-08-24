export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ChatCitation = {
  url: string;
  title: string | null;
  fetched_at: string | null;
  quote: string;
  page: number | null;
};

export type FreshnessInfo = {
  strategy: string;
  as_of: string | null;
};

export type ChatApiRequest = {
  query: string;
  thread_id: string;
  history: ChatTurn[];
};

export type ChatApiResponse = {
  thread_id: string;
  answer: string;
  citations: ChatCitation[];
  confidence: number;
  freshness: FreshnessInfo;
  notes: string[];
};

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  status: "complete" | "failed";
  citations?: ChatCitation[];
  confidence?: number;
  freshness?: FreshnessInfo;
  notes?: string[];
};

export type StoredConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: StoredMessage[];
};

export type StoredChatState = {
  version: 1;
  activeConversationId: string | null;
  conversations: StoredConversation[];
};

export type ChatHistoryItem = {
  id: string;
  title: string;
  searchableText: string;
};

export type ChatHistoryGroup = {
  label: "Today" | "Previous 7 days" | "Older";
  conversations: ChatHistoryItem[];
};
