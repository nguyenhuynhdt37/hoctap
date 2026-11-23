import EmailAuthentication from "@/components/user/email_authentication";
import { Suspense } from "react";
import GuestOnly, { GuestFormSkeleton } from "../login/guest-only";

const VeryEmailPage = () => (
  <GuestOnly>
    <Suspense fallback={<GuestFormSkeleton />}>
      <EmailAuthentication />
    </Suspense>
  </GuestOnly>
);

export default VeryEmailPage;
