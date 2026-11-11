"use client";

import { useEffect, useRef, useState } from "react";

interface CredentialResponse { credential: string }

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: CredentialResponse) => void }) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

let sdkPromise: Promise<void> | null = null;

function loadGoogleSDK(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    const fail = () => {
      window.clearTimeout(timer);
      script.remove();
      sdkPromise = null;
      reject(new Error("Không tải được Google. Kiểm tra kết nối mạng hoặc tiện ích chặn nội dung rồi thử lại."));
    };
    const timer = window.setTimeout(fail, 15000);
    script.onerror = fail;
    script.onload = () => {
      if (!window.google?.accounts?.id) { fail(); return; }
      window.clearTimeout(timer);
      resolve();
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export default function GoogleSignInButton({
  onCredential, busy = false,
}: {
  onCredential: (response: CredentialResponse) => Promise<void>;
  busy?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const clientId = process.env.NEXT_PUBLIC_URL_GOOGLE_LOGIN?.trim();
  const configured = Boolean(clientId && /^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(clientId));

  useEffect(() => {
    if (!configured || !clientId) return;
    let active = true;
    setStatus("loading");
    setError("");
    loadGoogleSDK().then(() => {
      if (!active || !container.current || !window.google) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: (response) => { void onCredential(response); } });
      container.current.replaceChildren();
      window.google.accounts.id.renderButton(container.current, {
        type: "standard", theme: "outline", size: "large", text: "signin_with",
        width: Math.min(container.current.parentElement?.clientWidth || 300, 400),
      });
      setStatus("ready");
    }).catch((err: Error) => {
      if (active) { setError(err.message); setStatus("error"); }
    });
    return () => { active = false; };
  }, [clientId, configured, onCredential, attempt]);

  return (
    <div>
      <div ref={container} inert={busy} className={`w-full justify-center ${configured && status === "ready" ? "flex" : "hidden"}`} />
      {!configured ? (
        <p role="status" className="rounded-xl border border-border bg-background p-3 text-center text-sm text-muted-foreground">
          Đăng nhập Google chưa được cấu hình. Bạn có thể đăng nhập bằng email.
        </p>
      ) : status === "loading" ? (
        <p role="status" className="py-3 text-center text-sm text-muted-foreground">
          Đang tải đăng nhập Google...
        </p>
      ) : status === "error" ? (
        <div role="alert" className="rounded-xl border border-warning-border bg-warning-bg p-3 text-sm text-warning-foreground">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="mt-2 font-semibold underline hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm cursor-pointer"
          >
            Thử tải lại Google
          </button>
        </div>
      ) : null}
      {busy && (
        <p role="status" className="mt-2 text-center text-sm text-muted-foreground">
          Đang đăng nhập bằng Google...
        </p>
      )}
    </div>
  );
}
