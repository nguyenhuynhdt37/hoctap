import Personalize from "@/components/user/personalize";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import { cookies } from "next/headers";

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  topics: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

const PersonalizePage = async () => {
  const stores = await cookies();
  const response = await fetcher("/categories/subcategories", stores);
  const result: Subcategory[] = await response.json();

  // Chỉ lấy các category gốc (parent_id === null)
  const rootCategories = result.filter((item) => item.parent_id === null);

  return <Personalize learningFields={rootCategories} />;
};

export default PersonalizePage;
