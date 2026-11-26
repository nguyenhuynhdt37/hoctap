import AuthModal from "@/components/user/auth/auth-modal";
import Login from "@/components/user/login";
import { Suspense } from "react";

// Soft navigations to /login show the form in a dialog over the current page.
// Opening /login directly (or reloading) still renders the full page in (share)/login.
export default function LoginModal() {
  return (
    <AuthModal title="Đăng nhập">
      <Suspense fallback={null}>
        <Login variant="modal" />
      </Suspense>
    </AuthModal>
  );
}
