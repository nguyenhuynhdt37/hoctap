import AuthModal from "@/components/user/auth/auth-modal";
import EmailAuthentication from "@/components/user/email_authentication";
import { Suspense } from "react";

export default function VerifyEmailModal() {
  return (
    <AuthModal title="Xác thực email">
      <Suspense fallback={null}>
        <EmailAuthentication variant="modal" />
      </Suspense>
    </AuthModal>
  );
}
