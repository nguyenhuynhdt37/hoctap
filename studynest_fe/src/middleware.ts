import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const backendUrl = process.env.NEXT_PUBLIC_URL_BACKEND || "http://127.0.0.1:8000";
const userPrefixes = ["/lo-trinh/cua-toi", "/combo/don-hang", "/profile", "/my-learning", "/favorites", "/notifications", "/wallets", "/refunds", "/learning", "/chat-sql"];

async function backend(path: string, cookie: string, method = "GET") {
  return fetch(`${backendUrl}/api/v1/auth/${path}`, {
    method, cache: "no-store", signal: AbortSignal.timeout(15000),
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    ...(method === "POST" ? { body: "{}" } : {}),
  });
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isAdmin = path === "/admin" || path.startsWith("/admin/");
  const isLecturer = path === "/lecturer" || path.startsWith("/lecturer/");
  const isUser = userPrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
  const protectedPage = isAdmin || isLecturer || isUser;
  const isPrefetch =
    req.headers.get("next-router-prefetch") === "1" ||
    req.headers.get("purpose") === "prefetch" ||
    req.headers.get("sec-purpose") === "prefetch";
  const access = req.cookies.get("access_token")?.value;
  const refresh = req.cookies.get("refresh_token")?.value;
  if (!protectedPage && (isPrefetch || (!access && !refresh))) {
    return NextResponse.next();
  }
  if (protectedPage && !access && !refresh) {
    return NextResponse.redirect(
      new URL(
        `/login?redirect=${encodeURIComponent(path + req.nextUrl.search)}`,
        req.url
      )
    );
  }

  let user = null;
  let unavailable = false;
  let invalidSession = false;
  let setCookies: string[] = [];
  try {
    let response = access ? await backend("me", `access_token=${access}`) : null;
    // Only an authentication failure permits rotation. 5xx/network errors do not.
    if ((!response || response.status === 401) && refresh) {
      const rotated = await backend("refresh", `refresh_token=${refresh}`, "POST");
      if (rotated.ok) {
        const data = await rotated.json();
        if (!data.access_token || !data.refresh_token) throw new Error("Invalid refresh response");
        setCookies = rotated.headers.getSetCookie?.() ?? [];
        if (!setCookies.length) {
          const combined = rotated.headers.get("set-cookie");
          if (combined) setCookies = combined.split(/,\s*(?=[\w-]+=)/);
        }
        // Preserve all unrelated cookies and give the new credentials to SSR
        // in THIS request, as well as to the browser in the response.
        req.cookies.set("access_token", data.access_token);
        req.cookies.set("refresh_token", data.refresh_token);
        response = await backend("me", `access_token=${data.access_token}`);
      } else if (rotated.status === 401 || rotated.status === 403) {
        invalidSession = true;
        req.cookies.delete("access_token");
        req.cookies.delete("refresh_token");
      } else {
        unavailable = true;
      }
    }
    if (response?.status === 401 && !refresh) {
      invalidSession = true;
      req.cookies.delete("access_token");
    }
    if (response?.ok) user = await response.json();
    else if (response && response.status !== 401 && response.status !== 403) unavailable = true;
  } catch {
    unavailable = true;
  }

  const redirect = (target: string) => NextResponse.redirect(new URL(target, req.url));
  let result: NextResponse;
  if (unavailable && protectedPage) {
    result = new NextResponse("Dịch vụ tạm thời gián đoạn. Vui lòng tải lại trang.", { status: 503 });
  } else if (!user && protectedPage) {
    result = redirect(`/login?redirect=${encodeURIComponent(path + req.nextUrl.search)}`);
  } else if (user?.is_banned && path !== "/banned") {
    result = redirect("/banned");
  } else if (user && (isAdmin && !user.roles?.includes("ADMIN") ||
      isLecturer && !path.startsWith("/lecturer/welcome") && !user.roles?.includes("LECTURER") ||
      isUser && !user.roles?.some((role: string) => ["USER", "LECTURER", "ADMIN"].includes(role)))) {
    result = redirect("/");
  } else {
    result = NextResponse.next({ request: { headers: req.headers } });
  }
  if (invalidSession) {
    result.cookies.delete("access_token");
    result.cookies.delete("refresh_token");
  }
  // Also persist rotation on permission redirects or a transient downstream 503.
  for (const cookie of setCookies) result.headers.append("set-cookie", cookie);
  if (access || refresh) result.headers.set("Cache-Control", "private, no-store");
  return result;
}

// Public pages also hydrate login state; assets and /api keep their own handlers.
export const config = {
  matcher: [
    "/((?!api|_next|\\.well-known|favicon\\.ico|robots\\.txt|sitemap\\.xml|logo|images|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf)$).*)",
  ],
};
