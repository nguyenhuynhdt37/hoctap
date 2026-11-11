import LearningLibrary from "@/components/learning-paths/library";
export const metadata = {
  title: "Lộ trình học tập",
  alternates: { canonical: "/lo-trinh" },
};
export default function Page() {
  return <LearningLibrary kind="paths" />;
}
