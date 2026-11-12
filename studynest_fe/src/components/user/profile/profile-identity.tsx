"use client";

import { prepareImageUpload } from "@/lib/prepare-image-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { District, Province } from "./hooks/use-admin-divisions";
import { ProfileEditor } from "./hooks/use-profile-form";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(-2);
  const letters = parts.map((part) => part[0]).join("");
  return letters.toUpperCase() || "M";
}

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
    (item) => item.province_id === values.conscious
  )?.province_name;
  const districtName = districts.find(
    (item) => item.district_id === values.district
  )?.district_name;
  const place = [districtName, provinceName].filter(Boolean).join(", ");
  const joined = joinedLabel(profile.created_at);
  const imageSrc =
    preview || (profile.avatar ? getImageUrl(profile.avatar) : "");

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
    <Card density="none" className="lg:sticky lg:top-6 lg:self-start">
      <CardContent className="flex flex-col items-center px-6 py-6 text-center">
        <div className="relative">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={values.fullname || "Ảnh đại diện"}
              className="h-28 w-28 rounded-full border border-primary-pastel object-cover"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full border border-primary-pastel bg-primary-light text-2xl font-semibold text-primary">
              {initials(values.fullname)}
            </div>
          )}
        </div>

        <h1 className="mt-4 text-xl font-semibold text-foreground">
          {values.fullname || "Hồ sơ của bạn"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
        {place && <p className="mt-2 text-sm text-foreground">{place}</p>}
        {joined && (
          <p className="mt-1 text-xs text-subtle-foreground">
            Tham gia từ {joined}
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={chooseFile}
        />

        <div className="mt-5 flex w-full flex-col gap-2">
          {!editing && (
            <Button type="button" onClick={startEditing} fullWidth>
              Chỉnh sửa
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={() => inputRef.current?.click()}
          >
            Chọn ảnh
          </Button>
          {file && (
            <Button
              type="button"
              variant="pastel"
              fullWidth
              onClick={upload}
              isLoading={uploading}
              loadingText="Đang tải..."
            >
              Tải ảnh lên
            </Button>
          )}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Ảnh vuông, tối đa 5MB.
        </p>
        {avatarError && (
          <p role="alert" className="mt-2 text-xs font-medium text-destructive-foreground">
            {avatarError}
          </p>
        )}
        {avatarSuccess && !avatarError && (
          <p className="mt-2 text-xs font-medium text-success-foreground">
            {avatarSuccess}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
