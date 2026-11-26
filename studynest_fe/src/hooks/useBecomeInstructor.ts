import { useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/utils/helpers/toast";
import api from "@/lib/utils/fetcher/client/axios";
import { useUserStore } from "@/stores/user";

export const INSTRUCTOR_FEE = 1_000_000;

export interface BecomeInstructorOptions {
  autoRedirect?: boolean;
  redirectDelayMs?: number;
}

export function useBecomeInstructor() {
  const router = useRouter();
  const setUser = useUserStore((s) => s.setUser);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const becomeInstructor = async (
    options?: BecomeInstructorOptions,
  ): Promise<boolean> => {
    const autoRedirect = options?.autoRedirect ?? true;
    const redirectDelayMs = options?.redirectDelayMs ?? 1500;

    setIsLoading(true);
    setLastError(null);

    try {
      await api.post("/users/instructors/become");

      // Đồng bộ lại thông tin user (đã có thêm role LECTURER) trước khi điều hướng
      try {
        const meRes = await api.get("/auth/me");
        if (meRes.data?.id) {
          setUser(meRes.data);
        }
      } catch {
        // Không chặn luồng thành công nếu refresh store tạm lỗi
      }

      showToast.success("Chúc mừng! Đã thanh toán 100 Coin & kích hoạt Giảng viên thành công.");

      if (autoRedirect) {
        window.setTimeout(() => {
          router.push("/lecturer");
          router.refresh();
        }, redirectDelayMs);
      }

      return true;
    } catch (error: unknown) {
      const errObj = error as {
        response?: { data?: { detail?: string; message?: string } };
      };
      let errorMessage = "Đăng ký thất bại. Vui lòng thử lại sau.";
      if (errObj?.response?.data?.detail) {
        errorMessage = errObj.response.data.detail;
      } else if (errObj?.response?.data?.message) {
        errorMessage = errObj.response.data.message;
      }

      setLastError(errorMessage);

      if (errorMessage.toLowerCase().includes("bạn đã là giảng viên")) {
        showToast.info("Tài khoản của bạn đã là Giảng viên rồi.");
        if (autoRedirect) {
          router.push("/lecturer");
        }
        return true;
      }

      showToast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { becomeInstructor, isLoading, lastError };
}
