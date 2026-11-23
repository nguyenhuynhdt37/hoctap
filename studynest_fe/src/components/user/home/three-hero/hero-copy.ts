import type { HeroLevelCopy } from "./contract";

/** Nội dung từng tầng mây — dùng chung cho hero 3D và bản fallback. */
export const HERO_LEVEL_COPY: HeroLevelCopy[] = [
  {
    id: "primary",
    badge: "Lớp 1–5 · Tầng mây đầu tiên",
    headline: "Học tập nhẹ nhàng,\ntiến bộ mỗi ngày",
    description:
      "Cuộn xuống để bay qua từng tầng mây — từ Tiểu học, THCS đến THPT — và chọn lộ trình học phù hợp với bạn.",
    primaryCta: "Khám phá khóa học",
    secondaryCta: "Xem lộ trình học",
  },
  {
    id: "middle",
    badge: "Lớp 6–9 · Tầng mây giữa trời",
    headline: "Bay cao hơn,\nvững vàng hơn",
    description:
      "Củng cố nền tảng kiến thức THCS với lộ trình rõ ràng, bài giảng dễ hiểu và nhịp học vừa sức mỗi ngày.",
    primaryCta: "Xem khóa học THCS",
    secondaryCta: "Xem lộ trình học",
  },
  {
    id: "high",
    badge: "Lớp 10–12 · Tầng trời cao nhất",
    headline: "Chạm tới\nbầu trời đại học",
    description:
      "Ôn luyện bài bản cho THPT và kỳ thi quan trọng, cùng người đồng hành tin cậy trên mỗi chặng đường.",
    primaryCta: "Xem khóa học THPT",
    secondaryCta: "Xem lộ trình học",
  },
];
