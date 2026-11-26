import { create } from "zustand";

/**
 * Tracks the in-page login/register modal (intercepting route `@modal`).
 *
 * `open` lets global effects (AuthBootstrap) know that the URL is /login or /register only
 * because a modal is shown on top of the current page, so they must not navigate away.
 * `returnTo` is the last non-auth page the user was on, used by redirect-based flows (GitHub).
 */
type AuthModalState = {
  open: boolean;
  returnTo: string;
  setOpen: (open: boolean) => void;
  setReturnTo: (path: string) => void;
};

export const useAuthModalStore = create<AuthModalState>((set) => ({
  open: false,
  returnTo: "/",
  setOpen: (open) => set({ open }),
  setReturnTo: (returnTo) => set({ returnTo }),
}));

const AUTH_PATHS = new Set(["/login", "/register", "/email_authentication", "/forgot-password", "/reset-password"]);

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.has(pathname);
}
