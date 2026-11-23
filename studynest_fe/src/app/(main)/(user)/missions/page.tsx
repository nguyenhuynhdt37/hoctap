import { HubRouteGuard } from "@/components/learning-hub";
import { HomeLink } from "@/components/learning-hub/home/section";
import { MissionBoard } from "@/components/learning-hub/missions/mission-board";
import { RewardShelf } from "@/components/learning-hub/missions/reward-shelf";
import { Reveal, SectionShell } from "@/components/user/home/landing-ui";
import { StudyImage } from "@/components/user/home/study-image";
import { ArrowLeft } from "@/components/ui/server-icons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nhiệm vụ & cấp độ | Mây Mây",
  description: "Theo dõi nhiệm vụ hằng ngày, cột mốc của từng khóa học và phần thưởng của bạn.",
};

export default function MissionsPage() {
  return (
    <HubRouteGuard>
      <main className="min-h-screen font-sans text-foreground">
        <SectionShell tone="blue" innerClassName="pt-8! pb-16! sm:pt-12! sm:pb-24!">
          <Reveal className="mb-7 grid items-center gap-5 sm:mb-10 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <HomeLink href="/" endIcon={false} icon={<ArrowLeft aria-hidden="true" className="size-4" />}>Trang chủ</HomeLink>
              <h1 className="mt-5 font-display text-[clamp(2.25rem,6vw,4rem)] leading-tight font-semibold tracking-tight">Nhiệm vụ & cấp độ</h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed">Giữ nhịp học mỗi ngày và nhận thưởng khi chạm các cột mốc trong khóa học.</p>
            </div>
            <StudyImage sizes="(min-width: 1280px) 440px, (min-width: 640px) 38vw, 90vw"
              className="aspect-[2/1] w-full rounded-3xl border-4 border-surface shadow-ambient-md sm:justify-self-end" />
          </Reveal>
          <MissionBoard full />
          <RewardShelf />
        </SectionShell>
      </main>
    </HubRouteGuard>
  );
}
