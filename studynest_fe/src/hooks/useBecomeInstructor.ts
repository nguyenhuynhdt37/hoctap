import { useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/utils/helpers/toast";
import api from "@/lib/utils/fetcher/client/axios";

export const INSTRUCTOR_FEE = 1_000_000;

export function useBecomeInstructor() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const becomeInstructor = async (): Promise<boolean> => {
    setIsLoading(true);

    try {
      await api.post("/users/instructors/become");

      showToast.success("🎉 Chúc mừng! Bạn đã trở thành giảng viên");

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/lecturer");
      }, 1500);

      return true;
    } catch (error: any) {
      let errorMessage = "Đăng ký thất bại. Vui lòng thử lại sau.";
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      if (errorMessage.toLowerCase().includes("bạn đã là giảng viên")) {
        showToast.error("Bạn đã là giảng viên rồi");
        router.push("/lecturer");
      } else if (errorMessage.toLowerCase().includes("không đủ")) {
        // Could handle specific balance error logic here if needed
        showToast.error(errorMessage);
      } else {
        showToast.error(errorMessage);
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { becomeInstructor, isLoading };
}
