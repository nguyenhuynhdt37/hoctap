export type ContractType =
  | "LECTURER_MASTER"
  | "COURSE_PUBLISHING"
  | "COURSE_PURCHASE";

export type ContractStatus =
  | "draft"
  | "pending_otp"
  | "signed"
  | "countersigned"
  | "revoked"
  | "expired";

export interface DigitalCertificateInfo {
  id: string;
  serial_number: string;
  subject_cn: string;
  subject_email: string | null;
  subject_cccd: string | null;
  issuer_cn: string;
  algorithm: string;
  valid_from: string;
  valid_until: string;
  status: string;
}

export interface ContractPartyB {
  id: string;
  fullname: string;
  email: string;
  avatar: string | null;
}

export interface ContractListItem {
  id: string;
  contract_number: string;
  contract_type: ContractType | string;
  title: string;
  status: ContractStatus | string;
  signing_method: string | null;
  document_hash: string | null;
  signed_at: string | null;
  countersigned_at: string | null;
  created_at: string;
  course_id: string | null;
  course_title: string | null;
  party_b: ContractPartyB;
  cert_serial: string | null;
}

export interface ContractListResponse {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  items: ContractListItem[];
}

export interface ContractIntegrity {
  valid: boolean;
  hash_match?: boolean;
  hmac_seal_valid?: boolean;
  pki_signature_valid?: boolean;
  contract_number?: string;
  status?: string;
  document_hash?: string | null;
  signed_at?: string | null;
  countersigned_at?: string | null;
  cert_serial?: string | null;
  reason?: string;
}

export interface ContractAuditLogItem {
  id: string;
  action: string;
  actor_name: string;
  ip_address: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ContractDetail {
  id: string;
  contract_number: string;
  contract_type: ContractType | string;
  title: string;
  status: ContractStatus | string;
  rendered_content: string;
  terms_snapshot: Record<string, unknown>;
  signing_method: string | null;
  signer_cccd: string | null;
  signer_tax_code: string | null;
  signature_image_data: string | null;
  signature_type: string | null;
  document_hash: string | null;
  digital_signature_b64: string | null;
  cert_serial: string | null;
  signer_ip: string | null;
  otp_verified_at: string | null;
  signed_at: string | null;
  countersigned_at: string | null;
  countersigner_name: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  created_at: string;
  course: {
    id: string;
    title: string;
    base_price: number;
  } | null;
  party_b: ContractPartyB;
  integrity: ContractIntegrity | null;
  audit_logs: ContractAuditLogItem[];
}

export interface ContractTemplateItem {
  id: string;
  code: ContractType | string;
  version: string;
  title: string;
  description: string | null;
  body_markdown: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminContractStats {
  total: number;
  draft: number;
  signed: number;
  countersigned: number;
  revoked: number;
  active_certificates: number;
}

export interface PublicVerifyResponse {
  contract_number: string;
  title: string;
  contract_type: string;
  status: string;
  signer_name: string;
  signing_method: string | null;
  signed_at: string | null;
  countersigned_at: string | null;
  revoked_at: string | null;
  integrity: ContractIntegrity;
}
