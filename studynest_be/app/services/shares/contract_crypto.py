"""Core Crypto PKI (X.509, RSA-2048, AES-256-GCM) & PAdES PDF Engine cho Mây Mây Digital Contract Studio."""

from __future__ import annotations

import base64
import datetime
import hashlib
import hmac
import io
import json
import os
import secrets
from pathlib import Path
from typing import Any

import qrcode
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.sign import signers
from pyhanko.sign.fields import SigSeedSubFilter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image as RLImage,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.core.settings import settings

_FONT_REGISTERED = False
_FONT_REGULAR = "Times-Roman"
_FONT_BOLD = "Times-Bold"
_FONT_ITALIC = "Times-Italic"


def _ensure_vietnamese_fonts() -> tuple[str, str, str]:
    """Đăng ký bộ font Times New Roman chuẩn hợp đồng Việt Nam (Nghị định 30/2020/NĐ-CP)."""
    global _FONT_REGISTERED, _FONT_REGULAR, _FONT_BOLD, _FONT_ITALIC
    if _FONT_REGISTERED:
        return _FONT_REGULAR, _FONT_BOLD, _FONT_ITALIC

    candidates_regular = [
        "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSerif-Regular.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    ]
    candidates_bold = [
        "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSerif-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    ]
    candidates_italic = [
        "/System/Library/Fonts/Supplemental/Times New Roman Italic.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSerif-Italic.ttf",
        "/System/Library/Fonts/Supplemental/Arial Italic.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf",
    ]
    candidates_bold_italic = [
        "/System/Library/Fonts/Supplemental/Times New Roman Bold Italic.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-BoldItalic.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSerif-BoldItalic.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold Italic.ttf",
    ]

    reg_path = next((p for p in candidates_regular if Path(p).exists()), None)
    bold_path = next((p for p in candidates_bold if Path(p).exists()), reg_path)
    italic_path = next((p for p in candidates_italic if Path(p).exists()), reg_path)
    bi_path = next((p for p in candidates_bold_italic if Path(p).exists()), bold_path)

    if reg_path:
        try:
            pdfmetrics.registerFont(TTFont("MMTimes", reg_path))
            _FONT_REGULAR = "MMTimes"
        except Exception:
            pass
    if bold_path:
        try:
            pdfmetrics.registerFont(TTFont("MMTimesBold", bold_path))
            _FONT_BOLD = "MMTimesBold"
        except Exception:
            _FONT_BOLD = _FONT_REGULAR
    if italic_path:
        try:
            pdfmetrics.registerFont(TTFont("MMTimesItalic", italic_path))
            _FONT_ITALIC = "MMTimesItalic"
        except Exception:
            _FONT_ITALIC = _FONT_REGULAR
    if bi_path:
        try:
            pdfmetrics.registerFont(TTFont("MMTimesBoldItalic", bi_path))
        except Exception:
            pass

    if _FONT_REGULAR == "MMTimes":
        try:
            pdfmetrics.registerFontFamily(
                "MMTimes",
                normal="MMTimes",
                bold=_FONT_BOLD,
                italic=_FONT_ITALIC,
                boldItalic="MMTimesBoldItalic" if bi_path else _FONT_BOLD,
            )
        except Exception:
            pass

    _FONT_REGISTERED = True
    return _FONT_REGULAR, _FONT_BOLD, _FONT_ITALIC


def _platform_secret_bytes() -> bytes:
    secret = (
        getattr(settings, "JWT_SECRET_KEY", None)
        or getattr(settings, "SECRET_KEY", None)
        or "maymay-digital-contract-default-secret"
    )
    return str(secret).encode("utf-8")


def _derive_aes_key(passphrase: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=120_000,
    )
    return kdf.derive(passphrase.encode("utf-8"))


def encrypt_private_key_pem(private_key_pem: bytes, passphrase: str) -> tuple[str, str, str]:
    """Mã hóa Private Key bằng AES-256-GCM với khóa dẫn xuất từ PIN/passphrase."""
    salt = secrets.token_bytes(16)
    iv = secrets.token_bytes(12)
    aes_key = _derive_aes_key(passphrase, salt)
    ct = AESGCM(aes_key).encrypt(iv, private_key_pem, None)
    return (
        base64.b64encode(ct).decode("ascii"),
        base64.b64encode(salt).decode("ascii"),
        base64.b64encode(iv).decode("ascii"),
    )


def decrypt_private_key_pem(
    encrypted_b64: str, salt_b64: str, iv_b64: str, passphrase: str
) -> bytes:
    """Giải mã Private Key AES-256-GCM. Ném ValueError nếu PIN/passphrase sai."""
    try:
        ct = base64.b64decode(encrypted_b64)
        salt = base64.b64decode(salt_b64)
        iv = base64.b64decode(iv_b64)
        aes_key = _derive_aes_key(passphrase, salt)
        return AESGCM(aes_key).decrypt(iv, ct, None)
    except Exception as exc:
        raise ValueError("Mã PIN ký số không chính xác.") from exc


def generate_platform_ca_cert() -> dict[str, Any]:
    """Khởi tạo Chứng thư số gốc X.509 cho Mây Mây Digital CA (hiệu lực 10 năm)."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    now = datetime.datetime.now(datetime.timezone.utc)
    valid_until = now + datetime.timedelta(days=3650)
    serial = x509.random_serial_number()

    subject = issuer = x509.Name(
        [
            x509.NameAttribute(NameOID.COUNTRY_NAME, "VN"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "May May Education Platform"),
            x509.NameAttribute(NameOID.COMMON_NAME, "May May Digital CA"),
        ]
    )

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(private_key.public_key())
        .serial_number(serial)
        .not_valid_before(now - datetime.timedelta(minutes=5))
        .not_valid_after(valid_until)
        .add_extension(x509.BasicConstraints(ca=True, path_length=1), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                content_commitment=True,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=True,
                crl_sign=True,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .sign(private_key, hashes.SHA256())
    )

    priv_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    pub_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    cert_pem = cert.public_bytes(serialization.Encoding.PEM)

    enc_priv, salt_b64, iv_b64 = encrypt_private_key_pem(
        priv_pem, _platform_secret_bytes().decode("utf-8", errors="ignore")
    )

    return {
        "serial_number": format(serial, "X"),
        "subject_cn": "Mây Mây Digital CA",
        "issuer_cn": "Mây Mây Digital CA",
        "public_key_pem": pub_pem.decode("ascii"),
        "certificate_pem": cert_pem.decode("ascii"),
        "encrypted_private_key": enc_priv,
        "key_salt": salt_b64,
        "key_iv": iv_b64,
        "valid_from": now,
        "valid_until": valid_until,
    }


def issue_user_x509_cert(
    *,
    ca_cert_pem: str,
    ca_private_key_pem: bytes,
    fullname: str,
    email: str,
    cccd: str,
    pin: str,
) -> dict[str, Any]:
    """Cấp Chứng thư số X.509 cho Giảng viên, ký bởi Mây Mây Digital CA, bảo vệ bằng PIN."""
    ca_cert = x509.load_pem_x509_certificate(ca_cert_pem.encode("ascii"))
    ca_key = serialization.load_pem_private_key(ca_private_key_pem, password=None)

    user_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    now = datetime.datetime.now(datetime.timezone.utc)
    valid_until = now + datetime.timedelta(days=730)  # 2 năm
    serial = x509.random_serial_number()

    attrs = [
        x509.NameAttribute(NameOID.COUNTRY_NAME, "VN"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "May May Lecturer Partner"),
        x509.NameAttribute(NameOID.COMMON_NAME, fullname or email),
        x509.NameAttribute(NameOID.EMAIL_ADDRESS, email),
    ]
    if cccd:
        attrs.append(x509.NameAttribute(NameOID.SERIAL_NUMBER, f"CCCD:{cccd}"))

    cert = (
        x509.CertificateBuilder()
        .subject_name(x509.Name(attrs))
        .issuer_name(ca_cert.subject)
        .public_key(user_key.public_key())
        .serial_number(serial)
        .not_valid_before(now - datetime.timedelta(minutes=5))
        .not_valid_after(valid_until)
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                content_commitment=True,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=False,
                crl_sign=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .sign(ca_key, hashes.SHA256())
    )

    priv_pem = user_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    pub_pem = user_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    cert_pem = cert.public_bytes(serialization.Encoding.PEM)

    enc_priv, salt_b64, iv_b64 = encrypt_private_key_pem(priv_pem, pin)

    return {
        "serial_number": format(serial, "X"),
        "subject_cn": fullname or email,
        "subject_email": email,
        "subject_cccd": cccd,
        "issuer_cn": "Mây Mây Digital CA",
        "public_key_pem": pub_pem.decode("ascii"),
        "certificate_pem": cert_pem.decode("ascii"),
        "encrypted_private_key": enc_priv,
        "key_salt": salt_b64,
        "key_iv": iv_b64,
        "valid_from": now,
        "valid_until": valid_until,
    }


def load_external_p12(p12_bytes: bytes, password: str) -> tuple[bytes, str, str, str]:
    """Đọc tệp chứng thư số cá nhân .p12/.pfx trong RAM (không lưu Private Key)."""
    try:
        priv_key, cert, _ = pkcs12.load_key_and_certificates(
            p12_bytes,
            password.encode("utf-8") if password else None,
        )
    except Exception as exc:
        raise ValueError(
            "Không thể giải mã tệp chứng thư số (.p12/.pfx). Vui lòng kiểm tra lại mật khẩu."
        ) from exc

    if priv_key is None or cert is None:
        raise ValueError("Tệp .p12/.pfx không chứa đủ khóa bí mật và chứng thư số.")

    priv_pem = priv_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    cert_pem = cert.public_bytes(serialization.Encoding.PEM).decode("ascii")
    serial_hex = format(cert.serial_number, "X")
    cn_attrs = cert.subject.get_attributes_for_oid(NameOID.COMMON_NAME)
    subject_cn = cn_attrs[0].value if cn_attrs else "External Certificate"
    return priv_pem, cert_pem, serial_hex, str(subject_cn)


def compute_document_hash(
    *,
    contract_number: str,
    rendered_content: str,
    terms_snapshot: dict[str, Any],
    party_b_user_id: str,
    signed_at_iso: str,
) -> str:
    """Tính mã băm SHA-256 bất biến cho toàn bộ hồ sơ hợp đồng."""
    payload = {
        "contract_number": contract_number,
        "rendered_content": rendered_content,
        "terms_snapshot": terms_snapshot,
        "party_b_user_id": party_b_user_id,
        "signed_at": signed_at_iso,
    }
    canonical = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def compute_hmac_seal(document_hash: str, digital_signature_b64: str) -> str:
    """Tính dấu niêm phong HMAC-SHA256 từ khóa hệ thống để chống giả mạo DB."""
    msg = f"{document_hash}:{digital_signature_b64}".encode("utf-8")
    return hmac.new(_platform_secret_bytes(), msg, hashlib.sha256).hexdigest()


def sign_hash_with_private_key(document_hash: str, private_key_pem: bytes) -> str:
    """Ký mật mã RSA-PSS (SHA-256) trên mã băm hợp đồng."""
    priv_key = serialization.load_pem_private_key(private_key_pem, password=None)
    signature = priv_key.sign(
        document_hash.encode("utf-8"),
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH,
        ),
        hashes.SHA256(),
    )
    return base64.b64encode(signature).decode("ascii")


def verify_signature_with_cert(
    document_hash: str, digital_signature_b64: str, certificate_pem: str
) -> bool:
    """Xác minh chữ ký số mật mã bằng Public Key trích xuất từ Chứng thư X.509."""
    try:
        cert = x509.load_pem_x509_certificate(certificate_pem.encode("ascii"))
        pub_key = cert.public_key()
        sig_bytes = base64.b64decode(digital_signature_b64)
        pub_key.verify(
            sig_bytes,
            document_hash.encode("utf-8"),
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH,
            ),
            hashes.SHA256(),
        )
        return True
    except Exception:
        return False


def _build_qr_png(url: str) -> io.BytesIO:
    qr = qrcode.QRCode(version=2, box_size=4, border=1)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1D3557", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


async def generate_signed_contract_pdf(
    *,
    contract_number: str,
    title: str,
    rendered_content: str,
    signer_name: str,
    signer_email: str,
    signer_cccd: str | None,
    signed_at_str: str,
    document_hash: str | None,
    cert_serial: str | None,
    signature_image_data: str | None,
    verify_url: str,
    ca_private_key_pem: bytes | None = None,
    ca_cert_pem: str | None = None,
    is_countersigned: bool = False,
    is_draft: bool = False,
) -> bytes:
    """Sinh PDF chuẩn A4 tiếng Việt (Times New Roman + Bảng biểu) và nhúng chữ ký số PAdES."""
    font_reg, font_bold, font_italic = _ensure_vietnamese_fonts()
    pdf_buf = io.BytesIO()

    doc = SimpleDocTemplate(
        pdf_buf,
        pagesize=A4,
        leftMargin=22 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"{contract_number} - {title}",
        author="Mây Mây Digital Contract Studio",
    )

    styles = getSampleStyleSheet()
    style_center_bold = ParagraphStyle(
        "MMCenterBold",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=12,
        leading=16,
        alignment=1,
        textColor=colors.black,
    )
    style_center_sub = ParagraphStyle(
        "MMCenterSub",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=11,
        leading=15,
        alignment=1,
        textColor=colors.black,
    )
    style_italic_note = ParagraphStyle(
        "MMItalicNote",
        parent=styles["Normal"],
        fontName=font_italic,
        fontSize=10,
        leading=14,
        alignment=0,
        textColor=colors.HexColor("#1F2937"),
    )
    style_title = ParagraphStyle(
        "MMTitle",
        parent=styles["Heading1"],
        fontName=font_bold,
        fontSize=14,
        leading=19,
        alignment=1,
        spaceBefore=8,
        spaceAfter=4,
        textColor=colors.black,
    )
    style_heading = ParagraphStyle(
        "MMHeading",
        parent=styles["Heading2"],
        fontName=font_bold,
        fontSize=11.5,
        leading=16,
        spaceBefore=10,
        spaceAfter=4,
        textColor=colors.black,
    )
    style_body = ParagraphStyle(
        "MMBody",
        parent=styles["Normal"],
        fontName=font_reg,
        fontSize=11,
        leading=16,
        alignment=4,  # Justify
        spaceAfter=3.5,
        textColor=colors.black,
    )
    style_table_head = ParagraphStyle(
        "MMTableHead",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=9.5,
        leading=13,
        textColor=colors.black,
    )
    style_table_cell = ParagraphStyle(
        "MMTableCell",
        parent=styles["Normal"],
        fontName=font_reg,
        fontSize=9.5,
        leading=13.5,
        textColor=colors.black,
    )
    style_stamp = ParagraphStyle(
        "MMStamp",
        parent=styles["Normal"],
        fontName=font_reg,
        fontSize=8.5,
        leading=12,
        textColor=colors.black,
    )

    def _esc(txt: str) -> str:
        return (
            txt.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
        )

    story: list[Any] = [
        Paragraph("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", style_center_bold),
        Paragraph("Độc lập - Tự do - Hạnh phúc", style_center_sub),
        Paragraph("───────────────", style_center_sub),
        Spacer(1, 6),
        Paragraph(_esc(title.upper()), style_title),
        Paragraph(f"Số: <b>{_esc(contract_number)}</b>", style_center_sub),
    ]

    if is_draft:
        story.append(Spacer(1, 4))
        story.append(
            Paragraph(
                "<i>(BẢN THẢO XEM TRƯỚC — CHƯA ĐƯỢC KÝ ĐIỆN TỬ &amp; CHƯA CÓ GIÁ TRỊ PHÁP LÝ)</i>",
                ParagraphStyle(
                    "MMDraftBanner",
                    parent=style_italic_note,
                    alignment=1,
                    textColor=colors.HexColor("#7F1D1D"),
                ),
            )
        )

    story.append(Spacer(1, 8))
    story.append(
        Paragraph(
            "- Căn cứ Bộ luật Dân sự nước Cộng hòa Xã hội Chủ nghĩa Việt Nam hiện hành;<br/>"
            "- Căn cứ Luật Giao dịch điện tử số 20/2023/QH15 về giá trị pháp lý của hợp đồng và chữ ký điện tử;<br/>"
            "- Căn cứ nhu cầu và năng lực hợp tác giữa Nền tảng Giáo dục Mây Mây và Giảng viên / Đối tác.",
            style_italic_note,
        )
    )
    story.append(Spacer(1, 8))

    # Parse toàn văn + bảng Markdown (| col1 | col2 |) thành ReportLab Flowables
    lines = rendered_content.splitlines()
    idx = 0
    usable_width = 170 * mm
    while idx < len(lines):
        raw_line = lines[idx].strip()
        if not raw_line:
            story.append(Spacer(1, 3))
            idx += 1
            continue

        # Phát hiện bảng Markdown
        if raw_line.startswith("|") and raw_line.endswith("|"):
            table_lines: list[str] = []
            while idx < len(lines) and lines[idx].strip().startswith("|") and lines[idx].strip().endswith("|"):
                table_lines.append(lines[idx].strip())
                idx += 1

            parsed_rows: list[list[str]] = []
            for tl in table_lines:
                cells = [c.strip() for c in tl.strip("|").split("|")]
                # Bỏ dòng phân cách |---|---|
                if all(set(c.replace(":", "").replace("-", "").strip()) == set() for c in cells):
                    continue
                parsed_rows.append(cells)

            if parsed_rows:
                col_count = max(len(r) for r in parsed_rows)
                col_widths = [usable_width / col_count] * col_count
                if col_count == 2:
                    col_widths = [56 * mm, 114 * mm]
                elif col_count == 3:
                    col_widths = [48 * mm, 52 * mm, 70 * mm]

                rl_rows = []
                for r_i, row in enumerate(parsed_rows):
                    padded = row + [""] * (col_count - len(row))
                    cell_style = style_table_head if r_i == 0 else style_table_cell
                    rl_rows.append([Paragraph(_esc(c), cell_style) for c in padded])

                tbl = Table(rl_rows, colWidths=col_widths, repeatRows=1)
                tbl.setStyle(
                    TableStyle(
                        [
                            ("GRID", (0, 0), (-1, -1), 0.6, colors.black),
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
                            ("VALIGN", (0, 0), (-1, -1), "TOP"),
                            ("TOPPADDING", (0, 0), (-1, -1), 5),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                            ("LEFTPADDING", (0, 0), (-1, -1), 6),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                        ]
                    )
                )
                story.append(Spacer(1, 4))
                story.append(tbl)
                story.append(Spacer(1, 6))
            continue

        safe = _esc(raw_line)
        if safe.startswith("## ") or safe.startswith("### "):
            clean = safe.lstrip("#").strip()
            story.append(Paragraph(clean, style_heading))
        elif safe.startswith("- "):
            story.append(Paragraph(f"• {safe[2:]}", style_body))
        else:
            story.append(Paragraph(safe, style_body))
        idx += 1

    story.append(Spacer(1, 14))

    # Con dấu điện tử Bên A & Bên B
    party_a_box: list[Any] = [
        Paragraph("<b>ĐẠI DIỆN BÊN A (NỀN TẢNG MÂY MÂY)</b>", style_center_bold),
        Spacer(1, 4),
        Paragraph(
            f"<b>✓ {'ĐÃ ĐỒNG KÝ ĐIỆN TỬ' if is_countersigned else 'XÁC THỰC HỆ THỐNG MÂY MÂY'}</b><br/>"
            f"Tổ chức: Nền tảng Giáo dục Mây Mây<br/>"
            f"CA: Mây Mây Digital CA (X.509)",
            style_stamp,
        ),
    ]

    party_b_box: list[Any] = [
        Paragraph("<b>ĐẠI DIỆN BÊN B (GIẢNG VIÊN / ĐỐI TÁC)</b>", style_center_bold),
        Spacer(1, 4),
    ]

    if signature_image_data and signature_image_data.startswith("data:image/"):
        try:
            b64_part = signature_image_data.split(",", 1)[1]
            sig_bytes = base64.b64decode(b64_part)
            sig_img = RLImage(io.BytesIO(sig_bytes), width=42 * mm, height=16 * mm)
            party_b_box.append(sig_img)
            party_b_box.append(Spacer(1, 3))
        except Exception:
            pass

    party_b_box.append(
        Paragraph(
            f"<b>✓ ĐÃ KÝ ĐIỆN TỬ (e-SIGNATURE)</b><br/>"
            f"Người ký: <b>{signer_name}</b><br/>"
            f"Email: {signer_email}<br/>"
            f"CCCD/Định danh: {signer_cccd or 'Đã xác thực'}<br/>"
            f"Thời điểm ký: {signed_at_str}<br/>"
            f"Serial chứng thư: {(cert_serial or 'N/A')[:20]}",
            style_stamp,
        )
    )

    sig_table = Table([[party_a_box, party_b_box]], colWidths=[83 * mm, 83 * mm])
    sig_table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (0, 0), 0.75, colors.HexColor("#93C5FD")),
                ("BOX", (1, 0), (1, 0), 0.75, colors.HexColor("#93C5FD")),
                ("BACKGROUND", (0, 0), (1, 0), colors.HexColor("#F4F8FD")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(sig_table)
    story.append(Spacer(1, 10))

    # Footer QR + SHA-256 Verification Strip
    qr_buf = _build_qr_png(verify_url)
    qr_img = RLImage(qr_buf, width=22 * mm, height=22 * mm)
    hash_display = document_hash or "Chưa đóng dấu"
    verify_info = Paragraph(
        f"<b>XÁC THỰC TÍNH TOÀN VẸN ĐIỆN TỬ</b><br/>"
        f"Mã băm SHA-256: <font size='7.5'>{hash_display}</font><br/>"
        f"Quét mã QR hoặc truy cập: <font color='#1D4E89'>{verify_url}</font><br/>"
        f"Tài liệu này được ký số theo chuẩn PKI X.509 / PAdES trên Mây Mây Digital Contract Studio.",
        style_stamp,
    )
    qr_table = Table([[qr_img, verify_info]], colWidths=[26 * mm, 140 * mm])
    qr_table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#CBD5E1")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(qr_table)

    doc.build(story)
    raw_pdf_bytes = pdf_buf.getvalue()

    # Nhúng chữ ký số PAdES (PKCS#7 / CMS) trực tiếp vào file PDF bằng pyHanko
    if ca_private_key_pem and ca_cert_pem:
        try:
            key_tmp = None
            cert_tmp = None
            import tempfile

            with tempfile.NamedTemporaryFile(delete=False, suffix=".pem") as kf:
                kf.write(ca_private_key_pem)
                key_tmp = kf.name
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pem") as cf:
                cf.write(ca_cert_pem.encode("ascii"))
                cert_tmp = cf.name

            try:
                cms_signer = signers.SimpleSigner.load(
                    key_file=key_tmp,
                    cert_file=cert_tmp,
                    ca_chain_files=(cert_tmp,),
                )
                pdf_in = io.BytesIO(raw_pdf_bytes)
                writer = IncrementalPdfFileWriter(pdf_in)
                meta = signers.PdfSignatureMetadata(
                    field_name="MayMayDigitalSignature",
                    reason=f"Ky hop dong dien tu {contract_number} - {signer_name}",
                    location="May May Education Platform (Vietnam)",
                    subfilter=SigSeedSubFilter.PADES,
                )
                signed_out = await signers.async_sign_pdf(writer, meta, signer=cms_signer)
                return signed_out.getvalue()
            finally:
                if key_tmp and os.path.exists(key_tmp):
                    os.remove(key_tmp)
                if cert_tmp and os.path.exists(cert_tmp):
                    os.remove(cert_tmp)
        except Exception:
            # Fallback an toàn nếu chứng thư không tương thích pyHanko
            return raw_pdf_bytes

    return raw_pdf_bytes
