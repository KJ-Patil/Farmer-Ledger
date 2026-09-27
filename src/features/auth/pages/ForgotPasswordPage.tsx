/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import { AuthLayout } from '../components/AuthLayout'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Loader2, Phone, KeyRound, CheckCircle2 } from 'lucide-react'
import { logger } from '@/shared/services/logger'
import { RecaptchaVerifier } from 'firebase/auth'
import { auth, isMock } from '@/shared/services/firebase'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { sendOtp, verifyOtp, loading, clearError } = useAuthStore()
  const { t } = useTranslation()

  const [mobileNumber, setMobileNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [flowStep, setFlowStep] = useState<'request' | 'verify' | 'success'>('request')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showTestOtpHint, setShowTestOtpHint] = useState(false)

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '')
    if (val.length <= 10) {
      setMobileNumber(val)
      setValidationError(null)
    }
  }

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '')
    if (val.length <= 6) {
      setOtpCode(val)
      setValidationError(null)
    }
  }

  const validateMobile = (mobile: string) => {
    const mobileRegex = /^[6-9]\d{9}$/
    if (!mobileRegex.test(mobile)) {
      setValidationError(t('enterMobile'))
      return false
    }
    return true
  }

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setValidationError(null)

    if (!validateMobile(mobileNumber)) return

    let verifier = null
    if (!isMock) {
      try {
        if ((window as any).recaptchaVerifier) {
          verifier = (window as any).recaptchaVerifier
        } else {
          verifier = new RecaptchaVerifier(auth as any, 'recaptcha-container', {
            size: 'invisible'
          })
          ;(window as any).recaptchaVerifier = verifier
        }
      } catch (err) {
        logger.error('Failed to initialize RecaptchaVerifier', err)
      }
    }

    const success = await sendOtp(mobileNumber, verifier)
    if (success) {
      setFlowStep('verify')
      setShowTestOtpHint(true)
    } else {
      const storeErr = useAuthStore.getState().error
      setValidationError(storeErr ? t(storeErr) : t('verificationFailed'))
    }
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setValidationError(null)

    if (otpCode.length !== 6) {
      setValidationError(t('enterOtp'))
      return
    }

    // Password validation rules
    const passwordRegex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}/
    if (newPassword.length < 8 || !passwordRegex.test(newPassword)) {
      setValidationError(t('passwordRules'))
      return
    }

    if (newPassword !== confirmPassword) {
      setValidationError(t('passwordMismatch'))
      return
    }

    const verified = await verifyOtp(otpCode)
    if (verified) {
      // Successfully verified. In mock/production, update password in DB
      // For mock mode, since password is simulated, we just success notify
      logger.info(`Password successfully reset for mobile: ${mobileNumber}`)
      setFlowStep('success')
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-sm font-bold text-foreground">{t('resetPassword')}</h2>
        </div>

        {/* Validation Errors */}
        {validationError && (
          <div className="text-[11px] font-bold text-destructive bg-destructive/5 border border-destructive/15 rounded-lg px-3 py-2 text-center animate-pulse">
            ⚠️ {validationError}
          </div>
        )}

        {/* Step 1: Request Reset */}
        {flowStep === 'request' && (
          <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset-mobile" className="text-xs font-semibold text-foreground">
                {t('mobileNumber')}
              </label>
              <div className="relative flex items-center">
                <Phone className="absolute left-3.5 h-4 w-4 text-muted-foreground/60" />
                <input
                  type="tel"
                  id="reset-mobile"
                  required
                  placeholder={t('enterMobile')}
                  value={mobileNumber}
                  onChange={handleMobileChange}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground focus:bg-background outline-none text-sm transition-all focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-sm font-semibold shadow-md shadow-primary/10"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>{t('sendOtp')}</span>}
            </Button>
          </form>
        )}

        {/* Step 2: Input OTP and New Password */}
        {flowStep === 'verify' && (
          <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset-otp" className="text-xs font-semibold text-foreground">
                {t('verifyOtp')}
              </label>
              <input
                type="text"
                id="reset-otp"
                required
                inputMode="numeric"
                placeholder={t('enterOtp')}
                value={otpCode}
                onChange={handleOtpChange}
                className="w-full h-11 text-center tracking-widest rounded-xl border border-border bg-background text-foreground focus:bg-background outline-none text-lg transition-all focus:ring-1 focus:ring-primary focus:border-primary font-bold"
              />
            </div>

            {showTestOtpHint && (
              <div className="text-[10px] text-center font-semibold text-amber-600 bg-amber-50 rounded-lg p-2 border border-amber-200/50">
                {t('otpSentToast')} <span className="font-bold">123456</span> {t('useTestOtp')}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset-new-password" className="text-xs font-semibold text-foreground">
                नवा पासवर्ड (New Password)
              </label>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3.5 h-4 w-4 text-muted-foreground/60" />
                <input
                  type="password"
                  id="reset-new-password"
                  required
                  placeholder={t('enterPassword')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground focus:bg-background outline-none text-sm transition-all focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                />
              </div>
              <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                {t('passwordRules')}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset-confirm-password" className="text-xs font-semibold text-foreground">
                {t('confirmPassword')}
              </label>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3.5 h-4 w-4 text-muted-foreground/60" />
                <input
                  type="password"
                  id="reset-confirm-password"
                  required
                  placeholder={t('confirmPassword')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground focus:bg-background outline-none text-sm transition-all focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-sm font-semibold shadow-md shadow-primary/10"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>{t('resetPassword')}</span>}
            </Button>
          </form>
        )}

        {/* Step 3: Success Screen */}
        {flowStep === 'success' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center animate-fade-in">
            <CheckCircle2 className="h-14 w-14 text-emerald-500 animate-bounce" />
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold text-foreground">पासवर्ड यशस्वीरित्या बदलला!</h3>
              <p className="text-xs text-muted-foreground">आपण आता नवीन पासवर्डने लॉगिन करू शकता.</p>
            </div>
            <Button
              onClick={() => navigate('/login')}
              className="w-full h-11 mt-2 rounded-xl text-sm font-semibold shadow-md shadow-primary/10"
            >
              {t('login')} कडे जा
            </Button>
          </div>
        )}

        {/* Footer Navigation */}
        {flowStep !== 'success' && (
          <div className="border-t border-border/40 pt-4 text-center">
            <Link
              to="/login"
              onClick={clearError}
              className="text-xs font-semibold text-primary hover:underline"
            >
              ← {t('backToLogin')}
            </Link>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
