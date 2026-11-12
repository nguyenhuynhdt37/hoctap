"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { UserProfile } from "@/types/user/profile";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ProfileFieldErrors,
  ProfileMode,
  ProfileValues,
  buildProfilePayload,
  isProfileDirty,
  profileValuesFrom,
  validateProfile,
} from "../schema";

function readApiError(error: unknown, fallback: string) {
  if (typeof error === "object" && error && "response" in error) {
    const detail = (error as { response?: { data?: { detail?: unknown } } })
      .response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
  }
  return fallback;
}

export function useProfileForm(profile: UserProfile, mode: ProfileMode) {
  const router = useRouter();
  const initial = profileValuesFrom(profile);
  const [values, setValues] = useState<ProfileValues>(initial);
  const [baseline, setBaseline] = useState<ProfileValues>(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const dirty = useMemo(
    () => isProfileDirty(values, baseline, mode),
    [values, baseline, mode]
  );
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (dirtyRef.current) return;
    const next = profileValuesFrom(profile);
    setValues(next);
    setBaseline(next);
  }, [profile]);

  useEffect(() => {
    if (!editing || !dirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || !anchor.href) return;
      const nextUrl = new URL(anchor.href, window.location.href);
      const samePage =
        nextUrl.origin === window.location.origin &&
        nextUrl.pathname === window.location.pathname;
      if (samePage) return;
      const leave = window.confirm(
        "Bạn còn thay đổi chưa lưu. Rời trang này?"
      );
      if (!leave) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [editing, dirty]);

  const update = (patch: Partial<ProfileValues>) => {
    setValues((current) => {
      const next = { ...current, ...patch };
      if (
        patch.conscious !== undefined &&
        patch.conscious !== current.conscious
      ) {
        next.district = "";
      }
      return next;
    });
    setSuccess("");
    setFormError("");
  };

  const startEditing = () => {
    setEditing(true);
    setSuccess("");
  };

  const cancel = () => {
    setValues(baseline);
    setFieldErrors({});
    setFormError("");
    setEditing(false);
  };

  const generateBio = async () => {
    setGeneratingBio(true);
    setFormError("");
    try {
      const response = await api.post("/user/chat/profile/create_bio", {
        request: "Viết một đoạn giới thiệu ngắn, thân thiện, bằng tiếng Việt.",
      });
      if (typeof response.data === "string") {
        update({ bio: response.data.replace(/^["']|["']$/g, "") });
      }
    } catch (error) {
      setFormError(readApiError(error, "Chưa tạo được giới thiệu. Thử lại sau."));
    } finally {
      setGeneratingBio(false);
    }
  };

  const submit = async () => {
    const errors = validateProfile(values, mode);
    if (
      mode === "lecturer" &&
      values.citizenship_identity.trim() === baseline.citizenship_identity.trim()
    ) {
      delete errors.citizenship_identity;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !dirty) return;

    setSaving(true);
    setFormError("");
    try {
      await api.put("/profile", buildProfilePayload(values, baseline, mode));
      setBaseline(values);
      setEditing(false);
      setSuccess("Đã lưu hồ sơ.");
      router.refresh();
    } catch (error) {
      setFormError(readApiError(error, "Chưa lưu được hồ sơ. Thử lại sau."));
    } finally {
      setSaving(false);
    }
  };

  return {
    mode,
    profile,
    values,
    editing,
    dirty,
    saving,
    generatingBio,
    fieldErrors,
    formError,
    success,
    update,
    startEditing,
    cancel,
    generateBio,
    submit,
  };
}

export type ProfileEditor = ReturnType<typeof useProfileForm>;
