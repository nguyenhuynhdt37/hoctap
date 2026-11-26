"use client";

import { Modal } from "@/components/ui";
import { useAuthModalStore } from "@/stores/auth-modal";
import { useUserStore } from "@/stores/user";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/**
 * Dialog rendered by the `@modal` intercepting routes: login/register/verify open on top of the
 * current page instead of navigating away from it. Closing goes back in history, which lands on
 * the page that was underneath.
 */
export default function AuthModal({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const setOpen = useAuthModalStore((state) => state.setOpen);

  useEffect(() => {
    setOpen(true);
    // Someone who is already signed in has nothing to do here (stale link, second tab).
    if (useUserStore.getState().user) router.back();
    return () => setOpen(false);
  }, [router, setOpen]);

  return (
    <Modal open onClose={() => router.back()} title={title} size="md" className="rounded-[2rem]">
      {children}
    </Modal>
  );
}
