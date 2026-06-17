"use client";

import TiptapEditor from "@/components/shared/tiptap_editor";
import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { UserProfile } from "@/types/user/profile";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BsPaypal } from "react-icons/bs";
import useSWR from "swr";

interface Props {
  profileData: UserProfile | null;
  error?: { status: number; message: string };
}

interface Province {
  province_id: string;
  province_name: string;
}

interface District {
  district_id: string;
  district_name: string;
}

const PROVINCES_API = "https://vapi.vnappmob.com/api/v2/province/";

const fetchProvinces = async () => {
  const res = await fetch(PROVINCES_API);
  const data = await res.json();
  return data?.results || [];
};

const fetchDistricts = async (provinceId: string) => {
  const res = await fetch(`${PROVINCES_API}district/${provinceId}`);
  const data = await res.json();
  return data?.results || [];
};

export default function ProfileEdit({
  profileData,
  error: initialError,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"info" | "avatar">("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);

  const [form, setForm] = useState({
    fullname: "",
    email: "",
    bio: "",
    instructor_description: "",
    facebook_url: "",
    birthday: "",
    conscious: "",
    district: "",
    citizenship_identity: "",
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const { data: provinces } = useSWR<Province[]>(PROVINCES_API, fetchProvinces);
  const { data: districts } = useSWR<District[]>(
    form.conscious ? `districts-${form.conscious}` : null,
    () => fetchDistricts(form.conscious)
  );

  useEffect(() => {
    if (profileData) {
      setForm({
        fullname: profileData.fullname || "",
        email: profileData.email || "",
        bio: profileData.bio || "",
        instructor_description: profileData.instructor_description || "",
        facebook_url: profileData.facebook_url || "",
        birthday: profileData.birthday || "",
        conscious: profileData.conscious || "",
        district: profileData.district || "",
        citizenship_identity: profileData.citizenship_identity || "",
      });
      if (profileData.avatar) {
        setAvatarPreview(getGoogleDriveImageUrl(profileData.avatar));
      }
    }
  }, [profileData]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file ảnh hợp lệ");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Kích thước file không được vượt quá 5MB");
      return;
    }

    setAvatarFile(file);
    setError("");

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) {
      setError("Vui lòng chọn file ảnh");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", avatarFile);

      await api.put("/profile/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      router.refresh();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Đã có lỗi xảy ra");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateBio = async () => {
    setGeneratingBio(true);
    setError("");

    try {
      const res = await api.post("/user/chat/profile/create_bio", {
        request: "viết thật hay vào",
      });

      let bioText = res.data;
      if (typeof bioText === "string") {
        bioText = bioText.replace(/^["']|["']$/g, "");
        setForm((prev) => ({ ...prev, bio: bioText }));
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Đã có lỗi xảy ra");
    } finally {
      setGeneratingBio(false);
    }
  };

  const handleUpdatePaypal = () => {
    const frontendReturnUrl = window.location.origin + "/lecturer/profile";
    const stateParam = btoa(frontendReturnUrl);
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const backendCallbackUrl = process.env.NEXT_PUBLIC_PAYPAL_REDIRECT_URI;
    const url = `https://www.sandbox.paypal.com/connect?flowEntry=static&client_id=${clientId}&response_type=code&scope=openid%20email&redirect_uri=${backendCallbackUrl}&state=${stateParam}`;
    window.location.href = url;
  };

  const hasChanges = () => {
    if (!profileData) return false;

    const normalize = (val: string) => val.trim() || null;

    const current = {
      fullname: normalize(form.fullname),
      bio: normalize(form.bio),
      instructor_description: normalize(form.instructor_description),
      facebook_url: normalize(form.facebook_url),
      birthday: form.birthday || null,
      conscious: form.conscious || null,
      district: form.district || null,
      citizenship_identity: normalize(form.citizenship_identity),
    };

    const original = {
      fullname: normalize(profileData.fullname || ""),
      bio: normalize(profileData.bio || ""),
      instructor_description: normalize(
        profileData.instructor_description || ""
      ),
      facebook_url: normalize(profileData.facebook_url || ""),
      birthday: profileData.birthday || null,
      conscious: profileData.conscious || null,
      district: profileData.district || null,
      citizenship_identity: normalize(profileData.citizenship_identity || ""),
    };

    return JSON.stringify(current) !== JSON.stringify(original);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.fullname.trim()) {
      setError("Họ và tên là bắt buộc");
      return;
    }

    if (!hasChanges()) {
      setError("Không có thay đổi nào để lưu");
      return;
    }

    setLoading(true);

    try {
      const data = {
        fullname: form.fullname.trim(),
        bio: form.bio.trim() || null,
        instructor_description: form.instructor_description.trim() || null,
        facebook_url: form.facebook_url.trim() || null,
        birthday: form.birthday || null,
        conscious: form.conscious || null,
        district: form.district || null,
        citizenship_identity: form.citizenship_identity.trim() || null,
      };

      await api.put("/profile", data);
      router.refresh();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  if (initialError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{initialError.message}</p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          <h1 className="text-2xl font-bold text-gray-800">Chỉnh sửa hồ sơ</h1>

          <div className="flex gap-2 border-b">
            <button
              type="button"
              onClick={() => setTab("info")}
              className={`px-4 py-2 font-semibold ${
                tab === "info"
                  ? "text-green-600 border-b-2 border-green-600"
                  : "text-gray-600"
              }`}
            >
              Thông tin
            </button>
            <button
              type="button"
              onClick={() => setTab("avatar")}
              className={`px-4 py-2 font-semibold ${
                tab === "avatar"
                  ? "text-green-600 border-b-2 border-green-600"
                  : "text-gray-600"
              }`}
            >
              Ảnh đại diện
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {tab === "info" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.fullname}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, fullname: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Giới thiệu
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateBio}
                    disabled={generatingBio}
                    className="px-3 py-1 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 disabled:opacity-50"
                  >
                    {generatingBio ? "Đang tạo..." : "Tạo bằng AI"}
                  </button>
                </div>
                <div className="border border-gray-300 rounded-lg">
                  <TiptapEditor
                    value={form.bio}
                    onChange={(markdown) =>
                      setForm((prev) => ({ ...prev, bio: markdown }))
                    }
                    placeholder="Viết giới thiệu về bản thân..."
                    minHeight="200px"
                    showToolbar={true}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Giới thiệu giảng viên
                </label>
                <div className="border border-gray-300 rounded-lg">
                  <TiptapEditor
                    value={form.instructor_description}
                    onChange={(markdown) =>
                      setForm((prev) => ({
                        ...prev,
                        instructor_description: markdown,
                      }))
                    }
                    placeholder="Viết giới thiệu về giảng viên..."
                    minHeight="200px"
                    showToolbar={true}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Facebook URL
                </label>
                <input
                  type="url"
                  value={form.facebook_url}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      facebook_url: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://facebook.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ngày sinh
                </label>
                <input
                  type="date"
                  value={form.birthday}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, birthday: e.target.value }))
                  }
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tỉnh/Thành phố
                  </label>
                  <select
                    value={form.conscious}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        conscious: e.target.value,
                        district: "",
                      }));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Chọn tỉnh/thành phố</option>
                    {provinces?.map((p) => (
                      <option key={p.province_id} value={p.province_id}>
                        {p.province_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quận/Huyện
                  </label>
                  <select
                    value={form.district}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, district: e.target.value }))
                    }
                    disabled={!form.conscious}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  >
                    <option value="">
                      {form.conscious ? "Chọn quận/huyện" : "Chọn tỉnh trước"}
                    </option>
                    {districts?.map((d) => (
                      <option key={d.district_id} value={d.district_id}>
                        {d.district_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Số CMND/CCCD
                </label>
                <input
                  type="text"
                  value={form.citizenship_identity}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      citizenship_identity: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email PayPal
                </label>
                <input
                  type="text"
                  value={profileData.paypal_email || ""}
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
                  placeholder="Nhấp nút cập nhật PayPal để lấy email"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  PayPal Payer ID
                </label>
                <input
                  type="text"
                  value={profileData.paypal_payer_id || ""}
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
                  placeholder="Nhấp nút cập nhật PayPal để lấy ID"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <button
                  type="button"
                  onClick={handleUpdatePaypal}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <BsPaypal className="h-5 w-5" />
                  Cập nhật PayPal
                </button>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !hasChanges()}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                {avatarPreview ? (
                  <img
                    src={
                      avatarPreview.startsWith("data:")
                        ? avatarPreview
                        : getGoogleDriveImageUrl(avatarPreview)
                    }
                    alt="Avatar"
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">Chưa có ảnh</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Chọn ảnh
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="avatar-input"
                />
                <label
                  htmlFor="avatar-input"
                  className="block w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-green-500 hover:bg-green-50"
                >
                  Chọn file ảnh
                </label>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Tối đa 5MB
                </p>
              </div>

              <div className="flex gap-4 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleUploadAvatar}
                  disabled={uploading || !avatarFile}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {uploading ? "Đang tải..." : "Tải lên"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
