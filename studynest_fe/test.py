import json
import random
import time

import requests

# --- Cấu hình chung ---
URL = (
    "https://usmart.vinhuni.edu.vn/gwsg/dbdaotao_chinhquysv/DangKyHoc/SinhVienDangKyHoc"
)
DELAY_TIME = 60  # 1 phút

# Dữ liệu (Payload) gửi đi
PAYLOAD = {
    "idHocKy": 1031,
    "tuNgay": "2026-01-19T00:00:00.000Z",
    "denNgay": "2026-01-25T23:59:59.999Z",
    "codeNguoiHoc": "MA_SINH_VIEN_CUA_BAN",  # NHỚ ĐIỀN MSSV VÀO ĐÂY!
}

# Danh sách Proxy (Phải tự cung cấp để đổi IP)
PROXY_LIST = [
    # Thêm các Proxy của bạn vào đây!
    "http://ip1:port1",
    "http://ip2:port2",
]

# Headers MỚI (Lấy từ dữ liệu bạn cung cấp)
# CHÚ Ý: Token Authorization này có thời hạn sử dụng. Khi hết hạn, bạn cần lấy Token mới!
HEADERS = {
    # Các Header thiết yếu cho API
    "Authorization": "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjAwNTU2QzAzRkZBQTE5NTJCQUVGRTgxQzI1QjY0RDJFNDAxOUI3OTYiLCJ0eXAiOiJhdCtqd3QiLCJ4NXQiOiJBRlZzQV8tcUdWSzY3LWdjSmJaTkxrQVp0NVkifQ.eyJuYmYiOjE3NjUyNTIxOTIsImV4cCI6MTc2NjE1MjE5MiwiaXNzIjoiaHR0cHM6Ly9sb2dpbi52aW5odW5pLmVkdS52biIsImNsaWVudF9pZCI6ImUtdW5pdmVyc2l0eSIsInN1YiI6IjgzNTE4IiwiYXV0aF90aW1lIjoxNzY1MjUyMTkyLCJpZHAiOiJsb2NhbCIsInVzZXJpZCI6IjgzNTE4IiwidXNlcm5hbWUiOiIyNDU3MTQwMjQ5MzAwMTIiLCJkaXNwbGF5bmFtZSI6IkjGr8agTkciLCJlbWFpbCI6Im5vdGhpbmdfMjQ1NzE0MDI0OTMwMDEyQGdtYWlsLmNvbSIsImZ1bGxuYW1lIjoiSE_DgE5HIFRI4buKIEjGr8agTkciLCJpc3N1cGVydXNlciI6IkZhbHNlIiwiaXNhZG1pbiI6IkZhbHNlIiwiaW5zdGFuY2VpZCI6IjM3MDlhMzkyLTQzYmMtNDkyMS1iNzI5LTA0MDdjYTljNTJhOCIsInBvc2l0aW9uQ29kZSI6IiIsInVzZXJ0eXBlIjoiMSIsIm1hTmd1b2lIb2MiOiIyNDU3MTQwMjQ5MzAwMTIiLCJqdGkiOiJVYkZuRUxkNU5PS2dfNHFHVVNEX2V3Iiwic2NvcGUiOlsib3BlbmlkIiwicHJvZmlsZSIsImVtYWlsIl0sImFtciI6WyJwd2QiXX0.m5fl5mKZsZVx9dPXUxOfELGQN4ANv7JmQtwNHwy9r5wckzRfHhzhmX0Ncf23pUIZv47WelQuFQwakcTw4rsbCfYzfHuIMOtxGlq5vcjnF8eGQtg0b4_oUV5uE5ZzJ3q4oaOznt3b5OuOzsAxiFE06Ub6rlZ03yM7ob8IHMJHQaIoV797xnd_UDC4y1DtxesGKl807F74Jy3Fac5gvYGCcBzeRPxPcvHOMs20lfdc_XEFXgYYEXbeHPsZuoDcoZuNyCrmmwQDAtVm7j4lCJaGw_-7K76i3XindvpHkMS1T59ISOOAWsCfaqFVX7M2Moo6Lv8U9ak4Od_QoGDccw7aK6qd8VKZlo8v0wxQEb1PupWOVwYdZk8xFs91-eFP-_iRwHLzS0g1suC5JgHZup-Rvge7Qb9HXEjildu8lHkRes3TRK6hjA_M9yGCA62cWfDKG3MqxApW1jbQ1IQbCQl9HmBeCZeylkWsHekutQRHdyMrEF949k9b0IA1CG9CuFETLSXOJ6DR9xDno42lTD2SOAnAS4-ThXA2nVgcAqBjmrUU6FalViEpBx93qYT4hYjRQf3ARlhi7F7N5fsM3M5s2MBcpsKrSj9_8m31a2wk322Hd-3TAqjcCTulV5caYxXDYQDB7d9GLoNsSxMTa9kFjlyC9XQ4CTd9i9K8i5NudIY",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Host": "usmart.vinhuni.edu.vn",
    "Origin": "https://congsv.vinhuni.edu.vn",
    "Referer": "https://congsv.vinhuni.edu.vn/",
    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7,fr-FR;q=0.6,fr;q=0.5",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Connection": "keep-alive",
    # Các Header khác (chỉ nên giữ lại những cái cần thiết nhất để giảm độ dài request)
    # Cái này có thể cần phải thay đổi ngẫu nhiên
    "Traceid": "f8b4c85f-6555-9219-7d4e-e7cd004191ff",
    "portalalias": "https://congsv.vinhuni.edu.vn",
}


# --- Hàm tạo TraceID ngẫu nhiên (để tăng tính "sống") ---
def tao_traceid_ngau_nhien():
    """Tạo một chuỗi UUID giả để TraceID trông không lặp lại."""
    return f"{random.randrange(1, 99999999):08x}-{random.randrange(1000, 9999):04x}-4{random.randrange(1000, 9999):04x}-{random.randrange(1000, 9999):04x}-{random.randrange(100000000000, 999999999999):012x}"


# --- Hàm gửi Request ---
def gui_request_dang_ky(proxy):
    """Gửi POST request với Proxy đã chọn."""

    proxies = {"http": proxy, "https": proxy}

    # Cập nhật Header cho mỗi lần request
    current_headers = HEADERS.copy()

    # Gợi ý công nghệ mới nhất: Thay đổi TraceID để trông không phải máy móc
    current_headers["Traceid"] = tao_traceid_ngau_nhien()

    try:
        print(
            f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Đang gửi yêu cầu bằng Proxy: {proxy}..."
        )

        response = requests.post(
            URL,
            headers=current_headers,
            data=json.dumps(PAYLOAD),
            proxies=proxies,
            timeout=15,
        )

        print(f"   -> Status Code: {response.status_code}")

        # Xử lý kết quả
        if response.status_code == 200:
            print("   -> Phản hồi:", response.text)
            if "thành công" in response.text.lower():
                print("🚨🚨🚨 ĐĂNG KÝ THÀNH CÔNG! DỪNG LẠI! 🚨🚨🚨")
                return True
        elif response.status_code == 429:
            print("   -> LỖI: 429 Too Many Requests. Đổi IP/Proxy không hiệu quả!")
        elif response.status_code == 401:
            print(
                "   -> LỖI: 401 Unauthorized. TOKEN HẾT HẠN hoặc không hợp lệ. CẦN LẤY TOKEN MỚI."
            )
            return "TOKEN_EXPIRED"  # Trả về mã lỗi để xử lý ở hàm gọi
        else:
            print(f"   -> LỖI KHÁC ({response.status_code}):", response.text)

    except requests.exceptions.RequestException as e:
        print(f"   -> LỖI KẾT NỐI: {e}")

    return False


# --- Vòng lặp chính ---
def chay_tool_dang_ky():
    danh_sach_proxy = PROXY_LIST.copy()

    if not danh_sach_proxy:
        print(
            "Cảnh báo: PROXY_LIST trống. Yêu cầu sẽ được gửi từ IP máy bạn, chắc chắn bị chặn 429!"
        )

    while True:
        if not danh_sach_proxy:
            print("❌ Đã hết Proxy. Dừng tool.")
            break

        proxy_hien_tai = random.choice(danh_sach_proxy)

        ket_qua = gui_request_dang_ky(proxy_hien_tai)

        if ket_qua is True:
            print("✅ Đăng ký thành công! Dừng tool.")
            break
        elif ket_qua == "TOKEN_EXPIRED":
            print("❌ Token hết hạn. Dừng tool.")
            break

        # Loại bỏ Proxy đã dùng và chờ
        danh_sach_proxy.remove(proxy_hien_tai)
        print(
            f"   -> Loại bỏ Proxy vừa dùng. Còn lại {len(danh_sach_proxy)} Proxy.")

        print(f"   -> Chờ {DELAY_TIME} giây...")
        time.sleep(DELAY_TIME)


# --- Chạy chương trình ---
if __name__ == "__main__":
    chay_tool_dang_ky()
