"""API Router Quản trị Hợp đồng Số cho Admin (Mây Mây Digital Contract Studio)."""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel

from app.core.deps import AuthorizationService
from app.db.models.contracts import DigitalContracts
from app.services.shares.digital_contract import DigitalContractService

router = APIRouter(prefix="/admin/contracts", tags=["Admin Digital Contracts"])


class RevokeContractSchema(BaseModel):
    reason: str


class UpsertTemplateSchema(BaseModel):
    code: str
    version: str
    title: str
    description: Optional[str] = None
    body_markdown: str


def _client_meta(request: Request) -> tuple[str | None, str | None]:
    ip = request.headers.get("x-forwarded-for") or (
        request.client.host if request.client else None
    )
    ua = request.headers.get("user-agent")
    return ip, ua


@router.get("/stats", summary="Thống kê tổng quan Hợp đồng số")
async def get_admin_contract_stats(
    service: DigitalContractService = Depends(DigitalContractService),
    auth: AuthorizationService = Depends(AuthorizationService),
):
    await auth.require_role(["ADMIN"])
    return await service.get_admin_stats_async()


@router.get("/templates", summary="Danh sách mẫu hợp đồng theo phiên bản")
async def list_contract_templates(
    service: DigitalContractService = Depends(DigitalContractService),
    auth: AuthorizationService = Depends(AuthorizationService),
):
    await auth.require_role(["ADMIN"])
    return {"items": await service.list_templates_async()}


@router.post("/templates", summary="Tạo / cập nhật phiên bản mẫu hợp đồng")
async def upsert_contract_template(
    schema: UpsertTemplateSchema,
    service: DigitalContractService = Depends(DigitalContractService),
    auth: AuthorizationService = Depends(AuthorizationService),
):
    admin = await auth.require_role(["ADMIN"])
    return await service.upsert_template_async(
        admin,
        code=schema.code,
        version=schema.version,
        title=schema.title,
        description=schema.description,
        body_markdown=schema.body_markdown,
    )


@router.get("", summary="Danh sách toàn bộ hợp đồng điện tử trên hệ thống")
async def admin_list_contracts(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    contract_type: Optional[str] = Query(None),
    service: DigitalContractService = Depends(DigitalContractService),
    auth: AuthorizationService = Depends(AuthorizationService),
):
    await auth.require_role(["ADMIN"])
    return await service.list_contracts_async(
        is_admin=True,
        page=page,
        limit=limit,
        search=search,
        status=status,
        contract_type=contract_type,
    )


@router.get("/{contract_id}", summary="Chi tiết hợp đồng điện tử (Admin)")
async def admin_get_contract_detail(
    contract_id: uuid.UUID,
    service: DigitalContractService = Depends(DigitalContractService),
    auth: AuthorizationService = Depends(AuthorizationService),
):
    admin = await auth.require_role(["ADMIN"])
    return await service.get_contract_detail_async(
        contract_id, admin, is_admin=True
    )


@router.post("/{contract_id}/countersign", summary="Admin đồng ký điện tử Bên A (Mây Mây)")
async def admin_countersign_contract(
    contract_id: uuid.UUID,
    request: Request,
    service: DigitalContractService = Depends(DigitalContractService),
    auth: AuthorizationService = Depends(AuthorizationService),
):
    admin = await auth.require_role(["ADMIN"])
    ip, ua = _client_meta(request)
    return await service.admin_countersign_async(
        contract_id, admin, ip=ip, ua=ua
    )


@router.post("/{contract_id}/verify", summary="Kiểm tra toàn vẹn mật mã SHA-256 + X.509 + HMAC")
async def admin_verify_contract(
    contract_id: uuid.UUID,
    request: Request,
    service: DigitalContractService = Depends(DigitalContractService),
    auth: AuthorizationService = Depends(AuthorizationService),
):
    admin = await auth.require_role(["ADMIN"])
    c = await service.db.get(DigitalContracts, contract_id)
    if not c:
        from fastapi import HTTPException

        raise HTTPException(404, "Không tìm thấy hợp đồng.")
    ip, ua = _client_meta(request)
    return await service.verify_contract_integrity_async(
        c, actor_id=admin.id, ip=ip, ua=ua
    )


@router.post("/{contract_id}/revoke", summary="Thu hồi hiệu lực hợp đồng")
async def admin_revoke_contract(
    contract_id: uuid.UUID,
    schema: RevokeContractSchema,
    request: Request,
    service: DigitalContractService = Depends(DigitalContractService),
    auth: AuthorizationService = Depends(AuthorizationService),
):
    admin = await auth.require_role(["ADMIN"])
    ip, ua = _client_meta(request)
    return await service.admin_revoke_async(
        contract_id, admin, reason=schema.reason, ip=ip, ua=ua
    )


@router.get("/{contract_id}/pdf", summary="Tải bản PDF hợp đồng có chữ ký số PAdES (Admin)")
async def admin_download_contract_pdf(
    contract_id: uuid.UUID,
    request: Request,
    service: DigitalContractService = Depends(DigitalContractService),
    auth: AuthorizationService = Depends(AuthorizationService),
):
    admin = await auth.require_role(["ADMIN"])
    ip, ua = _client_meta(request)
    pdf_bytes, filename = await service.export_contract_pdf_async(
        contract_id, admin, is_admin=True, ip=ip, ua=ua
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
