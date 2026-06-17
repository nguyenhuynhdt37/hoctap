import { getServerCookie } from "./cookieStore";

export async function fetcher<T>(
  url: string,
  cookies?: any,
  options?: RequestInit
): Promise<any> {
  const token = getServerCookie(cookies, "access_token");
  const backendUrl =
    process.env.NEXT_PUBLIC_URL_BACKEND || "http://127.0.0.1:8000";
  const res = await fetch(`${backendUrl}/api/v1${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
      ...(token ? { Cookie: `access_token=${token}` } : {}),
    },
    credentials: "include",
  });
  console.log("res url", `${backendUrl}/api/v1${url}`);
  return res;
}
