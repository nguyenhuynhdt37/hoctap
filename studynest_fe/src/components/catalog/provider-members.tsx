"use client";
import { useEffect, useState, type FormEvent } from "react";
import useSWR from "swr";
import { Alert, Badge, Button, Input, Select, Textarea } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { providerDate, providerError } from "./provider-utils";
interface Member {
  user_id: string;
  fullname: string;
  email: string;
  status: string;
  granted_at: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
}
interface Candidate {
  id: string;
  fullname: string;
  email: string;
}
interface MembershipEvent {
  id: string;
  user_id: string;
  instructor_name: string;
  actor_name: string | null;
  action: "legacy_imported" | "granted" | "revoked";
  reason: string | null;
  occurred_at: string;
}
export default function ProviderMembers({
  providerId,
}: {
  providerId: string;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revoke, setRevoke] = useState<Member | null>(null);
  const [reason, setReason] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const {
    data,
    error: loadError,
    mutate,
  } = useSWR<{ items: Member[] }>(
    `/admin/providers/${providerId}/members`,
    (url: string) => api.get(url).then((r) => r.data),
  );
  const { data: candidates, error: candidateError } = useSWR<{
    items: Candidate[];
  }>(
    query.length >= 2
      ? `/admin/provider-member-candidates?search=${encodeURIComponent(query)}`
      : null,
    (url: string) => api.get(url).then((r) => r.data),
  );
  const {
    data: history,
    error: historyError,
    mutate: reloadHistory,
  } = useSWR<{ items: MembershipEvent[]; total: number }>(
    `/admin/providers/${providerId}/membership-events?page=${historyPage}&size=10`,
    (url: string) => api.get(url).then((r) => r.data),
  );
  async function update(id: string, status: string, note?: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.put(`/admin/providers/${providerId}/members`, {
        user_id: id,
        status,
        reason: note?.trim() || null,
      });
      setRevoke(null);
      setReason("");
      setUserId("");
      setHistoryPage(1);
      setMessage(
        "Đã cập nhật liên kết. Giảng viên nhận được thông báo trong hệ thống.",
      );
      await Promise.all([mutate(), reloadHistory()]);
    } catch (error) {
      setError(providerError(error));
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (userId) void update(userId, "active");
  }
  return (
    <section className="space-y-5 border-t border-border pt-5">
      <div>
        <h3 className="font-semibold">Giảng viên được liên kết</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin cấp hoặc thu hồi quyền gắn khóa học vào đơn vị. Giảng viên không
          có quyền quản trị đơn vị.
        </p>
      </div>
      {error && <Alert variant="destructive">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
      {loadError ? (
        <Alert variant="destructive">
          Không tải được liên kết.
          <Button variant="outline" onClick={() => mutate()}>
            Thử lại
          </Button>
        </Alert>
      ) : !data ? (
        <p role="status">Đang tải giảng viên…</p>
      ) : data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Chưa có giảng viên được liên kết.
        </p>
      ) : (
        <ul className="space-y-3">
          {data.items.map((member) => (
            <li
              key={member.user_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{member.fullname}</p>
                <p className="break-all text-xs text-muted-foreground">
                  {member.email}
                </p>
                <Badge
                  className="mt-2"
                  variant={member.status === "active" ? "success" : "outline"}
                >
                  {member.status === "active" ? "Đang có quyền" : "Đã thu hồi"}
                </Badge>
                {member.revocation_reason && (
                  <p className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                    Lý do thu hồi: {member.revocation_reason}
                  </p>
                )}
              </div>
              {member.status === "active" && (
                <Button
                  className="relative"
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setRevoke(member);
                    setReason("");
                  }}
                >
                  Thu hồi
                  <span className="sr-only"> quyền của {member.fullname}</span>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {revoke && (
        <Alert variant="warning" title="Xác nhận thu hồi liên kết">
          <div className="space-y-3">
            <p>
              Thu hồi liên kết của {revoke.fullname}? Giảng viên sẽ không thể
              gắn khóa học vào đơn vị này.
            </p>
            <Textarea
              label="Lý do thu hồi"
              required
              value={reason}
              maxLength={2000}
              disabled={busy}
              onChange={(event) => setReason(event.target.value)}
            />
            <div className="flex gap-3">
              <Button
                variant="destructive"
                isLoading={busy}
                loadingText="Đang thu hồi…"
                disabled={!reason.trim()}
                onClick={() => update(revoke.user_id, "inactive", reason)}
              >
                Xác nhận thu hồi
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setRevoke(null)}
              >
                Hủy
              </Button>
            </div>
          </div>
        </Alert>
      )}
      <form
        onSubmit={submit}
        className="space-y-3 rounded-xl bg-background p-4"
      >
        <h4 className="text-sm font-medium">Cấp liên kết giảng viên</h4>
        <Input
          label="Tìm giảng viên theo tên hoặc email"
          value={search}
          disabled={busy}
          maxLength={160}
          onChange={(event) => {
            setSearch(event.target.value);
            setUserId("");
          }}
          hint="Nhập ít nhất 2 ký tự. Tối đa 20 kết quả mỗi lần tìm."
        />
        {candidateError && (
          <Alert variant="destructive">
            Không tìm được tài khoản. Vui lòng thử lại.
          </Alert>
        )}
        <Select
          label="Tài khoản giảng viên"
          required
          value={userId}
          disabled={busy || !candidates}
          onChange={(event) => setUserId(event.target.value)}
        >
          <option value="">Chọn giảng viên</option>
          {candidates?.items.map((user) => (
            <option key={user.id} value={user.id}>
              {user.fullname} · {user.email}
            </option>
          ))}
        </Select>
        <Button
          type="submit"
          isLoading={busy}
          loadingText="Đang cấp…"
          disabled={!userId}
        >
          Cấp liên kết
        </Button>
      </form>
      <div className="space-y-3 border-t border-border pt-5">
        <h4 className="font-semibold">Lịch sử liên kết giảng viên</h4>
        {historyError ? (
          <Alert variant="destructive">
            Không tải được lịch sử.
            <Button variant="outline" onClick={() => reloadHistory()}>
              Thử lại
            </Button>
          </Alert>
        ) : !history ? (
          <p role="status">Đang tải lịch sử…</p>
        ) : history.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có thay đổi liên kết.
          </p>
        ) : (
          <ol className="space-y-3">
            {history.items.map((event) => (
              <li
                key={event.id}
                className="space-y-1 rounded-xl border border-border p-3 text-sm"
              >
                <p className="font-medium">
                  {event.action === "granted"
                    ? "Cấp liên kết"
                    : event.action === "revoked"
                      ? "Thu hồi liên kết"
                      : "Chuyển dữ liệu liên kết cũ"}{" "}
                  · {event.instructor_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {providerDate(event.occurred_at)} ·{" "}
                  {event.actor_name ||
                    "Không có thông tin người thực hiện trước chuyển đổi"}
                </p>
                {event.reason && (
                  <p className="whitespace-pre-wrap break-words text-muted-foreground">
                    {event.reason}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
        {history && history.total > 10 && (
          <nav
            className="flex items-center justify-between gap-2"
            aria-label="Phân trang lịch sử liên kết"
          >
            <Button
              variant="outline"
              size="sm"
              disabled={historyPage <= 1}
              onClick={() => setHistoryPage(historyPage - 1)}
            >
              Trước
            </Button>
            <span className="text-xs">
              Trang {historyPage} / {Math.ceil(history.total / 10)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={historyPage * 10 >= history.total}
              onClick={() => setHistoryPage(historyPage + 1)}
            >
              Sau
            </Button>
          </nav>
        )}
      </div>
    </section>
  );
}
