# Danh mục đơn vị giáo dục Việt Nam

Thu thập 12/11/2026. Dữ liệu nhập là hồ sơ chờ admin xác minh, không phải tài khoản hoặc xác nhận pháp lý.

- `schools-2026-source.csv`: bảng nguồn 2026 công bố qua tuyển sinh Đại học Công nghiệp Quảng Ninh, cập nhật 09/05/2026. Giữ nguyên mã dạng chuỗi, bao gồm số 0 đầu.
- `directory.json`: 3.323 hồ sơ trường thuộc 34 tỉnh/thành, 17 đơn vị luyện thi có căn cứ nguồn. Có trường liên cấp; không tự gán công lập/tư thục khi nguồn không đủ rõ.
- `excluded-schools.json`: mã GDTX/nghề, tên lịch sử, mã dự phòng và trường hợp cần đối chiếu; không xóa khỏi bản nguồn.
- `crawl-report.json`: nguồn, SHA256, số lượng theo tỉnh và kết quả truy xuất trung tâm.
- `center-supplements.json`: nguồn do đơn vị/nhà phát triển công bố, đã đối chiếu khi direct crawl bị chặn. Giữ ngày kiểm tra thật; không giả response HTTP thành công.
- `import-history.jsonl`: các lần nhập và DB đích; không chứa thông tin kết nối/mật khẩu. `import-report.json` là lần chạy gần nhất.
- `logo-crawl-*.json`: lịch sử đối chiếu website, URL ảnh, hash, kết quả hoặc lý do không lấy được. Báo cáo lịch sử có thể trỏ tới key ảnh R2 đã bị loại/thay; tham chiếu hiện hành nằm trong DB và báo cáo chuẩn hóa.
- `logo-normalization-report.json`: đợt chuẩn hóa logo đã crawl, thay key bất biến; không ghi đè ảnh admin đã thay hoặc hồ sơ đã xác minh.

Đã có 216 logo trong R2 (207 trường, 9 đơn vị luyện thi), không phải mọi hồ sơ đều có ảnh. Có 321 website đối chiếu được từ nguồn đã truy xuất; những website lỗi/không có logo rõ ràng được ghi nhận thay vì gán ảnh đại diện giả. Crawler loại logo chung của Sở/cổng thông tin và ảnh trùng giữa các hồ sơ chưa xác minh.

Các lệnh chạy từ `studynest_be/`:

```sh
.venv/bin/python scripts/import_provider_directory.py          # tải dữ liệu, xuất báo cáo
.venv/bin/python scripts/import_provider_directory.py --apply  # nhập không trùng, không đè sửa đổi của admin
.venv/bin/python scripts/crawl_provider_logos.py --apply       # đối chiếu danh bạ, tải ảnh hợp lệ vào R2
.venv/bin/python scripts/crawl_provider_logos.py --apply --skip-discovery  # tiếp tục từ website đã đối chiếu
.venv/bin/python scripts/normalize_provider_logos.py --apply  # chuẩn hóa ảnh crawler đang pending, không đè ảnh admin
```

Các lệnh ghi sử dụng DB/R2 được cấu hình trong môi trường hiện hành. Không đổi namespace danh mục 2026 sang năm khác trước khi đối chiếu mã trường, đổi tên và sáp nhập. Không tự đánh dấu verified hoặc tự cấp liên kết giảng viên khi nhập.


Trạng thái kết nối cuối lượt: R2 đang bị Vingroup Web Gateway thay chuỗi chứng chỉ; chưa có CA gốc tin cậy cho Python. Không tắt xác minh TLS. 216 logo hiện hành vẫn giữ đủ; 183 đã chuẩn hóa khung v2, 33 vẫn là bản canvas 512x512 trước đó. `logo-normalization-report.json` ghi phần cần retry/rà soát; cần CA do IT cấp hoặc mạng truy cập trực tiếp trước khi chạy tiếp.
