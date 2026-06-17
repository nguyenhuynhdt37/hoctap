// Middleware chạy mặc định trên edge runtime trong Next.js

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const backendUrl =
  process.env.NEXT_PUBLIC_URL_BACKEND || "http://127.0.0.1:8000";

async function getUser(token: string) {
  try {
    const res = await fetch(`${backendUrl}/api/v1/auth/me`, {
      headers: {
        Cookie: `access_token=${token}; Path=/; HttpOnly`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const ADMIN_PREFIX = "/admin";
const LECTURER_PREFIX = "/lecturer";
const USER_PREFIXES = [
  "/profile",
  "/my-learning",
  "/favorites",
  "/notifications",
  "/wallets",
  "/refunds",
];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Lấy origin từ headers để giữ nguyên host thực tế (127.0.0.1 hoặc localhost)
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "localhost:3000";
  const protocol = req.headers.get("x-forwarded-proto") || "http";
  const origin = `${protocol}://${host}`;

  const token = req.cookies.get("access_token")?.value;

  const isAdmin = path.startsWith(ADMIN_PREFIX);
  const isLecturer = path.startsWith(LECTURER_PREFIX);
  const isUserRoute = USER_PREFIXES.some((r) => path.startsWith(r));

  // PUBLIC
  if (!isAdmin && !isLecturer && !isUserRoute) {
    return NextResponse.next();
  }

  // No token
  if (!token) {
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(path)}`, origin)
    );
  }

  const user = await getUser(token);
  if (!user) {
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(path)}`, origin)
    );
  }

  if (user.is_banned) {
    return NextResponse.redirect(new URL("/banned", origin));
  }

  // ADMIN
  if (isAdmin) {
    if (!user.roles?.includes("ADMIN")) {
      return NextResponse.redirect(new URL("/", origin));
    }
    return NextResponse.next();
  }

  // LECTURER
  if (isLecturer) {
    if (!path.startsWith("/lecturer/welcome")) {
      if (!user.roles?.includes("LECTURER")) {
        return NextResponse.redirect(new URL("/", origin));
      }
    }
    return NextResponse.next();
  }

  // USER
  if (isUserRoute) {
    if (
      !user.roles?.includes("USER") &&
      !user.roles?.includes("LECTURER") &&
      !user.roles?.includes("ADMIN")
    ) {
      return NextResponse.redirect(new URL("/", origin));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/lecturer",
    "/lecturer/:path*",
    "/profile/:path*",
    "/my-learning/:path*",
    "/favorites/:path*",
    "/notifications/:path*",
    "/wallets/:path*",
    "/refunds/:path*",
  ],
};
