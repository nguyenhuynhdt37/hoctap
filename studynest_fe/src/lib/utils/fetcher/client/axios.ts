import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string | null) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: trả luôn data và tự động refresh token
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Skip các endpoint auth để tránh loop
    if (
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/logout") ||
      originalRequest.url?.includes("/auth/login")
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Gọi API refresh (Next.js rewrites sẽ tự proxy qua backend)
        await axios.post("/api/auth/refresh", {}, { withCredentials: true });
        
        isRefreshing = false;
        processQueue(null);
        
        // Gửi lại request ban đầu
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);
        
        console.warn("❌ Phiên đăng nhập hết hạn hoặc cookie không hợp lệ");
        
        // Chuyển hướng người dùng về trang login nếu đang ở trình duyệt
        if (typeof window !== "undefined") {
          window.location.href = `/login?redirect=${encodeURIComponent(
            window.location.pathname
          )}`;
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
