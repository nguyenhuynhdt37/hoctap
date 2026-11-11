import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import UserProvider from "@/provider/UserProvider";
import { cookies } from "next/headers";
import { Suspense } from "react";

async function UserDataLoader({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const hasSession = Boolean(store.get("access_token") || store.get("refresh_token"));
  let user = null;
  if (store.get("access_token")) {
    try {
      const response = await fetcher("/auth/me", store);
      if (response.ok) user = await response.json();
    } catch {
      // A Server Component cannot persist rotated cookies. Middleware/browser
      // recovery owns refresh; rendering must never revoke a session.
    }
  }
  return <UserProvider user={user} recoverSession={hasSession && !user}>{children}</UserProvider>;
}

export default function UserLoader({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<UserProvider user={null} deferHydration>{children}</UserProvider>}>
      <UserDataLoader>{children}</UserDataLoader>
    </Suspense>
  );
}
