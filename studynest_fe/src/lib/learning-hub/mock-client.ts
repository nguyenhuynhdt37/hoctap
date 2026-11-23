import type { CourseMasteryResponse, LearningHubApi, MasteryCourse, ReviewQueueItem, StudyGoal, SubmitReviewAnswerResponse } from "./types";
import { safeUUID } from "../utils/uuid";

const DEFAULT_MOCK_COURSE_ID = "course-math12-calculus";

const MOCK_REVIEW_ITEMS: ReviewQueueItem[] = [
  {
    item_id: "rev-item-101",
    quiz_id: "quiz-math12-c2-q4",
    course: { id: DEFAULT_MOCK_COURSE_ID, title: "Toán 12 — Khảo sát hàm số & Ứng dụng đạo hàm", thumbnail_url: null },
    section: { id: "sec-math12-02", title: "Chương 2 · Đường tiệm cận của đồ thị", position: 1 },
    lesson: { id: "les-math12-08", title: "Bài 8: Tiệm cận xiên và bài toán tham số m" },
    lesson_href: "/learning/toan-12-khao-sat-ham-so?lesson_id=les-math12-08",
    difficulty: 2,
    question: "Đường tiệm cận xiên của đồ thị y = (2x² − 3x + 2)/(x − 1) là đường thẳng nào?",
    options: [
      { id: "opt-a", text: "y = 2x − 1" },
      { id: "opt-b", text: "y = 2x + 1" },
      { id: "opt-c", text: "y = x − 1" },
      { id: "opt-d", text: "x = 1" },
    ],
    due_at: "2026-11-23T08:00:00Z",
  },
  {
    item_id: "rev-item-102",
    quiz_id: "quiz-math12-c3-q2",
    course: { id: DEFAULT_MOCK_COURSE_ID, title: "Toán 12 — Khảo sát hàm số & Ứng dụng đạo hàm", thumbnail_url: null },
    section: { id: "sec-math12-03", title: "Chương 3 · Cực trị và tiệm cận đồ thị hàm số", position: 1 },
    lesson: { id: "les-math12-12", title: "Bài 12: Cực trị hàm bậc ba và định lý Vi-ét" },
    lesson_href: "/learning/toan-12-khao-sat-ham-so?lesson_id=les-math12-12",
    difficulty: 3,
    question:
      "Hàm số y = x³ - 3mx² + 3(m² - 1)x - m³ có hai điểm cực trị x₁, x₂ thỏa mãn x₁² + x₂² = 10 khi giá trị của m bằng bao nhiêu?",
    options: [
      { id: "opt-a", text: "m = ±2" },
      { id: "opt-b", text: "m = ±1" },
      { id: "opt-c", text: "m = 2" },
      { id: "opt-d", text: "m = ±3" },
    ],
    due_at: "2026-11-23T09:30:00Z",
  },
  {
    item_id: "rev-item-103",
    quiz_id: "quiz-phys12-c1-q7",
    course: { id: "course-phys12-oscillation", title: "Vật lý 12 — Dao động cơ & Sóng cơ học", thumbnail_url: null },
    section: { id: "sec-phys12-01", title: "Chương 1 · Dao động cơ đại cương", position: 1 },
    lesson: { id: "les-phys12-05", title: "Bài 5: Tổng hợp hai dao động điều hòa cùng tần số" },
    lesson_href: "/learning/vat-ly-12-dao-dong-song-co?lesson_id=les-phys12-05",
    difficulty: 3,
    question:
      "Hai dao động điều hòa cùng phương, cùng tần số có biên độ lần lượt là A₁ = 6 cm và A₂ = 8 cm, lệch pha nhau π/2. Biên độ dao động tổng hợp bằng bao nhiêu?",
    options: [
      { id: "opt-a", text: "10 cm" },
      { id: "opt-b", text: "14 cm" },
      { id: "opt-c", text: "2 cm" },
      { id: "opt-d", text: "7 cm" },
    ],
    due_at: "2026-11-23T10:00:00Z",
  },
];

const sampleCourses: MasteryCourse[] = MOCK_REVIEW_ITEMS
  .filter(({ course }, index, items) => items.findIndex((item) => item.course.id === course.id) === index)
  .map(({ course }) => {
    const count = MOCK_REVIEW_ITEMS.filter((item) => item.course.id === course.id).length;
    return { ...course, course_score: 60, status: "needs_review", total_lessons: count, quiz_lessons: count };
  });

const clients = new Map<string, LearningHubApi>();

export function getMockLearningHubClient(userId = "preview"): LearningHubApi {
  const existing = clients.get(userId);
  if (existing) return existing;

  const goals = new Map<string, StudyGoal>();
  const answered = new Set<string>();
  const answers = new Map<string, SubmitReviewAnswerResponse>();

  function getGoal(id: string) {
    const goal = goals.get(id);
    if (!goal) throw new Error("Không tìm thấy mục tiêu.");
    return goal;
  }

  const client: LearningHubApi = {
    async getReviewQueue(params) {
      const due = MOCK_REVIEW_ITEMS.filter(({ item_id, course }) =>
        !answered.has(item_id) && (!params?.course_id || course.id === params.course_id));
      return { due_count: due.length, items: due.slice(0, params?.limit ?? due.length) };
    },
    async submitReviewAnswer(id, payload) {
      const key = `${id}:${payload.idempotency_key}`;
      const previous = answers.get(key);
      if (previous) return previous;
      const item = MOCK_REVIEW_ITEMS.find(({ item_id }) => id === item_id);
      if (!item?.options.some((option) => option.id === payload.option_id)) throw new Error("Câu trả lời không hợp lệ.");
      const correct_option_id = item.options[0].id;
      const interval_days = payload.self_rating === "remembered" ? 4 : 1;
      answered.add(id);
      const result = {
        correct: payload.option_id === correct_option_id,
        correct_option_id,
        interval_days,
        next_due_at: new Date(Date.now() + interval_days * 86_400_000).toISOString(),
        explanation: "",
        due_count: MOCK_REVIEW_ITEMS.length - answered.size,
      };
      answers.set(key, result);
      return result;
    },
    async getMasteryCourses() {
      return { courses: sampleCourses };
    },
    async getCourseMastery(id): Promise<CourseMasteryResponse> {
      const course = sampleCourses.find((sample) => sample.id === id);
      if (!course) throw new Error("Không tìm thấy khóa học.");
      return {
        course, course_score: course.course_score, status: course.status,
        sections: MOCK_REVIEW_ITEMS.filter((item) => item.course.id === id).flatMap(({ section, lesson, lesson_href }) =>
          section ? [{
            ...section, score: 60, status: "needs_review",
            lessons: [{
              ...lesson, lesson_type: "quiz", position: 1, has_quiz: true, score: 60,
              status: "needs_review", last_seen_at: null, wrong_count: 1, href: lesson_href,
            }],
          }] : []),
      };
    },
    async getGoals() {
      return { items: Array.from(goals.values()) };
    },
    async getGoal(id) {
      return getGoal(id);
    },
    async createGoal(payload) {
      const now = new Date().toISOString();
      const goal: StudyGoal = {
        id: safeUUID(), ...payload,
        title: "", thumbnail_url: null, created_at: now, updated_at: now, progress_percent: 0, on_track: true, behind_lessons: 0,
      };
      goals.set(goal.id, goal);
      return goal;
    },
    async updateGoal(id, payload) {
      const goal = { ...getGoal(id), ...payload, updated_at: new Date().toISOString() };
      goals.set(id, goal);
      return goal;
    },
    async deleteGoal(id) {
      goals.delete(id);
    },
    async getGoalPlan(id) {
      const goal = getGoal(id);
      const items = MOCK_REVIEW_ITEMS.filter(({ course }) => course.id === goal.target_id)
        .map(({ lesson, lesson_href }) => ({ kind: "review" as const, lesson_id: lesson.id, title: lesson.title, done: false, href: lesson_href }));
      return {
        goal, days: items.length ? [{ date: goal.target_date, items }] : [],
        completed_lessons: 0, total_lessons: items.length, on_track: true, behind_lessons: 0, suggestion: null,
      };
    },
    async getWeeklyReport() {
      return {
        week_start: "2026-11-16", week_end: "2026-11-22",
        lessons_completed: 6, quizzes_taken: 2, reviews_done: 18, study_days: 4, streak: 4,
        top_courses: [{ ...sampleCourses[0], lessons_completed: 6 }],
        share_text: "Báo cáo tuần Mây Mây · Dữ liệu mẫu\n6 bài đã học · 2 bài trắc nghiệm · 18 lượt ôn",
      };
    },
    async getBadges() {
      return { badges: [{
        id: "dev-first-lesson", name: "Bài học đầu tiên", description: "Hoàn thành một bài học.",
        image_url: "/images/learning-hub/may-cloud.jpg", earned: false, earned_at: null,
      }] };
    },
  };

  clients.set(userId, client);
  return client;
}
