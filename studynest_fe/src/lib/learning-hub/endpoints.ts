// The authenticated Axios client maps /api/* to /api/v1/*.
const id = encodeURIComponent;
const goals = "/user/goals";
const missions = "/gamification/missions";
const shop = "/gamification/shop/items";

export const hubEndpoints = {
  reviewQueue: "/user/review/queue",
  reviewAnswer: (itemId: string) => `/user/review/${id(itemId)}/answer`,
  masteryCourses: "/user/mastery/courses",
  courseMastery: (courseId: string) => `/user/courses/${id(courseId)}/mastery`,
  goals,
  goal: (goalId: string) => `${goals}/${id(goalId)}`,
  goalPlan: (goalId: string) => `${goals}/${id(goalId)}/plan`,
  weeklyReport: "/user/reports/weekly",
  badges: "/gamification/badges",
  missions,
  missionClaim: (missionId: string) => `${missions}/${id(missionId)}/claim`,
  inventory: "/gamification/rewards/inventory",
  levels: "/gamification/levels",
  shopItems: shop,
  shopPurchase: (itemId: string) => `${shop}/${id(itemId)}/purchase`,
  shopInventory: "/gamification/inventory",
  equipment: "/gamification/equipment",
  coins: "/coins",
  coinRate: "/coins/rate",
  exchangeWhite: "/coins/exchange-white",
  checkIn: "/gamification/checkin",
  streak: "/gamification/streak",
  activity: "/gamification/streak/history?limit=100",
  purchases: "/purchases/courses",
  activeLesson: (courseId: string) => `/learning/${id(courseId)}/view/active`,
  curriculum: (courseId: string) => `/learning/${id(courseId)}/curriculum`,
  bundleOrders: "/bundles/orders/my",
  bundleOrder: (orderId: string) => `/bundles/orders/${id(orderId)}`,
  followingPaths: "/learning-paths/my",
  pathVersion: (versionId: string) => `/learning-paths/versions/${id(versionId)}`,
};
