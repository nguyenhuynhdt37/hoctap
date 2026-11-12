import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import { UserProfile } from "@/types/user/profile";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loadOwnProfile(
  redirectTo: string
): Promise<{ profile: UserProfile } | { error: string }> {
  const stores = await cookies();
  let response: Response;
  try {
    response = await fetcher("/profile", stores);
  } catch {
    return { error: "Không thể kết nối đến server. Vui lòng thử lại sau." };
  }
  if (response.status === 401) {
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }
  try {
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        error: body.detail || body.message || "Có lỗi xảy ra khi tải hồ sơ",
      };
    }
    return { profile: (await response.json()) as UserProfile };
  } catch {
    return { error: "Không thể kết nối đến server. Vui lòng thử lại sau." };
  }
}
