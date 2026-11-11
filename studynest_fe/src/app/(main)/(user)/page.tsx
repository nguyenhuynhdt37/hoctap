import Home from "@/components/user/home";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mây Mây — Hành trình học tập trên mây cho học sinh Lớp 1 đến Lớp 12",
  description:
    "Khám phá thế giới học tập trực tuyến Mây Mây dành cho học sinh Tiểu học (Lớp 1–5), THCS (Lớp 6–9) và THPT (Lớp 10–12) với bài giảng trực quan, luyện tập tương tác và lộ trình rõ ràng.",
  openGraph: {
    title: "Mây Mây — Hành trình học tập trên mây (Lớp 1 – Lớp 12)",
    description:
      "Nền tảng học tập trực tuyến Mây Mây với bài giảng trực quan, luyện tập tương tác và theo dõi tiến độ dành cho học sinh từ lớp 1 đến lớp 12.",
    images: ["/videos/studynest/scene-welcome.jpg"],
    locale: "vi_VN",
    type: "website",
  },
};

const HomePage = () => {
  return <Home />;
};

export default HomePage;
