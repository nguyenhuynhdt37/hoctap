export interface UserProfile {
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
  last_login_at: string;
  created_at: string;
  updated_at: string;
  instructor_description: string | null;
  paypal_email: string | null;
  paypal_payer_id: string | null;
  is_banned?: boolean;
}

export interface UpdateProfileData {
  fullname?: string;
  email?: string;
  avatar?: string | null;
  bio?: string | null;
  facebook_url?: string | null;
  birthday?: string | null;
  conscious?: string | null;
  district?: string | null;
  citizenship_identity?: string | null;
}
