"use client";

import { useState } from "react";
import { FaGithub } from "react-icons/fa";
import { Alert, Button } from "@/components/ui";
import { startGitHubLogin } from "@/lib/auth/github";

export default function GitHubSignInButton({ redirectTo = "/", callbackError }: {
  redirectTo?: string;
  callbackError?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const signIn = async () => {
    setBusy(true);
    setError("");
    try {
      const url = await startGitHubLogin(redirectTo);
      window.location.assign(url.href);
    } catch (cause: unknown) {
      const detail = (cause as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Chưa kết nối được GitHub. Vui lòng thử lại.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button variant="outline" fullWidth size="lg" leftIcon={<FaGithub />} isLoading={busy}
        loadingText="Đang mở GitHub…" onClick={signIn}>
        Tiếp tục với GitHub
      </Button>
      {(error || callbackError) && <Alert variant="destructive">{error || callbackError}</Alert>}
    </div>
  );
}
