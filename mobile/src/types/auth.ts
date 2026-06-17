export interface SkillInfo {
  id: string
  name: string
  name_en: string
  name_vi: string
}

export interface UserSpecialization {
  specialization_id: string
  name: string
  name_en: string
  name_vi: string
  level: string
  level_label: string
  skill_ids: string[]
  skills: SkillInfo[]
}

export interface User {
  id: string
  fullname: string | null
  avatar: string | null
  bio: string | null
  birthday: string | null
  conscious: string | null
  district: string | null
  citizenship_identity: string | null
  facebook_url: string | null
  gender: string | null
  is_verified_email: boolean
  email_verified_at: string | null
  is_banned: boolean
  banned_reason: string | null
  banned_until: string | null
  last_login_at: string | null
  roles: string[]
  preferences_str: string | null
  paypal_email: string | null
  paypal_payer_id: string | null
  paypal_raw_payer_id: string | null
  created_at: string
  updated_at: string
  // Backend trả về
  email: string
  instructor_description?: string | null
  // Profile UI
  specializations?: UserSpecialization[]
  interest_ids?: string[]
  daily_goal_minutes?: number
  preferred_learning_style?: string
  learning_goals?: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  session_id: string
}

export interface Session {
  id: string
  device_type: 'IOS' | 'ANDROID' | 'WEB'
  device_name: string | null
  ip_address: string | null
  user_agent: string | null
  last_used_at: string | null
  created_at: string
  expired_at?: string
  is_current: boolean
}

export interface OtpVerifyResponse {
  verified: boolean
  otp_token: string
  phone: string | null
  email: string | null
  message: string
}

export interface ApiError {
  status_code: number
  code: string
  detail: string
}

// Auth flow state — shared between OTP screens
export type AuthPurpose = 'authenticate' | 'reset_password'

export interface OtpFlowParams {
  phone?: string
  email?: string
  purpose: AuthPurpose
  otp_token?: string
}

export interface RegisterData {
  email: string
  password: string
  full_name: string
}

export interface VerifyEmailData {
  email: string
  otp: string
}
