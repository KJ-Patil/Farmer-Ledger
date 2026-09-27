/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import { AuthLayout } from '../components/AuthLayout'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Loader2, Phone } from 'lucide-react'
import { logger } from '@/shared/services/logger'
import { RecaptchaVerifier } from 'firebase/auth'
import { auth, isMock } from '@/shared/services/firebase'

export function LoginPage() {
  const navigate = useNavigate()
  const { signInWithPassword, sendOtp, verifyOtp, signInWithGoogle, loading, clearError, checkMobileRegistered } = useAuthStore()
  const { t } = useTranslation()

  const [mobileNumber, setMobileNumber] = useState('')
  const [otpMode, setOtpMode] = useState<'request' | 'verify'>('request')
  const [otpCode, setOtpCode] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

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

  const handleOtpRequestSubmit = async (e: React.FormEvent) => {
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
      setOtpMode('verify')
    } else {
      const storeErr = useAuthStore.getState().error
      setValidationError(storeErr ? t(storeErr) : t('verificationFailed'))
    }
  }

  const handleOtpVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setValidationError(null)

    if (otpCode.length !== 6) {
      setValidationError(t('enterOtp'))
      return
    }

    const verified = await verifyOtp(otpCode)
    if (verified) {
      if (isMock) {
        const success = await signInWithPassword(mobileNumber, 'Password123!')
        if (success) {
          navigate('/')
        }
      } else {
        const isRegistered = await checkMobileRegistered(mobileNumber)
        if (isRegistered) {
          navigate('/')
        } else {
          // User verified OTP but profile doesn't exist, redirect to registration
          navigate('/register', { state: { mobileNumber, verified: true } })
        }
      }
    }
  }

  const handleGoogleSignIn = async () => {
    clearError()
    setValidationError(null)
    const success = await signInWithGoogle()
    if (success) {
      logger.info('Google Sign-In completed successfully, navigating to dashboard')
      navigate('/')
    } else {
      const storeErr = useAuthStore.getState().error
      if (storeErr === 'errorNoAccount') {
        setValidationError(t('errorNoAccount'))
      } else {
        setValidationError(storeErr ? t(storeErr) : 'Google Sign-In failed.')
      }
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        {/* Validation Error Alert */}
        {validationError && (
          <div className="text-[11px] font-bold text-destructive bg-destructive/5 border border-destructive/15 rounded-lg px-3 py-2 text-center animate-pulse">
            ⚠️ {validationError}
          </div>
        )}

        {/* OTP Login Form */}
        <div>
          {otpMode === 'request' ? (
            <form onSubmit={handleOtpRequestSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="mobile-otp" className="text-xs font-semibold text-foreground">
                  {t('mobileNumber')}
                </label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-3.5 h-4 w-4 text-muted-foreground/60" />
                  <input
                    type="tel"
                    id="mobile-otp"
                    name="username"
                    autoComplete="username"
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
                className="w-full h-11 mt-2 rounded-xl text-sm font-semibold shadow-md shadow-primary/10 hover:shadow-primary/20 bg-primary text-primary-foreground"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>{t('sendOtp')}</span>
                )}
              </Button>

              <div className="relative flex items-center justify-center my-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/40"></div>
                </div>
                <span className="relative px-3 text-[10px] uppercase font-bold text-muted-foreground bg-card">
                  {t('selectLanguage') === 'Select Language' ? 'Or' : 'किंवा'}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-11 rounded-xl text-sm font-semibold border-border bg-background hover:bg-accent/40 text-foreground flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>{t('selectLanguage') === 'Select Language' ? 'Sign In with Google' : 'गुगल द्वारे लॉगिन करा'}</span>
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpVerifySubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="otp-code" className="text-xs font-semibold text-foreground">
                  {t('verifyOtp')}
                </label>
                <input
                  type="text"
                  id="otp-code"
                  required
                  inputMode="numeric"
                  placeholder={t('enterOtp')}
                  value={otpCode}
                  onChange={handleOtpChange}
                  className="w-full h-11 text-center tracking-widest rounded-xl border border-border bg-background text-foreground focus:bg-background outline-none text-lg transition-all focus:ring-1 focus:ring-primary focus:border-primary font-bold"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-1 rounded-xl text-sm font-semibold shadow-md shadow-primary/10 hover:shadow-primary/20"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>{t('verifyOtp')}</span>
                )}
              </Button>
              
              <button
                type="button"
                onClick={() => setOtpMode('request')}
                className="text-xs font-semibold text-primary text-center hover:underline mt-1"
              >
                {t('editMobileNumber')}
              </button>
            </form>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-border/40 pt-4 text-center">
          <Link
            to="/register"
            onClick={clearError}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {t('dontHaveAccount')}
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
