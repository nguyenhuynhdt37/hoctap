import AuthModal from "@/components/user/auth/auth-modal";
import Register from "@/components/user/register";

export default function RegisterModal() {
  return (
    <AuthModal title="Đăng ký">
      <Register variant="modal" />
    </AuthModal>
  );
}
