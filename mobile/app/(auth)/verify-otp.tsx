import { VerifyOTPFeature } from '@/components/features/auth/VerifyOTPFeature'
import { useLocalSearchParams } from 'expo-router'

export default function VerifyOtpScreen() {
  const {
    email,
    purpose,
    notice,
    resend_available_in,
    otp_expires_in,
  } = useLocalSearchParams<{
    email: string
    purpose: 'authenticate' | 'reset_password'
    notice?: string
    resend_available_in?: string
    otp_expires_in?: string
  }>()

  const resendCooldown = Number(resend_available_in)
  const otpExpiry = Number(otp_expires_in)
  
  return (
    <VerifyOTPFeature 
      identifier={email} 
      purpose={purpose || 'authenticate'} 
      initialNoticeKey={notice}
      initialResendCooldown={Number.isFinite(resendCooldown) ? resendCooldown : undefined}
      initialOtpExpiry={Number.isFinite(otpExpiry) ? otpExpiry : undefined}
    />
  )
}
