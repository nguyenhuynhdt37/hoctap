import api from '@/lib/utils/fetcher/client/axios';
export interface VerifiedQuizAttempt { attempt_id: string; correct: number; total: number; score_percent: number }
export async function submitQuizAttempt(lessonId: string, answers: Array<{ question_id: string; option_id: string }>, idempotencyKey: string) {
  const response = await api.post<VerifiedQuizAttempt>(`/learning/${lessonId}/quiz-attempts`, { idempotency_key: idempotencyKey, answers });
  if (!response.data.attempt_id || !Number.isFinite(response.data.score_percent)) throw new Error('Kết quả chưa được lưu và xác minh.');
  return response.data;
}
