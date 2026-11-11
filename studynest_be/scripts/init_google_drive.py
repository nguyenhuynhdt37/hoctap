import asyncio
import sys
import os

# Thêm thư mục gốc studynest_be vào sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.shares.google_driver import GoogleDriveAsyncService


async def main():
    print("=" * 60)
    print("🚀 Bắt đầu xác thực Google Drive cho Mây Mây...")
    print("Trình duyệt sẽ tự động mở để bạn đăng nhập Google và cấp quyền.")
    print("=" * 60)
    service = await GoogleDriveAsyncService.create()
    print("=" * 60)
    print("🎉 Xác thực THÀNH CÔNG! Token đã được lưu tại app/core/secret/token.json")
    print("Từ bây giờ backend có thể tự do upload lên Google Drive.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
