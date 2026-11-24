export type AuthRole = "USER" | "LECTURER" | "ADMIN";

export const userRoles: AuthRole[] = ["USER", "LECTURER", "ADMIN"];

// Matches the protected user routes in the cookie middleware.
const userPrefixes = [
  "/learning-paths/my", "/combo/orders", "/lo-trinh/cua-toi", "/combo/don-hang", "/profile", "/my-learning",
  "/favorites", "/notifications", "/wallets", "/refunds", "/learning", "/chat-sql",
];

export function isUserProtectedPath(path: string): boolean {
  return userPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function isLecturerWelcome(path: string): boolean {
  return path.startsWith("/lecturer/welcome");
}

export function loginRedirect(returnTo: string): string {
  return `/login?redirect=${encodeURIComponent(returnTo)}`;
}

export function protectedDestination(
  path: string,
  user: { is_banned: boolean; roles?: string[] } | null,
  roles?: AuthRole[],
): "/login" | "/banned" | "/" | null {
  if (!user) return "/login";
  if (user.is_banned && path !== "/banned") return "/banned";
  if (!roles || (roles.includes("LECTURER") && isLecturerWelcome(path))) return null;
  return roles.some((role) => user.roles?.includes(role)) ? null : "/";
}
