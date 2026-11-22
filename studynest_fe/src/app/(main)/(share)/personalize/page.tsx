import Personalize from "@/components/user/personalize";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import { cookies } from "next/headers";

interface TopicItem {
  id: string;
  name: string;
  slug: string;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  topics: TopicItem[];
}

export const metadata = {
  title: "Cá nhân hóa lộ trình | Mây Mây",
};

const PersonalizePage = async () => {
  const stores = await cookies();
  const response = await fetcher("/categories/subcategories", stores);
  const result: Subcategory[] = response.ok ? await response.json() : [];
  const items = Array.isArray(result) ? result : [];

  const rootCategories = items
    .filter((item) => item.parent_id === null)
    .map((root) => {
      const childTopics = items
        .filter((child) => child.parent_id === root.id)
        .flatMap((child) => child.topics ?? []);
      const merged = [...(root.topics ?? []), ...childTopics];
      const seen = new Set<string>();
      const uniqueTopics = merged.filter((topic) => {
        const key = topic.name.trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return {
        ...root,
        topics: uniqueTopics,
      };
    });

  return <Personalize learningFields={rootCategories} />;
};

export default PersonalizePage;
