import { HubRouteGuard } from "@/components/learning-hub/hub-route-guard";
import { LeaderboardView } from "@/components/user/leaderboard/leaderboard-view";

export default function LeaderboardPage() {
  return (
    <HubRouteGuard>
      <LeaderboardView />
    </HubRouteGuard>
  );
}
