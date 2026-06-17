import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Response interceptor: trả luôn data
api.interceptors.response.use(
  (response) => {
    console.log("Response:", response);
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.warn("❌ Phiên đăng nhập hết hạn hoặc cookie không hợp lệ");
      // 👉 có thể redirect /login hoặc refresh token ở đây
    }
    return Promise.reject(error);
  }
);

export default api;
