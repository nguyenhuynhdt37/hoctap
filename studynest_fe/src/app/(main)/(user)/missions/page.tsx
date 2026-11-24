import { HubRouteGuard } from "@/components/learning-hub";
import { QuestArenaView } from "@/components/learning-hub/missions/quest-arena-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nhiệm vụ & cấp độ | Mây Mây",
  description:
    "Trạm săn thưởng hằng ngày, điểm danh 7 ngày, cột mốc khóa học và kho huy hiệu của bạn trên Mây Mây.",
};

export default function MissionsPage() {
  return (
    <HubRouteGuard>
      <QuestArenaView />
    </HubRouteGuard>
  );
}
