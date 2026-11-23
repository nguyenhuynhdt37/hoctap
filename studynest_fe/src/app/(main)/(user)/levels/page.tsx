import { HubRouteGuard } from "@/components/learning-hub";
import { LevelsView } from "@/components/learning-hub/levels/levels-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cấp độ & phần thưởng | Mây Mây",
  description: "Xem các chặng đã bay qua và quà chờ bạn ở từng cấp.",
};

export default function LevelsPage() {
  return <HubRouteGuard><LevelsView /></HubRouteGuard>;
}
