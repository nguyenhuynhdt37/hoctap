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

async function refreshTokens(refreshToken: string) {
  try {
    const res = await fetch(`${backendUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: `refresh_token=${refreshToken}; Path=/; HttpOnly`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) return null;
    const setCookieHeader = res.headers.get("set-cookie");
    const data = await res.json();
    return {
      data,
      setCookieHeader,
    };
  } catch {
    return null;
  }
}

function parseSetCookie(header: string) {
  const parts = header.split(/,\s*(?=[a-zA-Z0-9_]+=)/);
  return parts.map((part) => {
    const [nameValue, ...attrs] = part.split(";");
    const [name, value] = nameValue.split("=");
    const options: any = {};
    attrs.forEach((attr) => {
      const [key, val] = attr.trim().split("=");
      const k = key.toLowerCase();
      if (k === "path") options.path = val;
      else if (k === "httponly") options.httpOnly = true;
      else if (k === "secure") options.secure = true;
      else if (k === "samesite") options.sameSite = val.toLowerCase() as any;
      else if (k === "max-age") options.maxAge = parseInt(val, 10);
    });
    return { name: name.trim(), value: value.trim(), options };
  });
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

  let token = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;

  const isAdmin = path.startsWith(ADMIN_PREFIX);
  const isLecturer = path.startsWith(LECTURER_PREFIX);
  const isUserRoute = USER_PREFIXES.some((r) => path.startsWith(r));

  // PUBLIC
  if (!isAdmin && !isLecturer && !isUserRoute) {
    return NextResponse.next();
  }

  let user = null;
  if (token) {
    user = await getUser(token);
  }

  // Tự động làm mới nếu token hết hạn nhưng có refresh_token
  if (!user && refreshToken) {
    const refreshResult = await refreshTokens(refreshToken);
    if (refreshResult) {
      const { data, setCookieHeader } = refreshResult;
      const newAccessToken = data.access_token;
      if (newAccessToken) {
        user = await getUser(newAccessToken);
        if (user && !user.is_banned) {
          // Ghi đè cookie vào request headers để các downstream Server Components nhận diện được
          req.headers.set(
            "cookie",
            `access_token=${newAccessToken}; refresh_token=${data.refresh_token}`
          );
          
          const response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });

          // Đặt cookies mới vào response trả về trình duyệt
          if (setCookieHeader) {
            const cookiesToSet = parseSetCookie(setCookieHeader);
            for (const c of cookiesToSet) {
              response.cookies.set(c.name, c.value, c.options);
            }
          }

          // Kiểm tra phân quyền truy cập
          if (isAdmin && !user.roles?.includes("ADMIN")) {
            return NextResponse.redirect(new URL("/", origin));
          }
          if (isLecturer) {
            if (!path.startsWith("/lecturer/welcome")) {
              if (!user.roles?.includes("LECTURER")) {
                return NextResponse.redirect(new URL("/", origin));
              }
            }
          }
          if (isUserRoute) {
            if (
              !user.roles?.includes("USER") &&
              !user.roles?.includes("LECTURER") &&
              !user.roles?.includes("ADMIN")
            ) {
              return NextResponse.redirect(new URL("/", origin));
            }
          }

          return response;
        }
      }
    }
  }

  // No token / No user
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
