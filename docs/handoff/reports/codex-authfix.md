Đã sửa đủ **17 test lỗi thời**. Cả 17 đều dừng trước hành vi cần kiểm tra vì fixture thiếu DPoP proof hoặc chưa khai báo chế độ legacy. Sau khi sửa fixture, các kiểm tra OTP, refresh và WebSocket đều qua. Trong cùng đợt rà soát, mình phát hiện và vá thêm một lỗi xác thực Google.

| Test | Kết luận | Nguyên nhân gốc và cách sửa | Tệp đã sửa |
|---|---|---|---|
| `test_verify_email_rejects_wrong_otp_code` | Test lỗi thời | Thiếu proof. Ký ES256 cho `/verify-email`, kiểm `400`, OTP chưa bị tiêu thụ và DB chưa commit. | `test_email_otp_verification.py` |
| `test_verify_email_accepts_matching_otp_and_consumes_codes` | Test lỗi thời | Thiếu proof. Kiểm OTP được tiêu thụ bằng `DELETE … RETURNING`, email được xác minh và phiên nhận đúng `jkt`. | `test_email_otp_verification.py` |
| `test_verify_otp_login_blocks_banned_user` | Test lỗi thời | Thiếu proof nên chưa tới kiểm tra khóa tài khoản. Thêm proof, kiểm `403 ACCOUNT_BANNED` trước khi đọc OTP. | `test_email_otp_verification.py` |
| `test_resend_cannot_activate_pending_hash_without_a_new_password` | Test lỗi thời | Bước xác minh sau resend thiếu proof. Thêm proof, kiểm email được xác minh và hash cũ vẫn bị loại bỏ. | `test_email_otp_verification.py` |
| `test_verified_email_can_choose_password_at_verification` | Test lỗi thời | Thiếu proof. Kiểm mật khẩu do chủ email chọn được băm và lưu khi xác minh thành công. | `test_email_otp_verification.py` |
| `test_login_pkce_nonce_and_minimal_scopes` | Test lỗi thời | Luồng nonce dùng cookie legacy đang tắt. Bật cờ trong fixture, kiểm PKCE S256, scope tối thiểu, nonce trình duyệt và state dùng một lần. | `test_github_auth.py` |
| `test_missing_client_id_fails_before_google_verification` | Test lỗi thời | Thiếu proof nên chưa tới kiểm tra client ID. Thêm proof, giữ kỳ vọng `503` và verifier chưa được gọi. | `test_google_login_config.py` |
| `test_configured_audience_is_passed_to_google` | Test lỗi thời | Thiếu proof nên verifier chưa được gọi. Thêm proof, kiểm verifier nhận đúng audience đã bỏ khoảng trắng. | `test_google_login_config.py` |
| `test_pending_account_cannot_be_activated_by_login_otp` | Test lỗi thời | Thiếu proof nên chưa tới kiểm tra tài khoản pending. Kiểm `403 EMAIL_NOT_VERIFIED` và phiên chưa được tạo. | `test_otp_hardening.py` |
| `test_session_creation_requires_delete_returning_to_win[login]` | Test lỗi thời | `401` do thiếu proof che mất nhánh thua khi tiêu thụ OTP. Thêm proof, kiểm `401 invalid_token`, `DELETE … RETURNING` và phiên chưa được tạo. | `test_otp_hardening.py` |
| `test_session_creation_requires_delete_returning_to_win[verify-email]` | Test lỗi thời | Thiếu proof nên chưa tới nhánh tiêu thụ OTP. Thêm proof, kiểm `400`, tài khoản vẫn pending và giao dịch chưa commit. | `test_otp_hardening.py` |
| `test_provider_failure_releases_own_lease_and_hides_upstream_secrets` | Test lỗi thời | Vé WebSocket legacy bị chặn bởi cờ cấu hình. Bật tương thích trong fixture, kiểm provider được gọi, lỗi trả về đã ẩn secret và lease được giải phóng bằng đúng giá trị sở hữu. | `test_realtime_dictation.py` |
| `test_concurrent_old_token_requests_share_one_rotation` | Test lỗi thời | Phiên unbound được refresh như nguồn JSON đang tắt. Khai báo nguồn cookie, cho 8 request chạy chồng nhau và kiểm chỉ một lần commit, cùng một cặp token. | `test_refresh_session.py` |
| `test_failed_commit_does_not_emit_unpersisted_credentials` | Test lỗi thời | Sai nguồn refresh nên chưa tới commit. Dùng nguồn cookie, kiểm rollback khi commit lỗi và cookie cùng cache đều rỗng. | `test_refresh_session.py` |
| `test_old_token_rejected_after_grace_cache_expires` | Test lỗi thời | Sai nguồn refresh và fixture chỉ xóa cache. Dùng nguồn cookie, mô phỏng qua 15 giây, kiểm token cũ bị từ chối và phiên cùng cookie mới được giữ. | `test_refresh_session.py` |
| `test_revocation_overrides_recent_cached_credentials` | Test lỗi thời | Sai nguồn refresh nên chưa tạo được cache. Dùng nguồn cookie, giữ cache rồi thu hồi phiên, kiểm `401 session_revoked`. | `test_refresh_session.py` |
| `test_rotation_is_committed_and_existing_device_id_is_retained` | Test lỗi thời | Test kỳ vọng cookie nhưng gọi refresh theo nhánh JSON. Dùng nguồn cookie, kiểm commit, SID giữ nguyên, hash mới và TTL grace 15 giây. | `test_refresh_session.py` |

Các test OTP và Google dùng chung fixture ký proof ES256. [conftest.py](/Users/huynh/codes/hoctap/studynest_be/tests/unit/conftest.py:18)

**Phát hiện bảo mật**

- **Đã vá** `/auth/google` từng dùng email từ ID token để tra cứu tài khoản dù claim `email_verified` bị thiếu hoặc là `false`. Backend giờ yêu cầu `email_verified is True` trước khi tra cứu hoặc cấp phiên. Test hồi quy xác nhận cả hai trường hợp. [Bản vá](/Users/huynh/codes/hoctap/studynest_be/app/services/shares/auth.py:586) · [Test hồi quy](/Users/huynh/codes/hoctap/studynest_be/tests/unit/test_google_login_config.py:50)
- **Còn mở** Backend vẫn ghép tài khoản theo email thay vì định danh Google `sub`. Với email bên thứ ba ngoài Gmail và Google Workspace, `email_verified=true` có thể phản ánh quyền sở hữu tại thời điểm xác minh ban đầu. Rủi ro đăng nhập nhầm tài khoản vẫn tồn tại nếu email đổi chủ. [Tra cứu hiện tại](/Users/huynh/codes/hoctap/studynest_be/app/services/shares/auth.py:594) · [Tài liệu Google] (https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)

**Kết quả cuối**

- `tests/unit` — **724 passed, 0 failed**, 15 subtest qua.
- `tests/integration` — **21 passed, 0 failed, 231 skipped** theo điều kiện có sẵn của suite. Các ca này cần PostgreSQL kiểm thử cô lập, hai ca còn cần bật chạy với mô hình thật.
- Gamification — **45/45 qua**.
- Năm script Node về DPoP, GitHub PKCE, refresh và dictation — **37/37 qua**, chạy không cần server.