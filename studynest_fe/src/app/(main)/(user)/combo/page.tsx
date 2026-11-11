import LearningLibrary from "@/components/learning-paths/library";
export const metadata = {
  title: "Combo khóa học",
  alternates: { canonical: "/combo" },
};
export default function Page() {
  return <LearningLibrary kind="bundles" />;
}
