import { ReactNode, Suspense } from "react";

export default function LecturerRouteGroupLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
