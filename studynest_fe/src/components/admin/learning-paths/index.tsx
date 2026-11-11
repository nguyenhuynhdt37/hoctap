"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useSWR from "swr";
import api from "@/lib/utils/fetcher/client/axios";
import { Button, Badge, Input, Modal } from "@/components/ui";
import type {
  LearningPath,
  Bundle,
  PageResult,
  PathDraft,
  BundleDraft,
} from "@/types/learning-paths";
import {
  fetchLearning,
  Loading,
  LoadError,
  message,
  price,
  control,
} from "@/components/learning-paths/shared";
import CatalogAdminNav from "@/components/admin/catalog/catalog-nav";
import PathEditor, { emptyPath } from "./path-editor";
import BundleEditor, { emptyBundle } from "./bundle-editor";
import CouponManager from "./coupon-manager";
import ProficiencyEditor from "./proficiency-editor";

type Item = LearningPath | Bundle;
type Editor =
  | { kind: "path"; draft: PathDraft; versionId?: string }
  | { kind: "bundle"; draft: BundleDraft; versionId?: string };
const states = {
  draft: "Bản nháp",
  published: "Đã xuất bản",
  archived: "Đã lưu trữ",
};
function rootId(item: Item) {
  return "path_id" in item ? item.path_id : item.bundle_id;
}
function blockers(item: Item) {
  const issues: string[] = [];
  if (item.description.trim().length < 20)
    issues.push("Bổ sung giới thiệu ít nhất 20 ký tự.");
  if ("path_id" in item) {
    if (!item.stages?.length) issues.push("Thêm ít nhất một chặng học.");
    item.stages?.forEach((s) => {
      if (!s.groups.length || s.groups.some((g) => !g.options.length))
        issues.push(`Chặng “${s.title}” cần học phần và khóa học.`);
      if (s.groups.some((g) => g.options.some((o) => !o.available)))
        issues.push(`Chặng “${s.title}” có khóa chưa đủ điều kiện công khai.`);
    });
  } else {
    if (!item.items?.length) issues.push("Chọn ít nhất một khóa cho combo.");
    if (item.items?.some((i) => !i.available))
      issues.push("Có khóa chưa đủ điều kiện công khai.");
    if (
      Number(item.price) >
      (item.items ?? []).reduce((sum, i) => sum + Number(i.list_price), 0)
    )
      issues.push("Giá combo đang vượt tổng giá tham chiếu.");
  }
  return issues;
}

export default function PathBundleAdmin({
  kind,
}: {
  kind: "paths" | "bundles";
}) {
  const endpoint = kind === "paths" ? "learning-paths" : "bundles";
  const title = kind === "paths" ? "Lộ trình học tập" : "Combo & mã ưu đãi";
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [visibility, setVisibility] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [editorState, setEditorState] = useState({ dirty: false, busy: false });
  const [discard, setDiscard] = useState(false);
  const [preview, setPreview] = useState<Item | null>(null);
  const [history, setHistory] = useState<Item | null>(null);
  const [coupons, setCoupons] = useState<Bundle | null>(null);
  const [couponState, setCouponState] = useState({ dirty: false, busy: false });
  const [couponDiscard, setCouponDiscard] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(input);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);
  const query = new URLSearchParams({
    page: String(page),
    limit: "12",
    keyword,
  });
  if (status) query.set("status", status);
  if (visibility) query.set("active", visibility);
  const { data, error, mutate } = useSWR<PageResult<Item>>(
    `/admin/${endpoint}?${query}`,
    fetchLearning,
  );
  const {
    data: revisions,
    error: revisionError,
    mutate: reloadRevisions,
  } = useSWR<PageResult<Item>>(
    history
      ? `/admin/${endpoint}?history_id=${rootId(history)}&limit=100`
      : null,
    fetchLearning,
  );
  async function view(item: Item) {
    setBusy(true);
    setFailure("");
    try {
      const { data } = await api.get<Item>(
        `/admin/${endpoint}/versions/${item.id}`,
      );
      setHistory(null);
      setPreview(data);
    } catch (error) {
      setFailure(message(error));
    } finally {
      setBusy(false);
    }
  }
  async function edit(item: Item, newVersion = false) {
    setBusy(true);
    setFailure("");
    try {
      const { data } = await api.get<Item>(
        `/admin/${endpoint}/versions/${item.id}`,
      );
      const versionId =
        !newVersion && data.status === "draft" ? data.id : undefined;
      if ("path_id" in data)
        setEditor({
          kind: "path",
          versionId,
          draft: {
            path_id: data.path_id,
            slug: data.slug,
            subject_id: data.subject_id,
            title: data.title,
            description: data.description,
            stages: (data.stages ?? []).map((s) => ({
              title: s.title,
              description: s.description,
              target_level_id: s.target_level_id,
              groups: s.groups.map((g) => ({
                title: g.title,
                course_ids: g.options.map((o) => o.course_id),
              })),
            })),
          },
        });
      else
        setEditor({
          kind: "bundle",
          versionId,
          draft: {
            bundle_id: data.bundle_id,
            slug: data.slug,
            title: data.title,
            description: data.description,
            price: String(data.price),
            course_ids: (data.items ?? []).map((i) => i.course_id),
            path_version_id: data.path_version_id,
          },
        });
      setHistory(null);
      setPreview(null);
      setDiscard(false);
      setEditorState({ dirty: false, busy: false });
    } catch (error) {
      setFailure(message(error));
    } finally {
      setBusy(false);
    }
  }
  function closeEditor() {
    if (editorState.busy) return;
    if (editorState.dirty) {
      setDiscard(true);
      return;
    }
    setEditor(null);
  }
  function saved(item: Item) {
    setEditor(null);
    setPreview(item);
    setEditorState({ dirty: false, busy: false });
    setDiscard(false);
    setNotice(
      `Đã lưu “${item.title}” · /${kind === "paths" ? "lo-trinh" : "combo"}/${item.slug}`,
    );
    setPage(1);
    setStatus("");
    setVisibility("");
    setInput("");
    setKeyword("");
    mutate();
  }
  async function publish() {
    if (!preview || busy) return;
    setBusy(true);
    setFailure("");
    try {
      await api.post(`/admin/${endpoint}/versions/${preview.id}/publish`);
      setNotice(
        `Đã xuất bản “${preview.title}”. ${preview.is_active ? "Nội dung đã hiển thị công khai." : "Mục này đang tắt hiển thị; bạn có thể bật trong danh sách."}`,
      );
      setPreview(null);
      await mutate();
    } catch (error) {
      setFailure(message(error));
    } finally {
      setBusy(false);
    }
  }
  async function toggle(item: Item) {
    setBusy(true);
    setFailure("");
    try {
      await api.put(
        `/admin/${endpoint}/${rootId(item)}/active?active=${!item.is_active}`,
      );
      await mutate();
      setNotice(
        item.is_active
          ? `Đã tắt hiển thị “${item.title}”. Người đã học hoặc mua vẫn giữ quyền của họ.`
          : `Đã bật hiển thị “${item.title}”. Chỉ bản đã xuất bản được công khai.`,
      );
    } catch (error) {
      setFailure(message(error));
    } finally {
      setBusy(false);
    }
  }
  const isRevision =
    editor?.kind === "path"
      ? !!editor.draft.path_id
      : editor?.kind === "bundle"
        ? !!editor.draft.bundle_id
        : false;
  const issues = preview?.status === "draft" ? blockers(preview) : [];
  return (
    <main className="space-y-6 p-4 text-foreground sm:p-8">
      <CatalogAdminNav />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {kind === "paths"
              ? "Soạn chặng học, tuyển chọn khóa và duyệt trước khi xuất bản. Bạn có thể lưu bản nháp khi chưa đủ nội dung."
              : "Quản lý danh sách khóa, giá bán, hiển thị và mã ưu đãi riêng cho từng combo tại cùng một nơi."}
          </p>
        </div>
        <Button
          onClick={() => {
            setFailure("");
            setDiscard(false);
            setEditorState({ dirty: false, busy: false });
            setEditor(
              kind === "paths"
                ? { kind: "path", draft: emptyPath() }
                : { kind: "bundle", draft: emptyBundle() },
            );
          }}
        >
          ＋ Tạo {kind === "paths" ? "lộ trình" : "combo"}
        </Button>
      </header>
      {notice && (
        <p
          role="status"
          className="break-words rounded-xl bg-success-bg p-4 text-sm text-success-foreground"
        >
          {notice}
        </p>
      )}
      {failure && !preview && (
        <p
          role="alert"
          className="rounded-xl bg-destructive-bg p-4 text-sm text-destructive-foreground"
        >
          {failure}
        </p>
      )}
      <section className="grid items-end gap-4 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-[minmax(180px,1fr)_180px_180px]">
        <Input
          label={`Tìm ${kind === "paths" ? "lộ trình" : "combo"}`}
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập tên…"
        />
        <label className="space-y-2 text-sm">
          <span className="font-medium">Xuất bản</span>
          <select
            className={control}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="draft">Bản nháp</option>
            <option value="published">Đã xuất bản</option>
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Hiển thị</span>
          <select
            className={control}
            value={visibility}
            onChange={(e) => {
              setVisibility(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Bật và tắt</option>
            <option value="true">Đang bật</option>
            <option value="false">Đang tắt</option>
          </select>
        </label>
      </section>
      {error ? (
        <LoadError error={error} retry={() => mutate()} />
      ) : !data ? (
        <Loading />
      ) : !data.items.length ? (
        <section className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <h2 className="font-semibold">
            {input || status || visibility
              ? "Không có kết quả phù hợp"
              : `Chưa có ${kind === "paths" ? "lộ trình" : "combo"} chính thức`}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {input || status || visibility
              ? "Thử đổi từ khóa hoặc bộ lọc."
              : "Tạo bản nháp, bổ sung nội dung rồi duyệt trước khi công khai."}
          </p>
          {(input || status || visibility) && (
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => {
                setInput("");
                setStatus("");
                setVisibility("");
                setPage(1);
              }}
            >
              Xóa bộ lọc
            </Button>
          )}
        </section>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-surface">
            <table className="block w-full text-left text-sm lg:table">
              <thead className="sr-only bg-primary-light text-foreground lg:not-sr-only lg:table-header-group">
                <tr>
                  <th className="p-4">
                    {kind === "paths" ? "Lộ trình" : "Combo"}
                  </th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4">Hiển thị</th>
                  <th className="p-4">Quản lý</th>
                </tr>
              </thead>
              <tbody className="block lg:table-row-group">
                {data.items.map((item) => (
                  <tr
                    key={item.id}
                    className="grid min-w-0 grid-cols-2 border-t border-border align-top first:border-t-0 lg:table-row lg:first:border-t"
                  >
                    <td className="col-span-2 min-w-0 p-4 lg:max-w-sm">
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        /{kind === "paths" ? "lo-trinh" : "combo"}/{item.slug}
                      </p>
                      {"price" in item && (
                        <p className="mt-2 font-medium text-primary">
                          {price(item.price)}
                        </p>
                      )}
                    </td>
                    <td className="min-w-0 p-4">
                      <p className="mb-2 text-xs text-muted-foreground lg:hidden">Trạng thái xuất bản</p>
                      <Badge
                        variant={
                          item.status === "published" ? "success" : "outline"
                        }
                      >
                        {states[item.status]}
                      </Badge>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Phiên bản {item.version}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => setHistory(item)}
                      >
                        Lịch sử
                      </Button>
                    </td>
                    <td className="min-w-0 p-4">
                      <p className="mb-2 text-xs text-muted-foreground lg:hidden">Hiển thị công khai</p>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!item.is_active}
                        aria-label={`Hiển thị ${item.title}`}
                        disabled={busy}
                        onClick={() => toggle(item)}
                        className="inline-flex items-center gap-2 rounded-lg p-1 text-sm disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <span
                          className={`relative h-6 w-11 rounded-full transition-colors ${item.is_active ? "bg-primary" : "bg-muted-foreground"}`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface transition-transform ${item.is_active ? "translate-x-5" : "translate-x-0.5"} left-0`}
                          />
                        </span>
                        {item.is_active ? "Bật" : "Tắt"}
                      </button>
                      <p className="mt-2 max-w-36 text-xs text-muted-foreground">
                        Áp dụng cho bản đã xuất bản.
                      </p>
                    </td>
                    <td className="col-span-2 min-w-0 p-4">
                      <div className="flex max-w-xs flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => edit(item)}
                        >
                          {item.status === "draft"
                            ? "Sửa bản nháp"
                            : "Tạo phiên bản mới"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => view(item)}
                        >
                          Xem &{" "}
                          {item.status === "draft" ? "xuất bản" : "kiểm tra"}
                        </Button>
                        {"bundle_id" in item && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => {
                              setCouponDiscard(false);
                              setCouponState({ dirty: false, busy: false });
                              setCoupons(item);
                            }}
                          >
                            Mã ưu đãi
                          </Button>
                        )}
                        {item.status === "published" && item.is_active && (
                          <Link
                            href={`/${kind === "paths" ? "lo-trinh" : "combo"}/${item.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg px-3 py-2 text-xs font-medium text-primary underline"
                          >
                            Xem trang bán ↗
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {data.total} mục · Trang {page}/
              {Math.max(1, Math.ceil(data.total / 12))}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Trang trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 12 >= data.total}
                onClick={() => setPage(page + 1)}
              >
                Trang sau
              </Button>
            </div>
          </div>
        </>
      )}
      {kind === "paths" && (
        <details
          className="rounded-2xl border border-border bg-surface p-5"
          onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
        >
          <summary className="cursor-pointer font-medium">
            Nâng cao · Khung trình độ và duyệt nhãn khóa học
          </summary>
          <div className="mt-5">{advancedOpen && <ProficiencyEditor />}</div>
        </details>
      )}
      <Modal
        open={!!editor}
        onClose={closeEditor}
        closeOnOverlayClick={false}
        title={`${editor?.versionId ? "Sửa bản nháp" : isRevision ? "Tạo phiên bản mới" : "Tạo mới"} · ${kind === "paths" ? "Lộ trình" : "Combo"}`}
        description={
          discard
            ? "Bạn có thay đổi chưa lưu. Tiếp tục chỉnh sửa hoặc bỏ thay đổi để đóng."
            : "Lưu bản nháp trước, kiểm tra và xuất bản sau."
        }
        size="xl"
        footer={
          discard ? (
            <>
              <Button variant="outline" onClick={() => setDiscard(false)}>
                Tiếp tục chỉnh sửa
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setEditor(null);
                  setDiscard(false);
                }}
              >
                Bỏ thay đổi
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={editorState.busy}
                onClick={closeEditor}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                form="catalog-editor-form"
                disabled={editorState.busy}
              >
                {editorState.busy ? "Đang lưu…" : "Lưu bản nháp"}
              </Button>
            </>
          )
        }
      >
        {editor?.kind === "path" && (
          <PathEditor
            initial={editor.draft}
            versionId={editor.versionId}
            onSaved={saved}
            onStateChange={setEditorState}
          />
        )}
        {editor?.kind === "bundle" && (
          <BundleEditor
            initial={editor.draft}
            versionId={editor.versionId}
            onSaved={saved}
            onStateChange={setEditorState}
          />
        )}
      </Modal>
      <Modal
        open={!!history}
        onClose={() => setHistory(null)}
        title={`Lịch sử · ${history?.title}`}
        description="Chỉ bản nháp được sửa trực tiếp. Bản đã xuất bản giữ nguyên cho người đang học hoặc đã mua."
        size="lg"
      >
        {revisionError ? (
          <LoadError error={revisionError} retry={() => reloadRevisions()} />
        ) : !revisions ? (
          <Loading />
        ) : (
          <div className="space-y-3">
            {revisions.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
              >
                <div>
                  <p className="font-medium">Phiên bản {item.version}</p>
                  <Badge
                    className="mt-2"
                    variant={
                      item.status === "published" ? "success" : "outline"
                    }
                  >
                    {states[item.status]}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => view(item)}
                  >
                    Xem
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => edit(item, item.status !== "draft")}
                  >
                    {item.status === "draft" ? "Sửa" : "Tạo phiên bản mới"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
      <Modal
        open={!!preview}
        onClose={() => {
          if (!busy) {
            setPreview(null);
            setFailure("");
          }
        }}
        title={preview?.title}
        description={`Kiểm tra phiên bản ${preview?.version ?? ""} trước khi công khai.`}
        size="xl"
        footer={
          <>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setPreview(null);
                setFailure("");
              }}
            >
              Đóng
            </Button>
            {preview && "bundle_id" in preview && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setCouponDiscard(false);
                  setCouponState({ dirty: false, busy: false });
                  setCoupons(preview);
                  setPreview(null);
                }}
              >
                Mã ưu đãi combo
              </Button>
            )}
            {preview?.status === "draft" && (
              <>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => edit(preview)}
                >
                  Sửa bản nháp
                </Button>
                <Button disabled={busy || issues.length > 0} onClick={publish}>
                  {busy ? "Đang kiểm tra…" : "Xuất bản"}
                </Button>
              </>
            )}
          </>
        }
      >
        <div className="space-y-5">
          {preview && (
            <section className="space-y-2 rounded-xl border border-primary-pastel bg-primary-light p-4 text-sm">
              <p className="font-medium">
                {states[preview.status]} · {preview.is_active ? "Đang bật hiển thị" : "Đang tắt hiển thị"}
              </p>
              <p className="break-all text-muted-foreground">
                /{kind === "paths" ? "lo-trinh" : "combo"}/{preview.slug}
              </p>
              <p className="text-muted-foreground">
                {preview.status === "draft"
                  ? "Bản nháp chỉ dành cho quản trị. Kiểm tra nội dung bên dưới trước khi xuất bản."
                  : "Bản đã xuất bản giữ nguyên nội dung cho người học. Tạo phiên bản mới để chỉnh sửa."}
              </p>
            </section>
          )}
          {issues.length > 0 && (
            <section className="rounded-xl border border-warning-border bg-warning-bg p-4 text-sm text-warning-foreground">
              <p className="font-semibold">Cần bổ sung trước khi xuất bản</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {issues.map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ul>
            </section>
          )}
          {failure && (
            <p
              role="alert"
              className="rounded-xl bg-destructive-bg p-4 text-sm text-destructive-foreground"
            >
              {failure}
            </p>
          )}
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {preview?.description || "Chưa có giới thiệu."}
          </p>
          {preview && "path_id" in preview ? (
            preview.stages?.map((s) => (
              <section
                key={s.id}
                className="space-y-3 rounded-xl border border-border p-4"
              >
                <h3 className="font-semibold">
                  {s.position}. {s.title}
                </h3>
                <p className="text-sm text-muted-foreground">{s.description}</p>
                {s.groups.map((g) => (
                  <div key={g.id}>
                    <h4 className="text-sm font-medium">
                      {g.title} · Chọn một khóa
                    </h4>
                    <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                      {g.options.map((o) => (
                        <li key={o.course_id}>
                          {o.title}
                          {!o.available ? " · Chưa công khai" : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            ))
          ) : preview && "bundle_id" in preview ? (
            <>
              <p className="font-semibold">Giá combo: {price(preview.price)}</p>
              <ul className="space-y-3">
                {preview.items?.map((i) => (
                  <li
                    key={i.course_id}
                    className="rounded-xl border border-border p-4 text-sm"
                  >
                    <p className="font-medium">{i.title}</p>
                    <p className="mt-1 text-muted-foreground">
                      Giá tham chiếu {price(i.list_price)}
                      {preview.status === "published"
                        ? ` · Trong combo ${price(i.allocated_price)}`
                        : " · Phân bổ khi xuất bản"}
                      {!i.available ? " · Chưa công khai" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </Modal>
      <Modal
        open={!!coupons}
        onClose={() => {
          if (couponState.busy) return;
          if (couponState.dirty) {
            setCouponDiscard(true);
            return;
          }
          setCoupons(null);
        }}
        closeOnOverlayClick={false}
        title={`Mã ưu đãi · ${coupons?.title}`}
        description={
          couponDiscard
            ? "Bạn có thay đổi chưa lưu. Tiếp tục chỉnh sửa hoặc bỏ thay đổi để đóng."
            : undefined
        }
        footer={
          couponDiscard ? (
            <>
              <Button variant="outline" onClick={() => setCouponDiscard(false)}>
                Tiếp tục chỉnh sửa
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setCoupons(null);
                  setCouponDiscard(false);
                }}
              >
                Bỏ thay đổi
              </Button>
            </>
          ) : undefined
        }
        size="xl"
      >
        {coupons && (
          <CouponManager
            bundleId={coupons.bundle_id}
            onStateChange={setCouponState}
          />
        )}
      </Modal>
    </main>
  );
}
