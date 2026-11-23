import { HubRouteGuard, MasteryView } from "@/components/learning-hub";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bản đồ năng lực | Mây Mây",
  description: "Theo dõi mức độ nắm vững kiến thức theo cấu trúc khóa học, chương và bài giảng.",
};

export default function MasteryPage() {
  return (
    <HubRouteGuard>
      <MasteryView />
    </HubRouteGuard>
  );
}
