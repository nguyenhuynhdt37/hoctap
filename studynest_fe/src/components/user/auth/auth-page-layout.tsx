import Header from "@/components/user/header";
import type { ReactNode } from "react";

export default function AuthPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col [--auth-screen-min-height:0px]">
      <Header />
      {children}
    </div>
  );
}
