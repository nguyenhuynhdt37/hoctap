import { getServerCookie } from "@/lib/utils/fetcher/server/cookieStore";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import UserProvider from "@/provider/UserProvider";
import { cookies } from "next/headers";
import { Suspense } from "react";

const backendUrl = process.env.NEXT_PUBLIC_URL_BACKEND || "http://127.0.0.1:8000";

async function tryServerRefresh(refreshToken: string, cookieStore: any) {
  try {
    const refreshRes = await fetch(`${backendUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: `refresh_token=${refreshToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      const newAccessToken = data.access_token;
      if (newAccessToken) {
        // Tạo một mock cookieStore chứa access_token mới để gọi api /auth/me
        const customCookieStore = {
          toString: () => `access_token=${newAccessToken}`
        } as any;
        const res_getUserRetry = await fetcher("/auth/me", customCookieStore);
        if (res_getUserRetry.ok) {
          return await res_getUserRetry.json();
        }
      }
    }
  } catch (e) {
    console.error("Server-side refresh failed:", e);
  }
  // Nếu refresh thất bại hoàn toàn, buộc phải logout
  await forceLogout(cookieStore);
  return null;
}

async function forceLogout(cookieStore: any) {
  try {
    await fetcher("/auth/logout", cookieStore, {
      method: "POST",
      body: JSON.stringify({}),
    });
  } catch (e) {
    console.error("Server-side logout failed:", e);
  }
}

async function UserDataLoader({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = getServerCookie(cookieStore, "access_token");
  const refreshToken = getServerCookie(cookieStore, "refresh_token");
  
  let user = null;
  if (token) {
    const res_getUser = await fetcher("/auth/me", cookieStore);
    if (!res_getUser.ok) {
      if (refreshToken) {
        user = await tryServerRefresh(refreshToken, cookieStore);
      } else {
        await forceLogout(cookieStore);
      }
    } else {
      user = await res_getUser.json();
    }
  } else if (refreshToken) {
    user = await tryServerRefresh(refreshToken, cookieStore);
  }

  return <UserProvider user={user}>{children}</UserProvider>;
}

export default function UserLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<UserProvider user={null}>{children}</UserProvider>}>
      <UserDataLoader>{children}</UserDataLoader>
    </Suspense>
  );
}
