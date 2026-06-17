export interface LessonResource {
  id: string;
  lesson_id: string;
  title: string;
  url: string;
  resource_type: "file" | "link" | "archive";
  mime_type: string | null;
  file_size: number;
  embed_status: "processing" | "empty" | "skipped" | string;
  created_at: string;
  updated_at: string;
}

export interface CreateResourceLinkData {
  title: string;
  url: string;
}

export interface CreateResourceResponse {
  message: string;
  resources: LessonResource[];
}

