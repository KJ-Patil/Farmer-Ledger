/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import { AuthLayout } from '../components/AuthLayout'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { RecaptchaVerifier } from 'firebase/auth'
import { auth, isMock } from '@/shared/services/firebase'
import { useGeolocated } from 'react-geolocated'
import {
  Loader2,
  Phone,
  User,
  MapPin,
  Check,
  CreditCard,
  Languages
} from 'lucide-react'
import { logger } from '@/shared/services/logger'
import type { AppLanguage, MembershipType, GeoLocation } from '@/shared/types/auth'

type RegisterStep = 'mobile' | 'otp' | 'profile' | 'preferences'

export function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    setGuestLanguage,
    registerFarmer,
    sendOtp,
    verifyOtp,
    loading,
    clearError,
    checkMobileRegistered,
    guestLanguage
  } = useAuthStore()
  const { t } = useTranslation()

  // Wizard state
  const [step, setStep] = useState<RegisterStep>('mobile')
  const [mobileNumber, setMobileNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')

  // Handle redirect from login page with verified mobile number
  useEffect(() => {
    const state = location.state as { mobileNumber?: string; verified?: boolean } | null
    if (state?.verified && state?.mobileNumber) {
      setMobileNumber(state.mobileNumber)
      setStep('profile')
    }
  }, [location.state])

  // Profile Info state
  const [fullName, setFullName] = useState('')

  const [village, setVillage] = useState('')
  const [taluka, setTaluka] = useState('')
  const [district, setDistrict] = useState('')
  const state = 'Maharashtra'
  const [pincode, setPincode] = useState('')
  const [geoLocation, setGeoLocation] = useState<GeoLocation | undefined>(undefined)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle')
  const [alternateMobile, setAlternateMobile] = useState('')
  const [dob, setDob] = useState('')
  const [aadhaarNumber, setAadhaarNumber] = useState('')
  const [farmerId, setFarmerId] = useState('')
  const [showOptionalFields, setShowOptionalFields] = useState(false)


  // Setup state
  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>(guestLanguage || 'en')

  useEffect(() => {
    if (guestLanguage) {
      setSelectedLanguage(guestLanguage)
    }
  }, [guestLanguage])

  const [membershipType, setMembershipType] = useState<MembershipType>('free')

  // Form local errors
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

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '')
    if (val.length <= 6) {
      setPincode(val)
    }
  }

  const [isFetchingGps, setIsFetchingGps] = useState(false)

  const { coords, getPosition, isGeolocationAvailable, isGeolocationEnabled, positionError } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: false,
      timeout: 15000,
    },
    userDecisionTimeout: 8000,
    suppressLocationOnMount: true,
  })

  useEffect(() => {
    if (isFetchingGps) {
      if (coords) {
        const resultCoords: GeoLocation = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          address: 'Resolved via GPS'
        }
        setGeoLocation(resultCoords)
        setGpsStatus('success')

        // Mocking address details for development ease based on location
        setVillage('Niphad Rural')
        setTaluka('Niphad')
        setDistrict('Nashik')
        setPincode('422301')
        logger.info('GPS coordinates captured successfully', resultCoords)
        setIsFetchingGps(false)
      } else if (positionError) {
        logger.error('GPS fetch failed via react-geolocated', positionError)
        if (isMock || import.meta.env.DEV) {
          logger.info('Simulating mock GPS coordinates for development')
          const mockCoords: GeoLocation = {
            latitude: 20.0050,
            longitude: 73.7650,
            accuracy: 15,
            address: 'Nashik (Mock Development GPS)'
          }
          setGeoLocation(mockCoords)
          setGpsStatus('success')
          setVillage('Niphad Rural')
          setTaluka('Niphad')
          setDistrict('Nashik')
          setPincode('422301')
        } else {
          setGpsStatus('error')
          let msg = t('gpsError')
          if (positionError.code === 1) {
            msg = t('gpsPermission')
          } else if (positionError.code === 2) {
            msg = t('gpsUnavailable')
          } else if (positionError.code === 3) {
            msg = t('gpsTimeout')
          }
          setValidationError(msg)
        }
        setIsFetchingGps(false)
      } else if (!isGeolocationAvailable) {
        setGpsStatus('error')
        setValidationError(t('gpsError'))
        setIsFetchingGps(false)
      } else if (!isGeolocationEnabled) {
        setGpsStatus('error')
        setValidationError(t('gpsPermission'))
        setIsFetchingGps(false)
      }
    }
  }, [coords, positionError, isGeolocationAvailable, isGeolocationEnabled, isFetchingGps])

  // GPS Location Trigger
  const handleGPSDetect = () => {
    if (!isGeolocationAvailable) {
      setGpsStatus('error')
      setValidationError(t('gpsError'))
      return
    }

    setGpsStatus('fetching')
    setValidationError(null)
    setIsFetchingGps(true)
    getPosition()
  }



  // Navigation handlers
  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setValidationError(null)

    const mobileRegex = /^[6-9]\d{9}$/
    if (!mobileRegex.test(mobileNumber)) {
      setValidationError(t('enterMobile'))
      return
    }

    // Check if mobile number is already registered
    const isRegistered = await checkMobileRegistered(mobileNumber)
    const storeErr = useAuthStore.getState().error
    if (storeErr) {
      setValidationError(t(storeErr))
      return
    }
    if (isRegistered) {
      setValidationError(t('errorMobileAlreadyExists'))
      return
    }

    let verifier = null
    if (!isMock) {
      try {
        if ((window as any).recaptchaVerifier) {
          verifier = (window as any).recaptchaVerifier
        } else {
          verifier = new RecaptchaVerifier(auth as any, 'recaptcha-container', {
            size: 'invisible'
          })
            ; (window as any).recaptchaVerifier = verifier
        }
      } catch (err) {
        logger.error('Failed to initialize RecaptchaVerifier', err)
      }
    }

    const success = await sendOtp(mobileNumber, verifier)
    if (success) {
      setStep('otp')
    } else {
      const storeErr = useAuthStore.getState().error
      setValidationError(storeErr ? t(storeErr) : t('verificationFailed'))
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setValidationError(null)

    if (otpCode.length !== 6) {
      setValidationError(t('enterOtp'))
      return
    }

    const verified = await verifyOtp(otpCode)
    if (verified) {
      setStep('profile')
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!fullName || !village || !taluka || !district || !pincode) {
      setValidationError('कृपया सर्व आवश्यक माहिती प्रविष्ट करा.')
      return
    }



    setStep('preferences')
  }

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setValidationError(null)

    const success = await registerFarmer({
      fullName,
      mobileNumber,
      village,
      taluka,
      district,
      state,
      pincode,
      geoLocation,
      language: selectedLanguage,
      membershipType,
      alternateMobile: alternateMobile || undefined,
      dob: dob || undefined,
      aadhaarNumber: aadhaarNumber || undefined,
      farmerId: farmerId || undefined
    })

    if (success) {
      logger.info('User registered successfully')
      // Update global preference
      setGuestLanguage(selectedLanguage)
      navigate('/')
    }
  }

  // Progress Stepper Render Helpers
  const steps: { key: RegisterStep; label: string }[] = [
    { key: 'mobile', label: t('stepMobile') },
    { key: 'otp', label: t('stepOtp') },
    { key: 'profile', label: t('stepProfile') },
    { key: 'preferences', label: t('stepFinish') }
  ]

  return (
    <AuthLayout>
      <div className="flex flex-col gap-5">
        {/* Stepper Progress bar */}
        <div className="flex justify-between items-center w-full px-1 border-b border-border/20 pb-4">
          {steps.map((s, idx) => {
            const stepIndex = steps.findIndex(x => x.key === step)
            const currentIdx = steps.findIndex(x => x.key === s.key)
            const isCompleted = currentIdx < stepIndex
            const isActive = s.key === step

            return (
              <div key={s.key} className="flex flex-col items-center flex-1 relative">
                {/* Horizontal line connector */}
                {idx > 0 && (
                  <div className={`absolute top-3.5 -left-1/2 right-1/2 h-0.5 z-0 ${currentIdx <= stepIndex ? 'bg-primary' : 'bg-muted/80'
                    }`} />
                )}

                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold z-10 border transition-all ${isCompleted
                    ? 'bg-primary text-primary-foreground border-primary'
                    : isActive
                      ? 'bg-background text-primary border-primary ring-2 ring-primary/20'
                      : 'bg-muted text-muted-foreground border-border/60'
                  }`}>
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                </div>
                <span className={`text-[9px] font-bold mt-1.5 ${isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Validation Errors */}
        {validationError && (
          <div className="text-[11px] font-bold text-destructive bg-destructive/5 border border-destructive/15 rounded-lg px-3 py-2 text-center animate-pulse">
            ⚠️ {validationError}
          </div>
        )}

        {/* STEP 1: MOBILE ENTRY */}
        {step === 'mobile' && (
          <form onSubmit={handleMobileSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-mobile" className="text-xs font-semibold text-foreground">
                {t('mobileNumber')}
              </label>
              <div className="relative flex items-center">
                <Phone className="absolute left-3.5 h-4 w-4 text-muted-foreground/60" />
                <input
                  type="tel"
                  id="reg-mobile"
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

        {/* STEP 2: OTP VERIFICATION */}
        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-otp" className="text-xs font-semibold text-foreground">
                {t('verifyOtp')}
              </label>
              <input
                type="text"
                id="reg-otp"
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
              className="w-full h-11 rounded-xl text-sm font-semibold shadow-md shadow-primary/10"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>{t('verifyOtp')}</span>}
            </Button>

            <button
              type="button"
              onClick={() => setStep('mobile')}
              className="text-xs font-semibold text-primary text-center hover:underline"
            >
              ← मागे जा
            </button>
          </form>
        )}


        {/* STEP 4: PROFILE INFO (FARMER PROFILE) */}
        {step === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1">
              <label htmlFor="reg-fullname" className="text-xs font-semibold text-foreground">
                {t('fullName')} <span className="text-destructive">*</span>
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 h-4 w-4 text-muted-foreground/60" />
                <input
                  type="text"
                  id="reg-fullname"
                  required
                  placeholder="उदा. रामराव पाटील"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground focus:bg-background outline-none text-sm transition-all focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                />
              </div>
            </div>

            {/* GPS Detector button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGPSDetect}
              className={`h-9 gap-2 rounded-xl text-xs font-semibold border-border/60 shadow-sm ${gpsStatus === 'success'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-background hover:bg-accent/40'
                }`}
            >
              <MapPin className={`h-4 w-4 ${gpsStatus === 'fetching' ? 'animate-bounce' : ''}`} />
              <span>
                {gpsStatus === 'idle' && t('gpsDetect')}
                {gpsStatus === 'fetching' && 'शोधत आहे...'}
                {gpsStatus === 'success' && t('gpsSuccess')}
                {gpsStatus === 'error' && t('gpsError')}
              </span>
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="reg-village" className="text-xs font-semibold text-foreground">
                  {t('village')} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  id="reg-village"
                  required
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground focus:bg-background outline-none text-sm transition-all focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="reg-taluka" className="text-xs font-semibold text-foreground">
                  {t('taluka')} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  id="reg-taluka"
                  required
                  value={taluka}
                  onChange={(e) => setTaluka(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground focus:bg-background outline-none text-sm transition-all focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="reg-district" className="text-xs font-semibold text-foreground">
                  {t('district')} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  id="reg-district"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground focus:bg-background outline-none text-sm transition-all focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="reg-pincode" className="text-xs font-semibold text-foreground">
                  {t('pincode')} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  id="reg-pincode"
                  required
                  inputMode="numeric"
                  placeholder="४२२३०१"
                  value={pincode}
                  onChange={handlePincodeChange}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground focus:bg-background outline-none text-sm transition-all focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                />
              </div>
            </div>

            {/* Collapsible Optional Fields */}
            <div className="border border-border/40 rounded-xl p-3 bg-muted/10">
              <button
                type="button"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
                className="w-full flex items-center justify-between text-xs font-bold text-muted-foreground outline-none hover:text-foreground transition-all"
              >
                <span>{showOptionalFields ? '← कमी माहिती दाखवा' : '➕ अतिरिक्त वैयक्तिक माहिती (Optional)'}</span>
                <span className="text-[10px]">{showOptionalFields ? '▲' : '▼'}</span>
              </button>

              {showOptionalFields && (
                <div className="flex flex-col gap-3 mt-3 animate-fade-in">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="reg-alternateMobile" className="text-[10px] font-semibold text-foreground">
                      पर्यायी मोबाईल नंबर (Optional Mobile)
                    </label>
                    <input
                      type="tel"
                      id="reg-alternateMobile"
                      placeholder="उदा. ९८७६५४३२१०"
                      value={alternateMobile}
                      onChange={e => setAlternateMobile(e.target.value.replace(/\D/g, '').substring(0, 10))}
                      className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground focus:bg-background outline-none text-xs transition-all focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="reg-dob" className="text-[10px] font-semibold text-foreground">
                        जन्मतारीख (Birth Date)
                      </label>
                      <input
                        type="date"
                        id="reg-dob"
                        value={dob}
                        onChange={e => setDob(e.target.value)}
                        className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground focus:bg-background outline-none text-xs transition-all focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="reg-aadhaar" className="text-[10px] font-semibold text-foreground">
                        आधार क्रमांक (Aadhaar No)
                      </label>
                      <input
                        type="text"
                        id="reg-aadhaar"
                        placeholder="१२ अंकी क्रमांक"
                        value={aadhaarNumber}
                        onChange={e => setAadhaarNumber(e.target.value.replace(/\D/g, '').substring(0, 12))}
                        className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground focus:bg-background outline-none text-xs transition-all focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="reg-farmerid" className="text-[10px] font-semibold text-foreground">
                      शेतकरी ओळखपत्र क्रमांक (Farmer ID)
                    </label>
                    <input
                      type="text"
                      id="reg-farmerid"
                      placeholder="उदा. FID-12345"
                      value={farmerId}
                      onChange={e => setFarmerId(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground focus:bg-background outline-none text-xs transition-all focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 mt-1 rounded-xl text-sm font-semibold shadow-md shadow-primary/10"
            >
              पुढे जा →
            </Button>
          </form>
        )}

        {/* STEP 5: PREFERENCES & PLAN */}
        {step === 'preferences' && (
          <form onSubmit={handlePreferencesSubmit} className="flex flex-col gap-4">
            {/* Language Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Languages className="h-4 w-4 text-muted-foreground" />
                <span>{t('selectLanguage')}</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedLanguage('mr')}
                  className={`py-3.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 bg-background/30 ${selectedLanguage === 'mr'
                      ? 'border-primary bg-primary/5 text-primary shadow-sm'
                      : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40'
                    }`}
                >
                  <span className="text-base font-black">म</span>
                  <span>मराठी</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLanguage('en')}
                  className={`py-3.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 bg-background/30 ${selectedLanguage === 'en'
                      ? 'border-primary bg-primary/5 text-primary shadow-sm'
                      : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40'
                    }`}
                >
                  <span className="text-base font-black">A</span>
                  <span>English</span>
                </button>
              </div>
            </div>

            {/* Plan selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>{t('membershipPlan')}</span>
              </label>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => setMembershipType('free')}
                  className={`p-3.5 rounded-xl border text-left transition-all bg-background/30 flex items-start gap-3 ${membershipType === 'free'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border/60 hover:bg-accent/40'
                    }`}
                >
                  <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${membershipType === 'free' ? 'border-primary' : 'border-border/80'
                    }`}>
                    {membershipType === 'free' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{t('freePlan')}</h4>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5 leading-normal">{t('freePlanDesc')}</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMembershipType('gold')}
                  className={`p-3.5 rounded-xl border text-left transition-all bg-background/30 flex items-start gap-3 ${membershipType === 'gold'
                      ? 'border-amber-500 bg-amber-500/5 shadow-sm'
                      : 'border-border/60 hover:bg-accent/40'
                    }`}
                >
                  <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${membershipType === 'gold' ? 'border-amber-500' : 'border-border/80'
                    }`}>
                    {membershipType === 'gold' && <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                      <span>{t('goldPlan')}</span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-white leading-none">GOLD</span>
                    </h4>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5 leading-normal">{t('goldPlanDesc')}</p>
                  </div>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 rounded-xl text-sm font-semibold shadow-md shadow-primary/10"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>{t('createAccount')}</span>}
            </Button>
          </form>
        )}

        {/* Footer Navigation */}
        <div className="border-t border-border/40 pt-4 text-center">
          <Link
            to="/login"
            onClick={clearError}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {t('alreadyHaveAccount')}
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
