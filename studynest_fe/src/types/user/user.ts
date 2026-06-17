export interface User {
  id: string;
  fullname: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  facebook_url: string | null;
  birthday: string | null;
  conscious: string | null;
  district: string | null;
  citizenship_identity: string | null;
  is_verified_email: boolean;
  email_verified_at: string | null;
  is_banned: boolean;
  banned_reason: string | null;
  banned_until: string | null;
  last_login_at: string | null;
  roles: string[];
  paypal_email: string | null;
  paypal_payer_id: string | null;
  paypal_raw_payer_id: string | null;
  created_at: string;
  updated_at: string;
}
