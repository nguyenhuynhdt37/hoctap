import Register from "@/components/user/register";
import GuestOnly from "../login/guest-only";

const RegisterPage = () => (
  <GuestOnly>
    <Register />
  </GuestOnly>
);

export default RegisterPage;
