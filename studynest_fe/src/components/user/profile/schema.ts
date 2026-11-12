import { UserProfile } from "@/types/user/profile";

export type ProfileMode = "learner" | "lecturer";

export interface ProfileValues {
  fullname: string;
  bio: string;
  facebook_url: string;
  birthday: string;
  conscious: string;
  district: string;
  instructor_description: string;
  citizenship_identity: string;
}

export type ProfileFieldErrors = Partial<Record<keyof ProfileValues, string>>;

export function profileValuesFrom(profile: UserProfile): ProfileValues {
  return {
    fullname: profile.fullname || "",
    bio: profile.bio || "",
    facebook_url: profile.facebook_url || "",
    birthday: profile.birthday ? profile.birthday.slice(0, 10) : "",
    conscious: profile.conscious || "",
    district: profile.district || "",
    instructor_description: profile.instructor_description || "",
    citizenship_identity: profile.citizenship_identity || "",
  };
}

export function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

const LEARNER_FIELDS = [
  "fullname",
  "bio",
  "facebook_url",
  "birthday",
  "conscious",
  "district",
] as const;

const LECTURER_FIELDS = [
  ...LEARNER_FIELDS,
  "instructor_description",
  "citizenship_identity",
] as const;

function comparable(values: ProfileValues, mode: ProfileMode) {
  const fields = mode === "lecturer" ? LECTURER_FIELDS : LEARNER_FIELDS;
  const snapshot: Record<string, string | null> = {};
  for (const field of fields) {
    if (field === "birthday" || field === "conscious" || field === "district") {
      snapshot[field] = values[field] || null;
    } else {
      snapshot[field] = emptyToNull(values[field]);
    }
  }
  return snapshot;
}

export function isProfileDirty(
  current: ProfileValues,
  baseline: ProfileValues,
  mode: ProfileMode
) {
  return (
    JSON.stringify(comparable(current, mode)) !==
    JSON.stringify(comparable(baseline, mode))
  );
}

export function buildProfilePayload(
  current: ProfileValues,
  baseline: ProfileValues,
  mode: ProfileMode
) {
  const next = comparable(current, mode);
  const previous = comparable(baseline, mode);
  const payload: Record<string, string | null> = {
    fullname: next.fullname,
  };
  for (const [field, value] of Object.entries(next)) {
    if (field !== "fullname" && value !== previous[field]) {
      payload[field] = value;
    }
  }
  return payload;
}

function validateShared(values: ProfileValues): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  const name = values.fullname.trim();
  if (!name) {
    errors.fullname = "Họ và tên là bắt buộc";
  } else if (name.length > 120) {
    errors.fullname = "Họ và tên tối đa 120 ký tự";
  }

  if (values.bio.trim().length > 2000) {
    errors.bio = "Giới thiệu tối đa 2000 ký tự";
  }

  const link = values.facebook_url.trim();
  if (link) {
    try {
      const url = new URL(link);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        errors.facebook_url = "Liên kết cần bắt đầu bằng http hoặc https";
      }
    } catch {
      errors.facebook_url = "Liên kết không hợp lệ";
    }
  }

  if (values.birthday) {
    const date = new Date(`${values.birthday}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(date.getTime()) || date > today) {
      errors.birthday = "Ngày sinh không được ở tương lai";
    }
  }

  return errors;
}

export function validateProfile(
  values: ProfileValues,
  mode: ProfileMode
): ProfileFieldErrors {
  const errors = validateShared(values);
  if (mode !== "lecturer") return errors;

  if (values.instructor_description.trim().length > 5000) {
    errors.instructor_description = "Giới thiệu giảng viên tối đa 5000 ký tự";
  }

  const identity = values.citizenship_identity.trim();
  if (identity && !/^\d{9}$|^\d{12}$/.test(identity)) {
    errors.citizenship_identity = "Nhập 9 số CMND hoặc 12 số CCCD";
  }

  return errors;
}
