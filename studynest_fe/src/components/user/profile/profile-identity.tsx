"use client";

import {
  EmblemIcon,
  EquippedMarks,
  FramedAvatar,
  RarityBadge,
  TitleBadge,
} from "@/components/learning-hub/shop/item-art";
import { CoinBadge } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { useGamificationStats } from "@/lib/learning-hub/mission-hooks";
import {
  useCoinBalances,
  useLearnerEquipment,
  useShopInventory,
} from "@/lib/learning-hub/shop-hooks";
import { coinCopy } from "@/lib/learning-hub/shop-logic";
import type { Rarity } from "@/lib/learning-hub/shop-types";
import { prepareImageUpload } from "@/lib/prepare-image-upload";
import { cn } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Calendar,
  Camera,
  Check,
  Flame,
  MapPin,
  Pencil,
  Store,
  Trophy,
  Wallet,
} from "pulsoicon-react";
import { useEffect, useRef, useState } from "react";
import { District, Province } from "./hooks/use-admin-divisions";
import { ProfileEditor } from "./hooks/use-profile-form";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const rarityRank: Record<Rarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

const bannerAura: Record<Rarity, { primary: string; secondary: string; ring: string; accentText: string }> = {
  common: {
    primary: "bg-[#7BB3E8]/25",
    secondary: "bg-[#BFD7ED]/20",
    ring: "border-[#BFD7ED]/40",
    accentText: "text-[#BFD7ED]",
  },
  rare: {
    primary: "bg-[#F4A5C7]/25",
    secondary: "bg-[#BFD7ED]/20",
    ring: "border-[#F4A5C7]/45",
    accentText: "text-[#FBCFE0]",
  },
  epic: {
    primary: "bg-[#C8B0F7]/30",
    secondary: "bg-[#8D6BE0]/25",
    ring: "border-[#C8B0F7]/50",
    accentText: "text-[#E4D6FF]",
  },
  legendary: {
    primary: "bg-[#F5C542]/28",
    secondary: "bg-[#C8B0F7]/20",
    ring: "border-[#F5C542]/55",
    accentText: "text-[#FFE89E]",
  },
};

function joinedLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function readApiError(error: unknown, fallback: string) {
  if (typeof error === "object" && error && "response" in error) {
    const detail = (error as { response?: { data?: { detail?: unknown } } })
      .response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
  }
  return fallback;
}

interface ProfileIdentityProps {
  editor: ProfileEditor;
  provinces: Province[];
  districts: District[];
}

export default function ProfileIdentity({
  editor,
  provinces,
  districts,
}: ProfileIdentityProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { profile, values, editing, startEditing } = editor;
  const equipment = useLearnerEquipment(profile.id) ?? profile.equipment;
  const coins = useCoinBalances().data;
  const inventory = useShopInventory().data;
  const { xp, streak } = useGamificationStats();

  const [preview, setPreview] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPreview("");
    setFile(null);
  }, [profile.avatar]);

  const provinceName = provinces.find(
    (item) => item.province_id === values.conscious,
  )?.province_name;
  const districtName = districts.find(
    (item) => item.district_id === values.district,
  )?.district_name;
  const place = [districtName, provinceName].filter(Boolean).join(", ");
  const joined = joinedLabel(profile.created_at);
  const imageSrc = preview || profile.avatar;

  // Xác định độ hiếm cao nhất trong trang bị đang mặc để phối hào quang VIP
  const equippedList = [
    equipment?.avatar_frame,
    equipment?.title,
    equipment?.emblem,
  ].filter(Boolean);
  const peakRarity: Rarity = equippedList.reduce<Rarity>((best, item) => {
    if (!item) return best;
    return rarityRank[item.rarity] > rarityRank[best] ? item.rarity : best;
  }, "common");
  const aura = bannerAura[peakRarity];

  const goldBalance = coins?.paid;
  const whiteBalance = coins?.bonus ?? inventory?.balance ?? xp?.peak_balance;
  const xpPct =
    xp && xp.required_xp > 0
      ? Math.min(100, Math.round((xp.current_xp / xp.required_xp) * 100))
      : 0;

  const chooseFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0];
    event.target.value = "";
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      setFile(null);
      setPreview("");
      setAvatarSuccess("");
      setAvatarError("Chọn một file ảnh.");
      return;
    }
    if (next.size > MAX_AVATAR_BYTES) {
      setFile(null);
      setPreview("");
      setAvatarSuccess("");
      setAvatarError("Ảnh cần nhỏ hơn 5MB.");
      return;
    }
    setAvatarError("");
    setAvatarSuccess("");
    setFile(next);
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result || ""));
    reader.readAsDataURL(next);
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setAvatarError("");
    try {
      const body = new FormData();
      body.append("file", await prepareImageUpload(file, "avatar"));
      await api.put("/profile/avatar", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAvatarSuccess("Đã cập nhật ảnh đại diện.");
      setFile(null);
      router.refresh();
    } catch (error) {
      setAvatarError(readApiError(error, "Chưa tải được ảnh. Thử lại sau."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* VIP SPOTLIGHT BANNER */}
      <section
        aria-label="Hồ sơ cá nhân VIP"
        className={cn(
          "relative isolate overflow-hidden rounded-[32px] border bg-gradient-to-br from-[#13263A] via-[#1E3F63] to-[#2C5B8B] p-6 text-white shadow-lg sm:p-8",
          aura.ring,
        )}
      >
        <div
          aria-hidden="true"
          className={cn("pointer-events-none absolute -right-16 -top-16 -z-10 size-64 rounded-full blur-3xl", aura.primary)}
        />
        <div
          aria-hidden="true"
          className={cn("pointer-events-none absolute -bottom-20 left-1/4 -z-10 size-60 rounded-full blur-3xl", aura.secondary)}
        />

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={chooseFile}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center">
          {/* CỘT TRÁI: AVATAR + DANH HIỆU + THÔNG TIN ĐỊNH DANH */}
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
            <div className="relative shrink-0">
              <div className="rounded-full bg-white/8 p-1.5 ring-1 ring-white/15">
                <FramedAvatar
                  src={imageSrc}
                  name={values.fullname}
                  equipment={equipment}
                  className="size-28 text-2xl sm:size-32"
                />
              </div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                aria-label="Đổi ảnh đại diện"
                title="Đổi ảnh đại diện"
                className="absolute right-1 bottom-1 flex size-9 items-center justify-center rounded-full border border-white/30 bg-[#13263A]/90 text-white shadow-md backdrop-blur-md transition-transform hover:scale-105 hover:bg-primary cursor-pointer"
              >
                <Camera aria-hidden="true" className="size-4" />
              </button>
            </div>

            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {xp && (
                  <Link
                    href="/levels"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/12 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                  >
                    <Trophy aria-hidden="true" animated={false} className={cn("size-3.5", aura.accentText)} />
                    <span>Cấp {xp.level}</span>
                  </Link>
                )}
                {streak.data && (
                  <Link
                    href="/missions"
                    className="inline-flex items-center gap-1 rounded-full border border-[#F5C542]/45 bg-[#F5C542]/18 px-3 py-1 text-xs font-bold text-[#FFE89E]"
                  >
                    <Flame aria-hidden="true" animated={false} className="size-3.5 text-[#FFD55A]" />
                    <span>{streak.data.current_streak} ngày</span>
                  </Link>
                )}
              </div>

              <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl wrap-anywhere">
                {values.fullname || "Hồ sơ của bạn"}
              </h1>

              <EquippedMarks
                equipment={equipment}
                className="justify-center sm:justify-start"
              />

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/75 sm:justify-start">
                <span className="truncate">{profile.email}</span>
                {place && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin aria-hidden="true" animated={false} className="size-3.5 text-white/60" />
                    <span>{place}</span>
                  </span>
                )}
                {joined && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar aria-hidden="true" animated={false} className="size-3.5 text-white/60" />
                    <span>Tham gia {joined}</span>
                  </span>
                )}
              </div>

              {/* Thanh xác nhận khi người dùng vừa chọn ảnh đại diện mới */}
              {file && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1 sm:justify-start">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void upload()}
                    isLoading={uploading}
                    loadingText="Đang tải..."
                    className="rounded-full bg-[#F5C542] text-[#241607] hover:bg-[#FFD55A]"
                  >
                    <Check aria-hidden="true" className="size-3.5" />
                    <span>Lưu ảnh mới</span>
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreview("");
                    }}
                    className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
              )}

              {avatarError && (
                <p role="alert" className="text-xs font-semibold text-red-200">
                  {avatarError}
                </p>
              )}
              {avatarSuccess && (
                <p role="status" className="text-xs font-semibold text-emerald-200">
                  {avatarSuccess}
                </p>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: VIP STATS, XP BAR & HÀNH ĐỘNG NHANH */}
          <div className="flex flex-col gap-3.5 rounded-3xl border border-white/15 bg-white/8 p-4 backdrop-blur-md sm:p-5">
            {/* Đồng xu Vàng & Trắng */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
                Số dư hiện tại
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/wallets" className="transition-transform hover:scale-105">
                  <CoinBadge
                    kind="gold"
                    amount={goldBalance ?? 0}
                    surface="dark"
                    size="md"
                  />
                </Link>
                <Link href="/shop" className="transition-transform hover:scale-105">
                  <CoinBadge
                    kind="white"
                    amount={whiteBalance ?? 0}
                    surface="dark"
                    size="md"
                  />
                </Link>
              </div>
            </div>

            {/* Thanh XP */}
            {xp && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white/85">Tiến độ Cấp {xp.level}</span>
                  <span className="font-bold tabular-nums text-[#FFE89E]">
                    {new Intl.NumberFormat("vi-VN").format(xp.current_xp)} /{" "}
                    {new Intl.NumberFormat("vi-VN").format(xp.required_xp)} XP
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className="h-2 w-full overflow-hidden rounded-full bg-white/15"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#BFD7ED] via-[#FFE89E] to-[#F5C542] transition-all duration-500"
                    style={{ width: `${xpPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Cụm nút hành động VIP */}
            <div className="grid grid-cols-2 gap-2 pt-1 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={() => {
                  startEditing();
                  const el = document.getElementById("profile-details");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  const firstInput = el?.querySelector<HTMLInputElement>("input:not([disabled])");
                  firstInput?.focus({ preventScroll: true });
                }}
                className="col-span-2 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#F5C542] px-4 text-xs font-bold text-[#241607] shadow-xs transition-colors hover:bg-[#FFD55A] cursor-pointer sm:flex-1"
              >
                <Pencil aria-hidden="true" className="size-3.5" />
                <span>Chỉnh sửa hồ sơ</span>
              </button>
              <Link
                href="/shop"
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-white/25 bg-white/12 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
              >
                <Store aria-hidden="true" className="size-3.5" />
                <span>Cửa hàng</span>
              </Link>
              <Link
                href="/wallets"
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#F5C542]/45 bg-[#F5C542]/18 px-3.5 text-xs font-semibold text-[#FFE89E] transition-colors hover:bg-[#F5C542]/30"
              >
                <Wallet aria-hidden="true" className="size-3.5" />
                <span>Nạp thêm</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* DẢI TRƯNG BÀY 3 Ô TRANG BỊ ĐANG MẶC (EQUIPPED SHOWCASE STRIP) */}
      <section aria-label="Bộ trang bị đang dùng" className="grid gap-3.5 sm:grid-cols-3">
        {/* Khung Avatar */}
        <Link
          href="/shop?tab=avatar_frame"
          className="group flex items-center justify-between gap-3 rounded-[22px] border border-border bg-surface p-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-primary-pastel hover:shadow-ambient-sm"
        >
          <div className="flex min-w-0 items-center gap-3">
            <FramedAvatar
              src={imageSrc}
              name={values.fullname}
              equipment={equipment}
              className="size-12 text-xs"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Khung avatar
              </p>
              <p className="truncate text-sm font-bold text-foreground">
                {equipment?.avatar_frame ? coinCopy(equipment.avatar_frame.name) : "Chưa trang bị"}
              </p>
              {equipment?.avatar_frame && (
                <div className="mt-1">
                  <RarityBadge rarity={equipment.avatar_frame.rarity} />
                </div>
              )}
            </div>
          </div>
          <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
        </Link>

        {/* Danh hiệu */}
        <Link
          href="/shop?tab=title"
          className="group flex items-center justify-between gap-3 rounded-[22px] border border-border bg-surface p-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-primary-pastel hover:shadow-ambient-sm"
        >
          <div className="min-w-0 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Danh hiệu
            </p>
            {equipment?.title ? (
              <TitleBadge item={equipment.title} />
            ) : (
              <p className="text-sm font-semibold text-muted-foreground">Chưa trang bị</p>
            )}
          </div>
          <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
        </Link>

        {/* Biểu tượng */}
        <Link
          href="/shop?tab=emblem"
          className="group flex items-center justify-between gap-3 rounded-[22px] border border-border bg-surface p-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-primary-pastel hover:shadow-ambient-sm"
        >
          <div className="flex min-w-0 items-center gap-3">
            {equipment?.emblem ? (
              <EmblemIcon item={equipment.emblem} decorative className="size-12" />
            ) : (
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-dashed border-border bg-background text-xs text-muted-foreground">
                —
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Biểu tượng
              </p>
              <p className="truncate text-sm font-bold text-foreground">
                {equipment?.emblem ? coinCopy(equipment.emblem.name) : "Chưa trang bị"}
              </p>
              {equipment?.emblem && (
                <div className="mt-1">
                  <RarityBadge rarity={equipment.emblem.rarity} />
                </div>
              )}
            </div>
          </div>
          <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
        </Link>
      </section>
    </div>
  );
}
