"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { UserProfile } from "@/types/user/profile";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import AvatarUpload from "./edit/avatar-upload";
import ErrorDisplay from "./edit/error-display";
import ErrorState from "./edit/error-state";
import LoadingState from "./loading-state";
import PersonalInfoForm from "./personal-info-form";
import ProfileTabs from "./profile-tabs";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface ProfileEditProps {
  profileData: UserProfile | null;
  error?: { status: number; message: string } | undefined;
}

interface ValidationResult {
  isValid: boolean;
  message: string;
}

interface Province {
  province_id: string;
  province_name: string;
}

interface District {
  district_id: string;
  district_name: string;
}

// ============================================================================
// Constants
// ============================================================================

const PROVINCES_API = "https://vapi.vnappmob.com/api/v2/province/";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_BIO_PROMPT = "viết thật hay vào";

// ============================================================================
// Helper Functions
// ============================================================================

const fetchProvinces = async (): Promise<Province[]> => {
  const response = await fetch(PROVINCES_API);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  if (data?.results && Array.isArray(data.results)) {
    return data.results.map((item: any) => ({
      province_id: item.province_id,
      province_name: item.province_name,
    }));
  }
  return [];
};

const fetchDistricts = async (provinceId: string): Promise<District[]> => {
  const url = `https://vapi.vnappmob.com/api/v2/province/district/${provinceId}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  if (data?.results && Array.isArray(data.results)) {
    return data.results.map((item: any) => ({
      district_id: item.district_id,
      district_name: item.district_name,
    }));
  }
  return [];
};

const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, message: "Email là bắt buộc" };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: "Email không đúng định dạng" };
  }
  return { isValid: true, message: "" };
};

const validateFullName = (fullName: string): ValidationResult => {
  if (!fullName || fullName.trim().length === 0) {
    return { isValid: false, message: "Họ và tên là bắt buộc" };
  }
  if (fullName.trim().length < 2) {
    return { isValid: false, message: "Họ và tên phải có ít nhất 2 ký tự" };
  }
  const nameRegex =
    /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s]+$/;
  if (!nameRegex.test(fullName)) {
    return {
      isValid: false,
      message: "Họ và tên chỉ được chứa chữ cái và khoảng trắng",
    };
  }
  return { isValid: true, message: "" };
};

const validateImageFile = (file: File): string | null => {
  if (!file.type.startsWith("image/")) {
    return "Vui lòng chọn file ảnh hợp lệ";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "Kích thước file không được vượt quá 5MB";
  }
  return null;
};

const extractErrorMessage = (error: any): string => {
  if (error?.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  return "Đã có lỗi xảy ra. Vui lòng thử lại sau.";
};

const normalizeFormValue = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

// ============================================================================
// Main Component
// ============================================================================

export default function ProfileEdit({
  profileData,
  error: initialError,
}: ProfileEditProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoadRef = useRef(true);

  // ============================================================================
  // State Management
  // ============================================================================

  const [activeTab, setActiveTab] = useState<"info" | "avatar">("info");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [showBioPromptModal, setShowBioPromptModal] = useState(false);
  const [bioPrompt, setBioPrompt] = useState(DEFAULT_BIO_PROMPT);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form fields
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [birthday, setBirthday] = useState("");
  const [conscious, setConscious] = useState("");
  const [district, setDistrict] = useState("");
  const [citizenshipIdentity, setCitizenshipIdentity] = useState("");

  // Validation states
  const [fullnameError, setFullnameError] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [touched, setTouched] = useState({
    fullname: false,
    email: false,
  });

  // ============================================================================
  // Data Fetching (SWR)
  // ============================================================================

  const {
    data: provincesData,
    isLoading: isLoadingProvinces,
    error: provincesError,
  } = useSWR<Province[]>(PROVINCES_API, fetchProvinces, {
    revalidateOnFocus: false,
    onError: (error) => {
      console.error("SWR Error fetching provinces:", error);
    },
  });

  const {
    data: districtsData,
    isLoading: isLoadingDistricts,
    error: districtsError,
  } = useSWR<District[]>(
    conscious ? `districts-${conscious}` : null,
    () => fetchDistricts(conscious),
    {
      revalidateOnFocus: false,
      onError: (error) => {
        console.error("SWR Error fetching districts:", error);
      },
    }
  );

  // ============================================================================
  // Effects
  // ============================================================================

  // Initialize form with profile data
  useEffect(() => {
    if (profileData && isInitialLoadRef.current) {
      setFullname(profileData.fullname || "");
      setEmail(profileData.email || "");
      setBio(profileData.bio || "");
      setFacebookUrl(profileData.facebook_url || "");
      setBirthday(profileData.birthday || "");
      setConscious(profileData.conscious || "");
      setCitizenshipIdentity(profileData.citizenship_identity || "");
      if (profileData.avatar) {
        setAvatarPreview(getGoogleDriveImageUrl(profileData.avatar));
      }
      isInitialLoadRef.current = false;
    }
  }, [profileData]);

  // Set district after districts are loaded (for initial load)
  useEffect(() => {
    if (
      profileData?.district &&
      districtsData &&
      districtsData.length > 0 &&
      !district &&
      conscious === profileData.conscious
    ) {
      const districtExists = districtsData.some(
        (d) => d.district_id === profileData.district
      );
      if (districtExists) {
        setDistrict(profileData.district);
      }
    }
  }, [districtsData, profileData, district, conscious]);

  // Reset district when province changes (only if user manually changes it)
  useEffect(() => {
    if (!isInitialLoadRef.current) {
      setDistrict("");
    }
  }, [conscious]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const hasChanges = useMemo(() => {
    if (!profileData) return false;

    const currentValues = {
      fullname: fullname.trim(),
      bio: normalizeFormValue(bio),
      facebook_url: normalizeFormValue(facebookUrl),
      birthday: birthday || null,
      conscious: normalizeFormValue(conscious),
      district: normalizeFormValue(district),
      citizenship_identity: normalizeFormValue(citizenshipIdentity),
    };

    const originalValues = {
      fullname: profileData.fullname || "",
      bio: profileData.bio || null,
      facebook_url: profileData.facebook_url || null,
      birthday: profileData.birthday || null,
      conscious: profileData.conscious || null,
      district: profileData.district || null,
      citizenship_identity: profileData.citizenship_identity || null,
    };

    return JSON.stringify(currentValues) !== JSON.stringify(originalValues);
  }, [
    profileData,
    fullname,
    bio,
    facebookUrl,
    birthday,
    conscious,
    district,
    citizenshipIdentity,
  ]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleFullnameChange = (value: string) => {
    setFullname(value);
    if (touched.fullname) {
      const validation = validateFullName(value);
      setFullnameError(validation.isValid ? "" : validation.message);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (touched.email) {
      const validation = validateEmail(value);
      setEmailError(validation.isValid ? "" : validation.message);
    }
  };

  const handleBlur = (field: "fullname" | "email") => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    if (field === "fullname") {
      const validation = validateFullName(fullname);
      setFullnameError(validation.isValid ? "" : validation.message);
    } else if (field === "email") {
      const validation = validateEmail(email);
      setEmailError(validation.isValid ? "" : validation.message);
    }
  };

  const validateForm = (): boolean => {
    const fullnameValidation = validateFullName(fullname);
    setFullnameError(
      fullnameValidation.isValid ? "" : fullnameValidation.message
    );
    return fullnameValidation.isValid;
  };

  const handleGenerateBio = async (customPrompt?: string) => {
    setIsGeneratingBio(true);
    setError("");
    setShowBioPromptModal(false);

    try {
      const prompt = customPrompt || bioPrompt || DEFAULT_BIO_PROMPT;
      const response = await api.post("/user/chat/profile/create_bio", {
        request: prompt,
      });

      let bioText = response.data;
      if (typeof bioText === "string") {
        bioText = bioText.replace(/^["']|["']$/g, "");
        setBio(bioText);
      }
    } catch (error: any) {
      console.error("Error generating bio:", error);
      setError(
        extractErrorMessage(error) ||
          "Đã có lỗi xảy ra khi tạo bio. Vui lòng thử lại sau."
      );
    } finally {
      setIsGeneratingBio(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    setError("");

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = async () => {
    if (!selectedFile) {
      setError("Vui lòng chọn file ảnh");
      return;
    }

    setIsUploadingAvatar(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await api.put("/profile/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data?.avatar) {
        setAvatarPreview(getGoogleDriveImageUrl(response.data.avatar));
        setSelectedFile(null);
      }

      router.refresh();
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      setError(
        extractErrorMessage(error) ||
          "Đã có lỗi xảy ra khi tải lên ảnh. Vui lòng thử lại sau."
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTouched({ fullname: true, email: true });

    if (!validateForm()) {
      return;
    }

    if (!hasChanges) {
      setError("Không có thay đổi nào để lưu");
      return;
    }

    setIsLoading(true);

    try {
      const updateData = {
        fullname: fullname.trim(),
        bio: normalizeFormValue(bio),
        facebook_url: normalizeFormValue(facebookUrl),
        birthday: birthday || null,
        conscious: normalizeFormValue(conscious),
        district: normalizeFormValue(district),
        citizenship_identity: normalizeFormValue(citizenshipIdentity),
      };

      await api.put("/profile", updateData);
      router.refresh();
      setError("");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setError(extractErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBioPromptKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerateBio(bioPrompt.trim() || undefined);
    }
    if (e.key === "Escape") {
      setShowBioPromptModal(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (initialError) {
    return <ErrorState message={initialError.message} />;
  }

  if (!profileData) {
    return <LoadingState />;
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-emerald-50">
      <div className="relative flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-2">
        <div className="w-full max-w-7xl">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/40 p-8 space-y-6">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Chỉnh sửa hồ sơ
              </h1>
              <p className="text-gray-600 mt-2">
                Cập nhật thông tin cá nhân của bạn
              </p>
            </div>

            {/* Tabs */}
            <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Error message */}
            <ErrorDisplay message={error} />

            {/* Tab Content */}
            {activeTab === "info" ? (
              <PersonalInfoForm
                fullname={fullname}
                email={email}
                bio={bio}
                facebookUrl={facebookUrl}
                birthday={birthday}
                conscious={conscious}
                district={district}
                citizenshipIdentity={citizenshipIdentity}
                fullnameError={fullnameError}
                touched={touched}
                hasChanges={hasChanges}
                isLoading={isLoading}
                isGeneratingBio={isGeneratingBio}
                showBioPromptModal={showBioPromptModal}
                bioPrompt={bioPrompt}
                provincesData={provincesData}
                districtsData={districtsData}
                isLoadingProvinces={isLoadingProvinces}
                isLoadingDistricts={isLoadingDistricts}
                provincesError={provincesError}
                districtsError={districtsError}
                onFullnameChange={handleFullnameChange}
                onEmailChange={handleEmailChange}
                onBioChange={setBio}
                onFacebookUrlChange={setFacebookUrl}
                onBirthdayChange={setBirthday}
                onConsciousChange={setConscious}
                onDistrictChange={setDistrict}
                onCitizenshipIdentityChange={setCitizenshipIdentity}
                onBlur={handleBlur}
                onToggleBioPromptModal={() =>
                  setShowBioPromptModal(!showBioPromptModal)
                }
                onBioPromptChange={setBioPrompt}
                onGenerateBio={handleGenerateBio}
                onBioPromptKeyDown={handleBioPromptKeyDown}
                onSubmit={handleSubmit}
              />
            ) : (
              <AvatarUpload
                avatarPreview={avatarPreview}
                selectedFile={selectedFile}
                isUploadingAvatar={isUploadingAvatar}
                onFileSelect={handleFileSelect}
                onUploadAvatar={handleUploadAvatar}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
