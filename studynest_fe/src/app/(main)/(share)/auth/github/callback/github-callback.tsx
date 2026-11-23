"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { finishGitHubLogin } from "@/lib/auth/github";

export default function GitHubCallback() {
  const router = useRouter();
  const attempt = useRef<Promise<string> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    attempt.current ??= finishGitHubLogin();
    void attempt.current.then(
      (target) => { if (active) router.replace(target); },
      () => { if (active) setFailed(true); },
    );
    return () => { active = false; };
  }, [router]);

  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Đăng nhập bằng GitHub</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {failed ? (
            <>
              <Alert variant="destructive">Chưa hoàn tất được đăng nhập GitHub. Vui lòng thử lại.</Alert>
              <Button variant="outline" fullWidth onClick={() => router.replace("/login")}>
                Quay lại đăng nhập
              </Button>
            </>
          ) : (
            <p role="status" className="text-sm text-muted-foreground">Đang xác thực với GitHub…</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
