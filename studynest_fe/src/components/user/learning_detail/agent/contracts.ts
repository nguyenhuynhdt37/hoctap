export interface ScreenContextSnapshot {
  schema_version: 1;
  page_instance_id: string;
  revision: number;
  captured_at: string;
  route: string;
  course_id?: string;
  lesson_id?: string;
  exercise_id?: string;
  active_tab?: string;
  active_panel?: string;
  video?: { current_time: number; duration?: number; is_playing: boolean; playback_rate?: number };
  editor?: { active_file_id?: string; revision: number; is_dirty: boolean; selection?: { start: number; end: number } };
  quiz?: { quiz_id?: string; question_id?: string; state?: string };
}
export interface ActionRequest {
  action_id: string;
  name: string;
  arguments: Record<string, unknown>;
  page_instance_id: string;
  context_revision: number;
  lesson_id?: string;
  expires_at: string;
  approval_id?: string;
}
export interface ActionReceipt {
  page_instance_id: string;
  context_revision: number;
  lesson_id?: string;
  status: 'completed' | 'failed' | 'cancelled' | 'stale_context';
  verified: boolean;
  result?: unknown;
  error?: string;
}
export interface AgentEvent {
  schema_version: 1;
  id: string;
  run_id: string;
  sequence: number;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}
export interface ScreenActionResult {
  name: string;
  arguments: Record<string, unknown>;
  verified: boolean;
  error?: string;
}
export interface AgentApproval {
  approval_id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  preview?: unknown;
  expires_at?: string;
}
export interface EditorPatch { file_id: string; start: number; end: number; expected_text: string; replacement: string }
