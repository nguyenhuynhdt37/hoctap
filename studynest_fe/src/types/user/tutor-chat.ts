// ========== Tutor Chat Types ==========

// Phạm vi trả lời
export type TutorScope = "lesson" | "section" | "course";

export interface TutorScopeOption {
  value: TutorScope;
  label: string;
  description: string;
}

// Nguồn trích dẫn trong câu trả lời
export interface ChatSource {
  type: "video" | "slide" | "document" | "quiz";
  label: string;
  // Cho video: timestamp bắt đầu và kết thúc (giây)
  startTime?: number;
  endTime?: number;
  // Cho slide/document: trang hoặc mục
  page?: number;
  section?: string;
  // ID để navigate
  resourceId?: string;
}

// Tin nhắn trong chat
export interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: MessageSource[];
  images?: UploadedImage[];
  timestamp: Date;
  isStreaming?: boolean;
}

// Quick actions
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}

// Chat thread từ API
export interface ChatThread {
  id: string;
  title: string;
  scope: TutorScope;
  is_active: boolean;
  message_count: number;
  created_at: string;
  updated_at: string;
}

// Response từ API list threads
export interface ThreadsResponse {
  threads: ChatThread[];
  cursor_next: string | null;
  has_more: boolean;
  lesson: {
    id: string;
    title: string;
  };
  course: {
    id: string;
    title: string;
  };
}

// Response từ API get active thread
export interface ActiveThreadResponse {
  thread: {
    id: string;
    title: string;
    scope: TutorScope;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    course_id: string;
    lesson_id: string;
  } | null;
}

// Chat session trong sidebar history (mapped từ ChatThread)
export interface ChatSession {
  id: string;
  title: string;
  scope: TutorScope;
  isActive: boolean;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Session memory - lưu trong cuộc chat của bài học
export interface TutorSession {
  lessonId: string;
  messages: TutorMessage[];
  scope: TutorScope;
  createdAt: Date;
  updatedAt: Date;
}

// Student memory - lưu điểm yếu của học viên (optional)
export interface StudentMemory {
  userId: string;
  courseId: string;
  weakTopics: string[];
  frequentMistakes: string[];
  learningStyle?: string;
  updatedAt: Date;
}

// ========== Upload Image API ==========
export interface UploadedImage {
  id: string;
  url: string;
  file_size: number;
  mime_type: string;
  ocr_text: string;
  created_at: string;
}

// Request để gửi tin nhắn với ảnh
export interface ImageInput {
  url: string;
  file_size: number;
  mime_type: string;
  ocr_text: string;
}

// ========== Message API ==========
export interface SendMessageRequest {
  lesson_id: string;
  message: string;
  images?: ImageInput[];
}

// Source từ API response - cấu trúc mới từ backend
export interface MessageSource {
  index: number;
  source_type: "video" | "resource" | "quiz" | "code";
  chunk_id?: string;
  similarity?: number;

  // Video source
  lesson_id?: string;
  lesson_title?: string;
  chunk_index?: number;
  timestamp_seconds?: number;

  // Resource source
  resource_id?: string;
  resource_title?: string;
  resource_url?: string;

  // Code source
  code_id?: string;
  code_content?: string;

  // Quiz source
  quiz_id?: string;
  quizz_option_id?: string;
  quizz_option_title?: string;
  quizz_option_content?: string;

  // Common
  summary?: string;
}

export interface MessageResponse {
  id: string;
  thread_id: string;
  user_id: string;
  role: "assistant" | "user"; // Thêm role user để dùng chung cho history
  content: string;
  sources: MessageSource[];
  created_at: string;
  images: UploadedImage[];
}

export interface GetMessagesResponse {
  messages: MessageResponse[];
  cursor_next: string | null;
  has_more: boolean;
}

// API Request/Response types (legacy - có thể xóa sau)
export interface TutorChatRequest {
  lessonId: string;
  courseId: string;
  sectionId?: string;
  scope: TutorScope;
  message: string;
  sessionId?: string;
}

export interface TutorChatResponse {
  id: string;
  content: string;
  sources: ChatSource[];
  sessionId: string;
}
