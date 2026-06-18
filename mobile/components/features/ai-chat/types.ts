export interface ChatSqlMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}
