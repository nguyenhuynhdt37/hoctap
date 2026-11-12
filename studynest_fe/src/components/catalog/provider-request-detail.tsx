"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Alert,
  Badge,
  Button,
  Modal,
  Input,
  Textarea,
  Select,
  Skeleton,
} from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import type { Provider } from "@/types/catalog";
import {
  providerTypeLabels,
  requestStatusLabels,
  type ProviderPage,
  type ProviderRequest,
} from "@/types/provider";
import { providerDate, providerError } from "./provider-utils";

export default function ProviderRequestDetail({
  id,
  admin,
  onClose,
  onChanged,
}: {
  id: string;
  admin: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const base = admin ? "/admin" : "/lecturer";
  const {
    data,
    error: loadError,
    mutate,
  } = useSWR<ProviderRequest>(
    `${base}/provider-requests/${id}`,
    (url: string) => api.get(url).then((r) => r.data),
  );
  const [note, setNote] = useState("");
  const [linkExisting, setLinkExisting] = useState(false);
  const [search, setSearch] = useState("");
  const [providerId, setProviderId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState<
    "approved" | "rejected" | "cancel" | null
  >(null);
  const { data: providers, error: providerLoadError } = useSWR<
    ProviderPage<Provider>
  >(
    admin && linkExisting
      ? `/admin/providers?size=100&search=${encodeURIComponent(search)}`
      : null,
    (url: string) => api.get(url).then((r) => r.data),
  );
  async function execute() {
    if (!action || busy) return;
    setBusy(true);
    setError("");
    try {
      if (action === "cancel")
        await api.post(`/lecturer/provider-requests/${id}/cancel`);
      else
        await api.post(`/admin/provider-requests/${id}/decision`, {
          decision: action,
          note: note.trim(),
          provider_id:
            action === "approved" && linkExisting ? providerId : null,
        });
      setAction(null);
      await mutate();
      onChanged();
    } catch (error) {
      setError(providerError(error));
      void mutate();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      title="Chi tiết yêu cầu đơn vị"
      onClose={() => {
        if (!busy) onClose();
      }}
      size="lg"
    >
      {loadError ? (
        <Alert variant="destructive" title="Không tải được yêu cầu">
          <p>
            Yêu cầu không tồn tại, bạn không có quyền xem hoặc dịch vụ đang gián
            đoạn.
          </p>
          <Button className="mt-3" variant="outline" onClick={() => mutate()}>
            Thử lại
          </Button>
        </Alert>
      ) : !data ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="space-y-5">
          {error && (
            <Alert variant="destructive" title="Chưa xử lý được yêu cầu">
              {error}
            </Alert>
          )}
          <div>
            <h3 className="text-lg font-semibold">{data.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {providerTypeLabels[data.provider_type]} ·{" "}
              {providerDate(data.created_at)}
            </p>
            <Badge
              className="mt-3"
              variant={
                data.status === "approved"
                  ? "success"
                  : data.status === "rejected"
                    ? "destructive"
                    : "info"
              }
            >
              {requestStatusLabels[data.status]}
            </Badge>
          </div>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Người gửi</dt>
              <dd className="mt-1 font-medium">{data.requester.fullname}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email liên hệ</dt>
              <dd className="mt-1 break-all">{data.contact_email}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Giới thiệu</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words">
                {data.description}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Lý do đề nghị</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words">
                {data.reason}
              </dd>
            </div>
            {data.website_url && (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Website / minh chứng</dt>
                <dd className="mt-1 break-all">
                  <a
                    className="text-primary underline"
                    href={data.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {data.website_url}
                  </a>
                </dd>
              </div>
            )}
            {data.decided_at && (
              <div>
                <dt className="text-muted-foreground">
                  {data.status === "cancelled" ? "Đã hủy lúc" : "Xét duyệt lúc"}
                </dt>
                <dd className="mt-1">
                  {providerDate(data.decided_at)}
                  {data.reviewer && (
                    <span className="block">Bởi {data.reviewer.fullname}</span>
                  )}
                </dd>
              </div>
            )}
            {data.review_note && (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">
                  Ghi chú / lý do của admin
                </dt>
                <dd className="mt-1 whitespace-pre-wrap break-words">
                  {data.review_note}
                </dd>
              </div>
            )}
          </dl>
          {data.provider && (
            <Alert variant="success" title="Đơn vị đã được cấp quyền">
              <Link
                className="underline"
                href={`/providers/${data.provider.slug}`}
              >
                {data.provider.name}
              </Link>
              <p className="mt-1">
                Bạn có thể chọn đơn vị này trong phần phân loại khóa học. Quy
                định mở bán và đối soát vẫn áp dụng.
              </p>
            </Alert>
          )}
          {data.status === "pending" && admin && (
            <div className="space-y-4 border-t border-border pt-4">
              <Textarea
                label="Ghi chú xét duyệt"
                hint="Bắt buộc khi từ chối. Người gửi sẽ nhận được nội dung này."
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setAction(null);
                }}
                maxLength={2000}
                disabled={busy}
              />
              <Select
                label="Cách duyệt"
                value={linkExisting ? "existing" : "new"}
                disabled={busy}
                onChange={(e) => {
                  setLinkExisting(e.target.value === "existing");
                  setProviderId("");
                  setAction(null);
                }}
              >
                <option value="new">Tạo đơn vị mới từ yêu cầu</option>
                <option value="existing">Liên kết vào đơn vị đã có</option>
              </Select>
              {linkExisting && (
                <>
                  <Input
                    label="Tìm đơn vị hiện có"
                    value={search}
                    disabled={busy}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setProviderId("");
                    }}
                  />
                  {providerLoadError && (
                    <Alert variant="destructive">
                      Không tải được danh sách đơn vị.
                    </Alert>
                  )}
                  <Select
                    label="Đơn vị đã xác minh"
                    value={providerId}
                    disabled={busy}
                    onChange={(e) => {
                      setProviderId(e.target.value);
                      setAction(null);
                    }}
                  >
                    <option value="">Chọn đơn vị</option>
                    {providers?.items
                      .filter(
                        (p) =>
                          p.is_active && p.verification_status === "verified",
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </Select>
                </>
              )}
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={busy || (linkExisting && !providerId)}
                  onClick={() => setAction("approved")}
                >
                  Duyệt yêu cầu
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy || !note.trim()}
                  onClick={() => setAction("rejected")}
                >
                  Từ chối
                </Button>
              </div>
            </div>
          )}
          {data.status === "pending" && !admin && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setAction("cancel")}
            >
              Hủy yêu cầu
            </Button>
          )}
          {action && (
            <Alert title="Xác nhận xử lý" variant="warning">
              <p>
                {action === "approved"
                  ? "Duyệt yêu cầu và cấp quyền giảng dạy tại đơn vị đã chọn cho người gửi?"
                  : action === "rejected"
                    ? "Từ chối yêu cầu và gửi lý do cho giảng viên?"
                    : "Hủy yêu cầu này? Bạn có thể gửi lại yêu cầu mới sau đó."}
              </p>
              <div className="mt-3 flex gap-3">
                <Button
                  isLoading={busy}
                  loadingText="Đang xử lý…"
                  onClick={execute}
                >
                  Xác nhận
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setAction(null)}
                >
                  Quay lại
                </Button>
              </div>
            </Alert>
          )}
        </div>
      )}
    </Modal>
  );
}
