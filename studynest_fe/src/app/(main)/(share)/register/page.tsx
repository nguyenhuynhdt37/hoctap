import Register from "@/components/user/register";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const RegisterPage = async () => {
  const stores = await cookies();
  const result = await fetcher("/auth/check_is_login", stores);
  if (result.ok) {
    redirect("/");
  }
  return <Register />;
};

export default RegisterPage;
