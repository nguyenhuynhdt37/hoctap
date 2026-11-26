"""API Router Ký Hợp Đồng Số cho Giảng viên & Tra cứu Xác thực Công khai."""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Query, Request, Response, UploadFile
from pydantic import BaseModel

from app.core.deps import AuthorizationService
from app.services.shares.digital_contract import DigitalContractService

router = APIRouter(prefix="/lecturer/contracts", tags=["Lecturer Digital Contracts"])
public_router = APIRouter(prefix="/contracts", tags=["Public Contract Verification"])


class IssueCertificateSchema(BaseModel):
    pin: str
    cccd: str


class CreateContractDraftSchema(BaseModel):
    contract_type: str = "LECTURER_MASTER"
    course_id: Optional[uuid.UUID] = None
    signer_cccd: Optional[str] = None


class SignCloudPkiSchema(BaseModel):
    otp_code: str
    signer_cccd: str
    signer_tax_code: Optional[str] = None
    pin: str
    signature_image_data: Optional[str] = None
    signature_type: str = "drawn"


def _client_meta(request: Request) -> tuple[str | None, str | None]:
    ip = request.headers.get("x-forwarded-for") or (
        request.client.host if request.client else None
    )
    ua = request.headers.get("user-agent")
    return ip, ua


@router.get("/status", summary="Kiểm tra nhanh trạng thái ký Hợp đồng Khung Giảng viên")
async def get_master_contract_status(
    service: DigitalContractService = Depends(DigitalContractService),
    auth: AuthorizationService = Depends(AuthorizationService),
):
    user = await auth.get_current_user()
    return await service.get_master_contract_status_async(user)


@router.get("/certificate", summary="Lấy thông tin chứng thư số X.509 của tôi")
async def get_my_certificate(
    service: DigitalContractService = Depends(DigitalContractService),
    auth: AuthorizationService = Depends(AuthorizationService),
):
    user = await auth.get_current_user()
    return await service.get_my_certificate_async(user)


@router.post("/certificate/issue", summary="Cấp mới / cấp lại chứng thư số X.509")
async def issue_my_certificate(
    schema: IssueCertificateSchema,
    service: DigitalContractService = Depends(DigitalContractService),
    auth: AuthorizationService = Depends(AuthorizationService),
):
    user = await auth.get_current_user()
    return await service.issue_my_certificate_async(
        user, pin=schema.pin, cccd=schema.cccd
    )


@router.post("/draft", summary="Tạo bản thảo hợp đồng điện tử mới")
async def create_contract_draft(
    schema: CreateContractDraftSchema,
    request: Request,
    service: DigitalContractService = Depends(DigitalContractService),
    auth: AuthorizationService = Depends(AuthorizationService),
):
    user = await auth.get_current_user()
    ip, ua = _client_meta(request)
    return await service.create_draft_async(
        user,
        contract_type=schema.contract_type,
        course_id=schema.course_id,
        signer_cccd=schema.signer_cccd,
        ip=ip,
        ua=ua,
    )


@router.get("", summary="Danh sách hợp đồng điện tử của giảng viên")
async def list_my_contracts(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    contract_type: Optional[str] = Query(None),
    service: DigitalContractService = Depends(DigitalContractService),
    auth: AuthorizationService = Depends(AuthorizationService),
):
    user = await auth.get_current_user()
    return await service.list_contracts_async(
        user=user,
        is_admin=False,
        page=page,
        limit=limit,
        search=search,
        status=status,
        contract_type=contract_type,
    )


@router.get("/{contract_id}", summary="Chi tiết hợp đồng điện tử")
async def get_my_contract_detail(
    contract_id: uuid.UUID,
    service: DigitalContractService = Depends(DigitalContractService),
    auth: AuthorizationService = Depends(AuthorizationService),
):
    user = await auth.get_current_user()
    return await service.get_contract_detail_async(
        contract_id, user, is_admin=False
    )


@router.post("/{contract_id}/request-otp", summary="Gửi mã OTP xác thực ký điện tử")
async def request_sign_otp(
    contract_id: uuid.UUID,
    request: Request,
    service: DigitalContractService = Depends(DigitalContractService),
    auth: AuthorizationService = Depends(AuthorizationService),
):
    user = await auth.get_current_user()
    ip, ua = _client_meta(request)
    return await service.request_sign_otp_async(contract_id, user, ip=ip, ua=ua)


@router.post("/{contract_id}/sign", summary="Ký điện tử bằng Cloud PKI (X.509 + PIN + OTP)")
async def sign_contract_cloud_pki(
    contract_id: uuid.UUID,
    schema: SignCloudPkiSchema,
    request: Request,
    service: DigitalContractService = Depends(DigitalContractService),
    auth: AuthorizationService = Depends(AuthorizationService),
):
    user = await auth.get_current_user()
    ip, ua = _client_meta(request)
    return await service.sign_contract_async(
        contract_id,
        user,
        signing_method="cloud_pki",
        otp_code=schema.otp_code,
        signer_cccd=schema.signer_cccd,
        signer_tax_code=schema.signer_tax_code,
        pin=schema.pin,
        signature_image_data=schema.signature_image_data,
        signature_type=schema.signature_type,
        ip=ip,
        ua=ua,
    )


@router.post(
    "/{contract_id}/sign-p12",
    summary="Ký điện tử bằng tệp chứng thư số cá nhân (.p12 / .pfx)",
)
async def sign_contract_external_p12(
    contract_id: uuid.UUID,
    request: Request,
    otp_code: str = Form(...),
    signer_cccd: str = Form(...),
    signer_tax_code: Optional[str] = Form(None),
    p12_password: str = Form(""),
    signature_image_data: Optional[str] = Form(None),
    signature_type: str = Form("drawn"),
    p12_file: UploadFile = File(...),
    service: DigitalContractService = Depends(DigitalContractService),
    auth: AuthorizationService = Depends(AuthorizationService),
):
    user = await auth.get_current_user()
    ip, ua = _client_meta(request)
    p12_bytes = await p12_file.read()
    return await service.sign_contract_async(
        contract_id,
        user,
        signing_method="external_p12",
        otp_code=otp_code,
        signer_cccd=signer_cccd,
        signer_tax_code=signer_tax_code,
        p12_bytes=p12_bytes,
        p12_password=p12_password,
        signature_image_data=signature_image_data,
        signature_type=signature_type,
        ip=ip,
        ua=ua,
    )


@router.get("/{contract_id}/pdf", summary="Tải bản PDF hợp đồng đã nhúng chữ ký số PAdES")
async def download_my_contract_pdf(
    contract_id: uuid.UUID,
    request: Request,
    service: DigitalContractService = Depends(DigitalContractService),
    auth: AuthorizationService = Depends(AuthorizationService),
):
    user = await auth.get_current_user()
    ip, ua = _client_meta(request)
    pdf_bytes, filename = await service.export_contract_pdf_async(
        contract_id, user, is_admin=False, ip=ip, ua=ua
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@public_router.get(
    "/verify/{contract_number}",
    summary="Tra cứu & xác thực công khai hợp đồng điện tử theo mã số",
)
async def public_verify_contract(
    contract_number: str,
    service: DigitalContractService = Depends(DigitalContractService),
):
    return await service.public_verify_by_number_async(contract_number)
