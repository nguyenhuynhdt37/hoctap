"use client";
import CatalogAdminNav from "./catalog-nav";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import useSWR from "swr";
import axios from "axios";
import toast from "react-hot-toast";
import api from "@/lib/utils/fetcher/client/axios";
import { Button, Input } from "@/components/ui";
import type { CatalogOptions, Provider, TaxonomyItem } from "@/types/catalog";
import { selectClass } from "@/components/catalog/course-taxonomy-form";
import ProviderEditor from "@/components/catalog/provider-editor";
const tabs = [
  ["levels", "Cấp học"],
  ["grades", "Khối lớp"],
  ["subjects", "Môn học"],
  ["learning-goals", "Mục tiêu"],
  ["exams", "Kỳ thi"],
  ["providers", "Đơn vị cung cấp"],
];
const fetcher = <T,>(url: string) => api.get<T>(url).then((r) => r.data);
function errorMessage(error: unknown) {
  return axios.isAxiosError(error) &&
    typeof error.response?.data?.detail === "string"
    ? error.response.data.detail
    : "Không lưu được. Kiểm tra dữ liệu hoặc thử lại.";
}
export default function CatalogAdmin() {
  const router = useRouter();
  const [tab, setTab] = useState("levels");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Partial<TaxonomyItem> | null>(null);
  const [provider, setProvider] = useState<Partial<Provider> | null>(null);
  const [mapping, setMapping] = useState<TaxonomyItem | null>(null);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { data, error, mutate, isLoading } = useSWR<TaxonomyItem[]>(
    tab !== "providers" ? `/admin/catalog/${tab}` : null,
    fetcher,
  );
  const {
    data: providers,
    error: providerError,
    mutate: reloadProviders,
  } = useSWR<{ items: Provider[]; total: number }>(
    tab === "providers"
      ? `/admin/providers?page=${page}&size=10&search=${encodeURIComponent(search)}`
      : null,
    fetcher,
  );
  const { data: options, mutate: reloadOptions } = useSWR<CatalogOptions>(
    "/catalog/filters",
    fetcher,
  );
  const filtered = (data ?? []).filter((x) =>
    `${x.name} ${x.code}`
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  const items = filtered.slice((page - 1) * 10, page * 10);
  const total = tab === "providers" ? (providers?.total ?? 0) : filtered.length;
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      code: String(form.get("code")),
      name: String(form.get("name")),
      order_index: Number(form.get("order_index")),
      is_active: form.get("is_active") === "on",
      ...(tab === "grades"
        ? {
            grade_number: Number(form.get("grade_number")),
            education_level_id: String(form.get("education_level_id")),
            slug: String(form.get("slug")),
          }
        : {}),
      ...(tab === "subjects" ? { slug: String(form.get("slug")) } : {}),
      ...(["subjects", "exams", "learning-goals"].includes(tab)
        ? { description: String(form.get("description")) }
        : {}),
      ...(tab === "exams" ? { exam_type: String(form.get("exam_type")) } : {}),
    };
    try {
      if (editing.id)
        await api.put(`/admin/catalog/${tab}/${editing.id}`, payload);
      else await api.post(`/admin/catalog/${tab}`, payload);
      setEditing(null);
      await Promise.all([mutate(), reloadOptions()]);
      toast.success("Đã lưu danh mục");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: TaxonomyItem) {
    if (
      !window.confirm(
        `Xóa “${item.name}”? Danh mục đang được sử dụng sẽ không thể xóa.`,
      )
    )
      return;
    setBusy(true);
    try {
      await api.delete(`/admin/catalog/${tab}/${item.id}`);
      await Promise.all([mutate(), reloadOptions()]);
      toast.success("Đã xóa");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function saveMapping() {
    if (!mapping) return;
    setBusy(true);
    try {
      await api.put(`/admin/catalog/grades/${mapping.id}/subjects`, subjectIds);
      await reloadOptions();
      setMapping(null);
      toast.success("Đã lưu môn theo lớp");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="space-y-6 p-4 text-foreground sm:p-8">
      <CatalogAdminNav />
      <div>
        <h1 className="text-2xl font-semibold">Danh mục & Giáo dục</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sắp xếp cấp học, lớp, môn và gán khóa học trước khi tuyển chọn vào lộ
          trình hoặc combo.
        </p>
      </div>
      <nav aria-label="Phân loại giáo dục" className="flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? "primary" : "outline"}
            onClick={() => {
              if (key === "providers") { router.push("/admin/providers"); return; }
              setTab(key);
              setPage(1);
              setEditing(null);
              setProvider(null);
              setMapping(null);
              setSearch("");
            }}
          >
            {label}
          </Button>
        ))}
        <a
          href="/admin/categories"
          className="rounded-xl border border-border px-4 py-2.5 text-sm text-primary"
        >
          Cây điều hướng
        </a>
      </nav>
      <div className="flex items-end gap-3">
        <Input
          label="Tìm kiếm"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Button
          onClick={() =>
            tab === "providers"
              ? setProvider({})
              : setEditing({ is_active: true, order_index: 0 })
          }
        >
          Thêm mới
        </Button>
      </div>
      {(error || providerError) && (
        <div
          role="alert"
          className="rounded-xl bg-destructive-bg p-4 text-destructive-foreground"
        >
          Không tải được dữ liệu.{" "}
          <Button
            variant="outline"
            onClick={() => (tab === "providers" ? reloadProviders() : mutate())}
          >
            Thử lại
          </Button>
        </div>
      )}
      {isLoading || (tab === "providers" && !providers && !providerError) ? (
        <p role="status" className="animate-pulse p-6">
          Đang tải dữ liệu…
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-primary-light">
              <tr>
                <th className="p-4">Tên</th>
                <th className="p-4">Mã / Slug</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {tab === "providers"
                ? providers?.items.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="p-4">{item.name}</td>
                      <td className="p-4">{item.slug}</td>
                      <td className="p-4">
                        {item.verification_status} ·{" "}
                        {item.is_active ? "Hoạt động" : "Đã ẩn"}
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          onClick={() => setProvider(item)}
                        >
                          Quản lý
                        </Button>
                      </td>
                    </tr>
                  ))
                : items.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="p-4">{item.name}</td>
                      <td className="p-4">{item.code}</td>
                      <td className="p-4">
                        {item.is_active ? "Hoạt động" : "Đã ẩn"}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => setEditing(item)}
                          >
                            Sửa
                          </Button>
                          {tab === "grades" && (
                            <Button
                              variant="ghost"
                              disabled={!options}
                              onClick={() => {
                                setMapping(item);
                                setSubjectIds(
                                  options?.grade_subjects
                                    .filter((x) => x.grade_id === item.id)
                                    .map((x) => x.subject_id) ?? [],
                                );
                              }}
                            >
                              Môn học
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            disabled={busy}
                            onClick={() => remove(item)}
                          >
                            Xóa
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              {total === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="p-8 text-center text-muted-foreground"
                  >
                    Chưa có dữ liệu phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Trang trước
        </Button>
        <span className="text-sm">
          Trang {page} / {Math.max(1, Math.ceil(total / 10))} · {total} mục
        </span>
        <Button
          variant="outline"
          disabled={page * 10 >= total}
          onClick={() => setPage(page + 1)}
        >
          Trang sau
        </Button>
      </div>
      {editing && (
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-5 text-lg font-semibold">
            {editing.id ? "Sửa danh mục" : "Tạo danh mục"}
          </h2>
          <form
            key={editing.id ?? "new"}
            onSubmit={save}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Input
              name="name"
              label="Tên hiển thị"
              required
              maxLength={160}
              defaultValue={editing.name ?? ""}
            />
            <Input
              name="code"
              label="Mã ổn định"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              readOnly={!!editing.id}
              defaultValue={editing.code ?? ""}
            />
            <Input
              name="order_index"
              label="Thứ tự"
              type="number"
              min={0}
              required
              defaultValue={editing.order_index ?? 0}
            />
            {["grades", "subjects"].includes(tab) && (
              <Input
                name="slug"
                label="Đường dẫn · trống để tự tạo"
                readOnly={!!editing.id}
                defaultValue={editing.slug ?? ""}
              />
            )}
            {tab === "grades" && (
              <>
                <Input
                  name="grade_number"
                  label="Số lớp"
                  type="number"
                  required
                  min={1}
                  max={12}
                  defaultValue={editing.grade_number}
                />
                <label className="space-y-2">
                  <span>Cấp học</span>
                  <select
                    name="education_level_id"
                    required
                    className={selectClass}
                    defaultValue={editing.education_level_id ?? ""}
                  >
                    <option value="">Chọn cấp học</option>
                    {options?.levels.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {tab === "exams" && (
              <Input
                name="exam_type"
                label="Nhóm kỳ thi"
                required
                defaultValue={editing.exam_type ?? "entrance"}
              />
            )}
            {["subjects", "exams", "learning-goals"].includes(tab) && (
              <Input
                name="description"
                label="Mô tả"
                defaultValue={editing.description ?? ""}
              />
            )}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={editing.is_active ?? true}
              />
              Hoạt động
            </label>
            <div className="flex gap-3 sm:col-span-2">
              <Button type="submit" disabled={busy}>
                Lưu
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
              >
                Hủy
              </Button>
            </div>
          </form>
        </section>
      )}
      {mapping && (
        <section className="space-y-5 rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-semibold">Môn học — {mapping.name}</h2>
          <div className="flex flex-wrap gap-3">
            {options?.subjects.map((subject) => (
              <label
                key={subject.id}
                className="flex items-center gap-2 rounded-xl border border-border p-3"
              >
                <input
                  type="checkbox"
                  checked={subjectIds.includes(subject.id)}
                  onChange={(e) =>
                    setSubjectIds(
                      e.target.checked
                        ? [...subjectIds, subject.id]
                        : subjectIds.filter((id) => id !== subject.id),
                    )
                  }
                />
                {subject.name}
              </label>
            ))}
          </div>
          <Button disabled={busy} onClick={saveMapping}>
            Lưu môn học
          </Button>
          <Button variant="ghost" onClick={() => setMapping(null)}>
            Hủy
          </Button>
        </section>
      )}
      {provider && (
        <ProviderEditor
          admin
          value={provider}
          onSaved={() => {
            setProvider(null);
            reloadProviders();
          }}
          onCancel={() => setProvider(null)}
        />
      )}
    </main>
  );
}
