// Types cho Chat SQL API

export interface ChatSqlRequest {
  question: string; // 1-500 ký tự
  history?: string[]; // Tối đa 10 tin
}

export interface ChatSqlResponse {
  response: string;
}

export interface ChatSqlMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
