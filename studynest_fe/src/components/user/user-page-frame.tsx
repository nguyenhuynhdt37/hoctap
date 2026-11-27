import type { ReactNode } from "react";
import CompactFooter from "./footer/compact-footer";

/** Khung nội dung chuẩn của khu vực người dùng: cùng bề rộng với header và footer. */
export function UserPageFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <div data-layout="updated" className="group/user-layout min-h-[55vh] min-w-0">
        {children}
      </div>
      <CompactFooter />
    </>
  );
}
