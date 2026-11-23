import { Badge } from "@/components/ui";
import { getHubDataSource } from "@/lib/learning-hub/data-source";
import type { HubDataSource } from "@/lib/learning-hub/types";

export function MockDataChip({ source }: { source: HubDataSource }) {
  return source === "mock" && getHubDataSource() === "mock" && <Badge variant="vanilla">Dữ liệu mẫu</Badge>;
}
