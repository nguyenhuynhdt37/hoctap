"use client";

import { hasUpdatedUserLayout } from "@/lib/navigation/user-layout";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Footer from "./footer";
import CompactFooter from "./footer/compact-footer";

export function UserPageFrame({ children }: { children: ReactNode }) {
  const updated = hasUpdatedUserLayout(usePathname());

  return (
    <>
      <div data-layout={updated ? "updated" : undefined} className={updated ? "group/user-layout min-h-[55vh] min-w-0" : "user-full-canvas w-full"}>
        {children}
      </div>
      {updated ? <CompactFooter /> : <Footer />}
    </>
  );
}
