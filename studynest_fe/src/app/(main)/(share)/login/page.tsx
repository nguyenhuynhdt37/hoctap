import Login from "@/components/user/login";
import { Suspense } from "react";
import GuestOnly, { GuestFormSkeleton } from "./guest-only";

const LoginPage = () => (
  <GuestOnly>
    <Suspense fallback={<GuestFormSkeleton />}>
      <Login />
    </Suspense>
  </GuestOnly>
);

export default LoginPage;
