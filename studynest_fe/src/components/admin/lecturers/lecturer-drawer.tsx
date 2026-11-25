"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  GraduationCap,
  Mail,
  Plus,
  Search,
  UserCheck,
  X,
} from "pulsoicon-react";
import { Button, Input } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import type { Lecturer } from "@/types/admin/lecturer";

interface CandidateUser {
  id: string;
  fullname: string;
  email: string;
  avatar: string | null;
  is_verified_email: boolean;
}

interface LecturerDrawerProps {
  open: boolean;
  editing: Partial<Lecturer> | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export default function LecturerDrawer({
  open,
  editing,
  onClose,
  onSaved,
}: LecturerDrawerProps) {
  const isEditing = Boolean(editing?.id);
  const [mode, setMode] = useState<"create" | "promote">("create");
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [instructorDesc, setInstructorDesc] = useState("");
  const [conscious, setConscious] = useState("");
  const [district, setDistrict] = useState("");
  const [isVerified, setIsVerified] = useState(true);
  const [saving, setSaving] = useState(false);

  const [candSearch, setCandSearch] = useState("");
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const { data: candidates, isLoading: loadingCands, mutate: mutateCands } =
    useSWR<CandidateUser[]>(
      open && !isEditing && mode === "promote"
        ? `/admin/lecturers/candidates?limit=20&search=${encodeURIComponent(candSearch)}`
        : null,
      async (url: string) => (await api.get(url)).data,
      { revalidateOnFocus: false },
    );

  useEffect(() => {
    if (!open) return;
    setMode("create");
    setFullname(editing?.fullname ?? "");
    setEmail(editing?.email ?? "");
    setPassword("");
    setBio(editing?.bio ?? "");
    setInstructorDesc(editing?.instructor_description ?? "");
    setConscious(editing?.conscious ?? "");
    setDistrict(editing?.district ?? "");
    setIsVerified(editing?.is_verified_email ?? true);
    setCandSearch("");
  }, [open, editing]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullname.trim() || !email.trim()) {
      toast.error("Vui lòng nhập đầy đủ họ tên và email.");
      return;
    }
    if (!isEditing && password.length < 6) {
      toast.error("Mật khẩu cần tối thiểu 6 ký tự.");
      return;
    }
    setSaving(true);
    try {
      if (isEditing && editing?.id) {
        await api.put(`/admin/lecturers/${editing.id}`, {
          fullname: fullname.trim(),
          email: email.trim(),
          bio: bio.trim(),
          instructor_description: instructorDesc.trim(),
          conscious: conscious.trim(),
          district: district.trim(),
          is_verified_email: isVerified,
        });
        toast.success("Đã cập nhật hồ sơ giảng viên!");
      } else {
        await api.post("/admin/lecturers", {
          fullname: fullname.trim(),
          email: email.trim(),
          password,
          bio: bio.trim() || null,
          instructor_description: instructorDesc.trim() || null,
          conscious: conscious.trim() || null,
          district: district.trim() || null,
          is_verified_email: isVerified,
        });
        toast.success("Đã tạo tài khoản giảng viên mới!");
      }
      await onSaved();
      onClose();
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Không thể lưu thông tin giảng viên.";
      toast.error(detail);
    } finally {
      setSaving(false);
    }
  }

  async function handlePromote(user: CandidateUser) {
    setPromotingId(user.id);
    try {
      await api.post(`/admin/lecturers/${user.id}/add_role_lecturer`);
      toast.success(`Đã cấp quyền Giảng viên cho ${user.fullname || user.email}!`);
      await Promise.all([onSaved(), mutateCands()]);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Không thể cấp quyền giảng viên.";
      toast.error(detail);
    } finally {
      setPromotingId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-foreground/20 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex-1" onClick={onClose} />
      <div className="flex h-full w-full max-w-xl flex-col border-l border-border bg-surface shadow-[0_24px_64px_-16px_rgba(53,111,167,0.28)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              Faculty Inspector
            </span>
            <h2 className="text-lg font-bold text-foreground">
              {isEditing
                ? `Chỉnh sửa giảng viên ${editing?.fullname}`
                : "Thêm Giảng viên mới"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary hover:text-primary"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Switcher when Creating */}
        {!isEditing && (
          <div className="border-b border-border bg-background/50 px-6 py-3">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface p-1">
              <button
                type="button"
                onClick={() => setMode("create")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
                  mode === "create"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                <Plus size={14} animated={false} />
                Tạo tài khoản mới
              </button>
              <button
                type="button"
                onClick={() => setMode("promote")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
                  mode === "promote"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                <UserCheck size={14} animated={false} />
                Thăng cấp từ Thành viên
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        {!isEditing && mode === "promote" ? (
          <div className="flex flex-1 flex-col space-y-4 overflow-y-auto p-6">
            <div className="relative">
              <Search
                size={15}
                animated={false}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                value={candSearch}
                onChange={(e) => setCandSearch(e.target.value)}
                placeholder="Tìm thành viên theo tên hoặc email..."
                className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {loadingCands ? (
              <div className="space-y-2.5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-2xl bg-background"
                  />
                ))}
              </div>
            ) : !candidates || candidates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-xs text-muted-foreground">
                Không tìm thấy thành viên phù hợp để thăng cấp.
              </div>
            ) : (
              <div className="space-y-2.5">
                {candidates.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/50 p-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light font-bold text-primary">
                        {(u.fullname || u.email).slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {u.fullname || "Chưa đặt tên"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {u.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={promotingId === u.id}
                      onClick={() => void handlePromote(u)}
                    >
                      <GraduationCap size={14} />
                      {promotingId === u.id ? "Đang cấp..." : "Cấp quyền GV"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              {/* Live Preview */}
              <div className="rounded-3xl border border-accent-vanilla-border bg-accent-vanilla/50 p-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-accent-vanilla-foreground">
                  Xem trước Thẻ Giảng viên
                </p>
                <div className="flex items-center gap-3.5 rounded-2xl border border-white/80 bg-surface p-3.5 shadow-2xs">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent-vanilla-border bg-accent-vanilla font-bold text-accent-vanilla-foreground">
                    {(fullname || email || "G").slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-foreground">
                      {fullname.trim() || "Tên giảng viên..."}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mail size={11} animated={false} />
                      {email.trim() || "lecturer@maymay.edu.vn"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Họ và tên"
                  required
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  placeholder="VD: Thầy Nguyễn Minh Hoàng"
                />
                <Input
                  label="Địa chỉ Email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hoang@maymay.edu.vn"
                />
              </div>

              {!isEditing && (
                <Input
                  label="Mật khẩu khởi tạo (tối thiểu 6 ký tự)"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              )}

              <Input
                label="Tiểu sử ngắn (Bio)"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="VD: Thạc sĩ Toán học · 10 năm luyện thi THPT Quốc gia"
              />

              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-foreground">
                  Mô tả chuyên môn giảng dạy
                </span>
                <textarea
                  rows={3}
                  value={instructorDesc}
                  onChange={(e) => setInstructorDesc(e.target.value)}
                  placeholder="Giới thiệu phương pháp giảng dạy, thành tích nổi bật..."
                  className="w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Tỉnh / Thành phố"
                  value={conscious}
                  onChange={(e) => setConscious(e.target.value)}
                  placeholder="VD: Hà Nội"
                />
                <Input
                  label="Quận / Huyện"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="VD: Cầu Giấy"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                />
                Đánh dấu Email đã xác thực
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-border bg-background/50 px-6 py-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Đang lưu..."
                  : isEditing
                    ? "Lưu thay đổi"
                    : "Tạo Giảng viên"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
