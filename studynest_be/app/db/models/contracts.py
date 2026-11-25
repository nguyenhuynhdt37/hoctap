"""SQLAlchemy models cho Hệ thống Ký Hợp Đồng Số (Mây Mây Digital Contract Studio)."""

from __future__ import annotations

import datetime
import uuid
from typing import Any, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.database import Base


class ContractTemplates(Base):
    """Mẫu hợp đồng điện tử theo phiên bản (v1.0, v1.1...)."""

    __tablename__ = "contract_templates"
    __table_args__ = (
        UniqueConstraint("code", "version", name="uq_contract_templates_code_version"),
        Index("ix_contract_templates_code_active", "code", "is_active"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("gen_random_uuid()")
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    body_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("public.user.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class UserDigitalCertificates(Base):
    """Chứng thư số X.509 định danh cho Nền tảng (Platform CA) và Giảng viên."""

    __tablename__ = "user_digital_certificates"
    __table_args__ = (
        Index("ix_user_digital_certs_user_status", "user_id", "status"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("public.user.id", ondelete="CASCADE"), nullable=True
    )
    is_platform_ca: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    serial_number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    subject_cn: Mapped[str] = mapped_column(Text, nullable=False)
    subject_email: Mapped[Optional[str]] = mapped_column(String(255))
    subject_cccd: Mapped[Optional[str]] = mapped_column(String(50))
    issuer_cn: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'Mây Mây Digital CA'::text")
    )
    algorithm: Mapped[str] = mapped_column(
        String(40), nullable=False, server_default=text("'RSA-2048-SHA256'::character varying")
    )
    public_key_pem: Mapped[str] = mapped_column(Text, nullable=False)
    certificate_pem: Mapped[str] = mapped_column(Text, nullable=False)
    encrypted_private_key: Mapped[str] = mapped_column(Text, nullable=False)
    key_salt: Mapped[str] = mapped_column(String(128), nullable=False)
    key_iv: Mapped[str] = mapped_column(String(128), nullable=False)
    valid_from: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False)
    valid_until: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'active'::character varying")
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(True), nullable=False, server_default=func.now()
    )


class DigitalContracts(Base):
    """Sổ cái hợp đồng điện tử bất biến đã tạo, đã ký và đã đóng dấu số."""

    __tablename__ = "digital_contracts"
    __table_args__ = (
        Index("ix_digital_contracts_party_b", "party_b_user_id", "status"),
        Index("ix_digital_contracts_course", "course_id"),
        Index("ix_digital_contracts_type_status", "contract_type", "status"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("gen_random_uuid()")
    )
    contract_number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    template_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.contract_templates.id", ondelete="RESTRICT"), nullable=False
    )
    contract_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    party_b_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.user.id", ondelete="CASCADE"), nullable=False
    )
    course_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("public.courses.id", ondelete="SET NULL"), nullable=True
    )
    transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("public.transactions.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, server_default=text("'draft'::character varying")
    )
    rendered_content: Mapped[str] = mapped_column(Text, nullable=False)
    terms_snapshot: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )

    # Thông tin chữ ký điện tử Bên B (Giảng viên)
    certificate_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("public.user_digital_certificates.id", ondelete="SET NULL"),
        nullable=True,
    )
    signing_method: Mapped[Optional[str]] = mapped_column(String(30))
    signer_cccd: Mapped[Optional[str]] = mapped_column(String(50))
    signer_tax_code: Mapped[Optional[str]] = mapped_column(String(50))
    signature_image_data: Mapped[Optional[str]] = mapped_column(Text)
    signature_type: Mapped[Optional[str]] = mapped_column(String(20))
    document_hash: Mapped[Optional[str]] = mapped_column(String(64))
    digital_signature_b64: Mapped[Optional[str]] = mapped_column(Text)
    signature_seal: Mapped[Optional[str]] = mapped_column(String(64))
    certificate_pem_snapshot: Mapped[Optional[str]] = mapped_column(Text)
    signer_ip: Mapped[Optional[str]] = mapped_column(String(64))
    signer_user_agent: Mapped[Optional[str]] = mapped_column(Text)
    otp_verified_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    signed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))

    # Đồng ký Bên A (Mây Mây Admin)
    countersigned_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("public.user.id", ondelete="SET NULL"), nullable=True
    )
    countersigned_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    countersign_signature_b64: Mapped[Optional[str]] = mapped_column(Text)

    # Thu hồi hiệu lực
    revoked_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("public.user.id", ondelete="SET NULL"), nullable=True
    )
    revoked_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True))
    revoke_reason: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class ContractAuditLogs(Base):
    """Nhật ký pháp lý bất biến cho từng hành động trên hợp đồng điện tử."""

    __tablename__ = "contract_audit_logs"
    __table_args__ = (
        Index("ix_contract_audit_logs_contract_time", "contract_id", "created_at"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("gen_random_uuid()")
    )
    contract_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.digital_contracts.id", ondelete="CASCADE"), nullable=False
    )
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("public.user.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(40), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64))
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    details: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(True), nullable=False, server_default=func.now()
    )
