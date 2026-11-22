"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/utils/fetcher/client/axios";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/states";
import { Modal } from "@/components/ui/modal";

export function GitHubConnection({ embedded = false }: { embedded?: boolean }) {
  const Container = embedded ? InlineGitHub : Modal;
  const [state, setState] = useState<{ connected: boolean; login?: string }>({ connected: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [opened, setOpened] = useState(embedded);
  const popup = useRef<Window | null>(null);
  const refresh = useCallback(async () => { const response = await api.get("/agent/github"); setState(response.data); }, []);
  useEffect(() => {
    void refresh().catch(() => undefined);
    const receive = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === popup.current && event.data?.type === "hannes:github-connected") {
        setBusy(false); void refresh().catch(() => setError("Chưa đọc được trạng thái kết nối."));
      }
    };
    window.addEventListener("message", receive);
    return () => { window.removeEventListener("message", receive); };
  }, [refresh]);
  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => { if (popup.current?.closed) { setBusy(false); void refresh().catch(() => undefined); } }, 750);
    return () => clearInterval(timer);
  }, [busy, refresh]);
  const connect = async () => {
    setError("");
    popup.current = window.open("about:blank", "hannes-github-oauth", "width=640,height=760");
    if (!popup.current) { setError("Hãy cho phép cửa sổ xác thực GitHub bật lên."); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/agent/github/connect", {});
      const url = new URL(data.authorize_url);
      if (url.origin !== "https://github.com") throw new Error("Đường dẫn xác thực không hợp lệ");
      popup.current.location.href = url.href;
    } catch (cause) {
      popup.current.close(); setBusy(false);
      const responseError = cause as { response?: { data?: { detail?: string } } };
      setError(responseError.response?.data?.detail || "Chưa mở được xác thực GitHub. Vui lòng thử lại.");
    }
  };
  return <>
    {!embedded && <Button size="sm" variant={state.connected ? "pastel" : "outline"} onClick={() => { setOpened(true); void refresh().catch(() => setError("Chưa đọc được trạng thái GitHub.")); }}>{state.connected ? `GitHub · ${state.login}` : "Kết nối GitHub"}</Button>}
    {opened && <Container open title="Tài khoản GitHub" description="Liên kết riêng với tài khoản Mây Mây đang đăng nhập." onClose={() => setOpened(false)}>
      <div className="space-y-4"><p className="text-sm leading-relaxed text-muted-foreground">{state.connected ? `Đang kết nối @${state.login}. Hannes dùng kết nối này để đọc các repository bạn được phép truy cập.` : "Xác thực trên GitHub để Hannes đọc repository của bạn. Hannes chỉ đọc mã nguồn, không sửa hoặc đẩy commit."}</p>
        <p className="text-sm text-muted-foreground">GitHub OAuth dùng quyền repo, có thể cấp cả quyền ghi ở phía GitHub. Công cụ Hannes chỉ triển khai đọc dữ liệu.</p>
        {error && <Alert variant="warning">{error}</Alert>}
        <div className="flex flex-wrap gap-2"><Button onClick={() => void connect()} disabled={busy} isLoading={busy} loadingText="Đang chờ xác thực…">{state.connected ? "Xác thực tài khoản khác" : "Xác thực với GitHub"}</Button>
          {state.connected && <Button variant="outline" onClick={() => void api.delete("/agent/github").then(refresh).catch(() => setError("Chưa ngắt được kết nối."))}>Ngắt liên kết</Button>}
        </div>
      </div>
    </Container>}
  </>;
}

function InlineGitHub({ children }: React.ComponentProps<typeof Modal>) {
  return <section aria-label="Tài khoản GitHub">{children}</section>;
}
