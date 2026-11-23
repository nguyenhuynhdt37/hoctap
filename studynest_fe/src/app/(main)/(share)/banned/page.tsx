import type { Metadata } from "next";
import BannedNotice from "./banned-notice";

export const metadata: Metadata = {
  title: "Tài khoản bị tạm khóa | Mây Mây",
  robots: { index: false, follow: false },
};

export default function BannedPage() {
  return <BannedNotice />;
}
