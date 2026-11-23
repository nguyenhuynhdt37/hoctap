import api from "@/lib/utils/fetcher/client/axios";
import { hubEndpoints } from "./endpoints";
import type {
  CourseMasteryResponse,
  LearningBadge,
  LearningHubApi,
  MasteryCourse,
  ReviewQueueResponse,
  StudyGoal,
  StudyGoalPlanResponse,
  StudyGoalsListResponse,
  SubmitReviewAnswerResponse,
  WeeklyLearningReport,
} from "./types";

export const apiLearningHubClient: LearningHubApi = {
  getReviewQueue: async (params) => (await api.get<ReviewQueueResponse>(hubEndpoints.reviewQueue, {
    params: { course_id: params?.course_id, limit: params?.limit },
  })).data,
  submitReviewAnswer: async (id, payload) =>
    (await api.post<SubmitReviewAnswerResponse>(hubEndpoints.reviewAnswer(id), payload)).data,
  getMasteryCourses: async () => (await api.get<{ courses: MasteryCourse[] }>(hubEndpoints.masteryCourses)).data,
  getCourseMastery: async (id) => (await api.get<CourseMasteryResponse>(hubEndpoints.courseMastery(id))).data,
  getGoals: async () => (await api.get<StudyGoalsListResponse>(hubEndpoints.goals)).data,
  getGoal: async (id) => (await api.get<StudyGoal>(hubEndpoints.goal(id))).data,
  createGoal: async (payload) => (await api.post<StudyGoal>(hubEndpoints.goals, payload)).data,
  updateGoal: async (id, payload) => (await api.patch<StudyGoal>(hubEndpoints.goal(id), payload)).data,
  deleteGoal: async (id) => { await api.delete(hubEndpoints.goal(id)); },
  getGoalPlan: async (id) => (await api.get<StudyGoalPlanResponse>(hubEndpoints.goalPlan(id))).data,
  getWeeklyReport: async () => (await api.get<WeeklyLearningReport>(hubEndpoints.weeklyReport)).data,
  getBadges: async () => (await api.get<{ badges: LearningBadge[] }>(hubEndpoints.badges)).data,
};
