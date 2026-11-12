"use client";
import { useEffect, useState, type FormEvent } from "react";
import useSWR, { useSWRConfig } from "swr";
import toast from "react-hot-toast";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Select,
  Textarea,
} from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import type { Provider } from "@/types/catalog";
import {
  requestStatusLabels,
  type ProviderPage,
  type ProviderRequestStatus,
} from "@/types/provider";
import { providerDate, providerError } from "./provider-utils";
import { useRealtimeNotiStore } from "@/stores/notifications";

interface JoinRequest {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_verification: string;
  requester_name: string;
  position: string;
  work_email: string | null;
  evidence: string;
  status: ProviderRequestStatus;
  review_note: string | null;
  created_at: string;
  decided_at: string | null;
}

export default function ProviderJoins({
  admin,
  selected,
  onClose,
}: {
  admin: boolean;
  selected: Provider | null;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(admin ? "pending" : "");
  const [sort, setSort] = useState("newest");
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [reviewing, setReviewing] = useState<JoinRequest | null>(null);
  useEffect(() => setFormError(""), [selected?.id, reviewing?.id]);
  const { mutate } = useSWRConfig();
  const scope = admin ? "/admin" : "/lecturer";
  const key = `${scope}/provider-join-requests?page=${page}&size=12&search=${encodeURIComponent(query)}&sort=${sort}${status ? `&status=${status}` : ""}`;
  const { data, error, isLoading } = useSWR<ProviderPage<JoinRequest>>(
    key,
    (url: string) => api.get(url).then((r) => r.data),
  );
  const latest = useRealtimeNotiStore(
    (state) =>
      state.buckets[admin ? "ADMIN" : "LECTURER"]?.top10.find(
        (n) => n.type === "provider",
      )?.id,
  );
  function refresh() {
    void mutate(
      (k) =>
        typeof k === "string" &&
        /provider-join-requests|provider-directory|\/providers/.test(k),
    );
  }
  useEffect(() => {
    void mutate(key);
  }, [latest, key, mutate]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setFormError("");
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await api.post("/lecturer/provider-join-requests", {
        provider_id: selected?.id,
        position: String(form.get("position")),
        work_email: String(form.get("work_email") || "") || null,
        evidence: String(form.get("evidence")),
        current_employment_confirmed: form.get("confirmed") === "on",
      });
      toast.success("Đã gửi yêu cầu xác nhận công tác");
      onClose();
      setPage(1);
      refresh();
    } catch (error) {
      setFormError(providerError(error));
    } finally {
      setBusy(false);
    }
  }
  async function decide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setFormError("");
    const form = new FormData(event.currentTarget);
    const decision = String(form.get("decision"));
    if (decision === "approved" && form.get("checked") !== "on") {
      setFormError("Cần xác nhận đã đối chiếu thông tin công tác");
      return;
    }
    setBusy(true);
    try {
      await api.post(
        `/admin/provider-join-requests/${reviewing?.id}/decision`,
        {
          decision,
          review_note: String(form.get("review_note")),
          employment_checked: form.get("checked") === "on",
        },
      );
      toast.success(
        decision === "approved"
          ? "Đã duyệt và cấp liên kết"
          : "Đã từ chối yêu cầu",
      );
      setReviewing(null);
      refresh();
    } catch (error) {
      setFormError(providerError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4">
      <Alert
        variant="info"
        title={
          admin
            ? "Đối chiếu công tác trước khi cấp liên kết"
            : "Gia nhập đúng đơn vị bạn đang công tác"
        }
      >
        {admin
          ? "Kiểm tra danh sách nhân sự, email cơ quan hoặc liên hệ chính thức. Thông tin minh chứng chỉ hiển thị cho admin và người gửi."
          : "Sau khi được admin duyệt, bạn được liên kết với đơn vị, xuất hiện trong danh sách giảng viên phù hợp và gắn đơn vị cho khóa học theo quyền hiện có. Liên kết không cấp quyền quản trị hoặc tự thay đổi quyền bán khóa học, doanh thu và chi trả."}
      </Alert>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input
          label="Tìm yêu cầu gia nhập"
          placeholder="Đơn vị, giảng viên hoặc môn giảng dạy"
          maxLength={160}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          label="Trạng thái yêu cầu gia nhập"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(requestStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          label="Sắp xếp yêu cầu gia nhập"
          value={sort}
          onChange={(event) => {
            setSort(event.target.value);
            setPage(1);
          }}
        >
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="provider_name">Tên đơn vị A → Z</option>
        </Select>
      </div>
      {isLoading ? (
        <p role="status">Đang tải yêu cầu gia nhập…</p>
      ) : error ? (
        <Alert variant="destructive" title="Không tải được yêu cầu">
          <Button variant="outline" onClick={() => void mutate(key)}>
            Thử lại
          </Button>
        </Alert>
      ) : !data?.items.length ? (
        <EmptyState
          title="Chưa có yêu cầu gia nhập"
          description="Giảng viên chọn đơn vị trong danh sách rồi gửi yêu cầu xác nhận công tác."
        />
      ) : (
        data.items.map((item) => (
          <Card key={item.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{item.provider_name}</h2>
                <p className="text-sm text-muted-foreground">
                  {item.requester_name} · {item.position}
                </p>
              </div>
              <Badge variant={item.status === "approved" ? "success" : "info"}>
                {requestStatusLabels[item.status]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Gửi {providerDate(item.created_at)}
              {item.decided_at
                ? ` · Xử lý ${providerDate(item.decided_at)}`
                : ""}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm">
              {item.review_note ||
                "Đang chờ admin đối chiếu thông tin công tác."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReviewing(item)}
              >
                Xem yêu cầu gia nhập
                <span className="sr-only"> {item.provider_name}</span>
              </Button>
              {!admin && item.status === "pending" && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await api.post(
                        `/lecturer/provider-join-requests/${item.id}/cancel`,
                      );
                      toast.success("Đã hủy yêu cầu gia nhập");
                      refresh();
                    } catch (error) {
                      toast.error(providerError(error));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Hủy yêu cầu gia nhập
                </Button>
              )}
            </div>
          </Card>
        ))
      )}
      {data && data.total > 12 && (
        <nav
          aria-label="Phân trang yêu cầu gia nhập"
          className="flex items-center justify-between gap-3"
        >
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Trang trước
          </Button>
          <span>
            {page} / {Math.ceil(data.total / 12)}
          </span>
          <Button
            variant="outline"
            disabled={page * 12 >= data.total}
            onClick={() => setPage(page + 1)}
          >
            Trang sau
          </Button>
        </nav>
      )}
      {selected && (
        <Modal
          open
          title="Xin gia nhập đơn vị công tác"
          onClose={() => {
            if (!busy) onClose();
          }}
        >
          <form onSubmit={submit} className="space-y-4">
            {formError && (
              <Alert variant="destructive" title="Chưa gửi được yêu cầu">
                {formError}
              </Alert>
            )}
            <p className="font-semibold">{selected.name}</p>
            <p className="text-sm text-muted-foreground">
              {selected.address || selected.province}
            </p>
            <Input
              name="position"
              label="Vị trí / môn giảng dạy tại đơn vị"
              required
              minLength={3}
              maxLength={160}
            />
            <Input
              name="work_email"
              type="email"
              label="Email cơ quan (nếu có)"
              maxLength={254}
            />
            <Textarea
              name="evidence"
              label="Thông tin đối chiếu công tác"
              required
              minLength={30}
              maxLength={4000}
              hint="Ví dụ: đường dẫn trang nhân sự chính thức, tổ chuyên môn và cách liên hệ đơn vị. Không gửi giấy tờ định danh hoặc dữ liệu học sinh."
            />
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="confirmed"
                required
                className="mt-1"
              />
              Tôi xác nhận đang công tác tại đơn vị này và thông tin cung cấp là
              chính xác.
            </label>
            <Button type="submit" isLoading={busy} loadingText="Đang gửi…">
              Gửi yêu cầu gia nhập
            </Button>
          </form>
        </Modal>
      )}
      {reviewing && (
        <Modal
          open
          title="Thông tin yêu cầu gia nhập"
          onClose={() => {
            if (!busy) setReviewing(null);
          }}
        >
          <div className="space-y-4">
            <h3 className="font-semibold">{reviewing.provider_name}</h3>
            <p>
              {reviewing.requester_name} · {reviewing.position}
            </p>
            {reviewing.work_email && (
              <p className="break-words text-sm">
                Email cơ quan: {reviewing.work_email}
              </p>
            )}
            <p className="whitespace-pre-wrap break-words text-sm">
              {reviewing.evidence}
            </p>
            {admin && reviewing.status === "pending" ? (
              <form onSubmit={decide} className="space-y-4">
                {formError && (
                  <Alert variant="destructive" title="Chưa xử lý được yêu cầu">
                    {formError}
                  </Alert>
                )}
                <Textarea
                  name="review_note"
                  label="Kết quả đối chiếu / lý do xét duyệt"
                  required
                  minLength={10}
                  maxLength={2000}
                />
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="checked" className="mt-1" />
                  Tôi đã đối chiếu minh chứng và xác nhận giảng viên đang công
                  tác tại đơn vị.
                </label>
                <label className="block space-y-2 text-sm">
                  <span>Quyết định gia nhập</span>
                  <select
                    name="decision"
                    className="w-full rounded-xl border border-border bg-surface p-3"
                    defaultValue="approved"
                  >
                    <option value="approved">Duyệt và cấp liên kết</option>
                    <option value="rejected">Từ chối</option>
                  </select>
                </label>
                <Button
                  type="submit"
                  isLoading={busy}
                  loadingText="Đang xử lý…"
                >
                  Xác nhận xét duyệt gia nhập
                </Button>
              </form>
            ) : (
              reviewing.review_note && (
                <Alert variant="info" title="Kết quả xét duyệt">
                  {reviewing.review_note}
                </Alert>
              )
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}
