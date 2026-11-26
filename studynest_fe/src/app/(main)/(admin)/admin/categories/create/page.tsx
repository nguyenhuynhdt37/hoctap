import { redirect } from "next/navigation";

export default function AdminCreateCategoryRedirectPage() {
  redirect("/admin/catalog");
}
