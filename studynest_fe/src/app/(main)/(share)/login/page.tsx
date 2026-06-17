import Login from "@/components/user/login";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

const LoginPage = async () => {
  const stores = await cookies();
  const result = await fetcher("/auth/check_is_login", stores);
  if (result.ok) {
    redirect("/");
  }
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Đang tải...
        </div>
      }
    >
      <Login />
    </Suspense>
  );
};

export default LoginPage;
