import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { User, MapPin, Globe, Sparkles, CheckCircle2, Loader2 } from 'lucide-react'
import { logger } from '@/shared/services/logger'
import type { GeoLocation } from '@/shared/types/auth'
import { isMock } from '@/shared/services/firebase'
import { useGeolocated } from 'react-geolocated'



export function SettingsPage() {
  const { t } = useTranslation()
  const { user, updateProfile, linkGoogleAccount, unlinkGoogleAccount, loading, error, clearError } = useAuthStore()

  // Form states initialized with current user profile details
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [emailId, setEmailId] = useState(user?.emailId || '')
  const [village, setVillage] = useState(user?.village || '')
  const [taluka, setTaluka] = useState(user?.taluka || '')
  const [district, setDistrict] = useState(user?.district || '')
  const [pincode, setPincode] = useState(user?.pincode || '')
  const [preferredLanguage, setPreferredLanguage] = useState(user?.language || 'en')
  const [membershipType, setMembershipType] = useState(user?.membershipType || 'free')
  const [alternateMobile, setAlternateMobile] = useState(user?.alternateMobile || '')
  const [dob, setDob] = useState(user?.dob || '')
  const [aadhaarNumber, setAadhaarNumber] = useState(user?.aadhaarNumber || '')
  const [farmerId, setFarmerId] = useState(user?.farmerId || '')

  const [geoLocation, setGeoLocation] = useState<GeoLocation | undefined>(user?.geoLocation)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle')
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
        logger.info('GPS coordinates updated via settings profile', resultCoords)
        setIsFetchingGps(false)
      } else if (positionError) {
        logger.error('GPS fetch failed in settings via react-geolocated', positionError)
        if (isMock || import.meta.env.DEV) {
          logger.info('Simulating mock GPS coordinates in settings')
          const mockCoords: GeoLocation = {
            latitude: 20.0050,
            longitude: 73.7650,
            accuracy: 15,
            address: 'Nashik (Mock Development GPS)'
          }
          setGeoLocation(mockCoords)
          setGpsStatus('success')
        } else {
          setGpsStatus('error')
          setValidationError(t('gpsError'))
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

  const [validationSuccess, setValidationSuccess] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)


  // Sync state values with active user profile when user data updates
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '')
      setEmailId(user.emailId || '')
      setVillage(user.village || '')
      setTaluka(user.taluka || '')
      setDistrict(user.district || '')
      setPincode(user.pincode || '')
      setPreferredLanguage(user.language || 'en')
      setMembershipType(user.membershipType || 'free')
      setGeoLocation(user.geoLocation)
      setAlternateMobile(user.alternateMobile || '')
      setDob(user.dob || '')
      setAadhaarNumber(user.aadhaarNumber || '')
      setFarmerId(user.farmerId || '')
    }
  }, [user])

  // Track if any editable field contains unsaved changes
  const hasChanges =
    fullName !== (user?.fullName || '') ||
    village !== (user?.village || '') ||
    taluka !== (user?.taluka || '') ||
    district !== (user?.district || '') ||
    pincode !== (user?.pincode || '') ||
    preferredLanguage !== (user?.language || 'en') ||
    membershipType !== (user?.membershipType || 'free') ||
    JSON.stringify(geoLocation) !== JSON.stringify(user?.geoLocation) ||
    alternateMobile !== (user?.alternateMobile || '') ||
    dob !== (user?.dob || '') ||
    aadhaarNumber !== (user?.aadhaarNumber || '') ||
    farmerId !== (user?.farmerId || '')


  const handleGPSDetect = () => {
    if (!isGeolocationAvailable) {
      setValidationError(t('gpsError'))
      return
    }

    setGpsStatus('fetching')
    setValidationError(null)
    setValidationSuccess(null)
    setIsFetchingGps(true)
    getPosition()
  }

  const handleProfileUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setValidationError(null)
    setValidationSuccess(null)

    if (!fullName || !village || !taluka || !district || !pincode) {
      setValidationError(preferredLanguage === 'mr' ? 'कृपया सर्व आवश्यक माहिती प्रविष्ट करा.' : 'Please fill all required fields.')
      return
    }

    const success = await updateProfile({
      fullName,
      emailId: emailId || undefined,
      village,
      taluka,
      district,
      pincode,
      language: preferredLanguage as any,
      membershipType: membershipType as any,
      geoLocation: geoLocation || undefined,
      alternateMobile: alternateMobile || undefined,
      dob: dob || undefined,
      aadhaarNumber: aadhaarNumber || undefined,
      farmerId: farmerId || undefined
    })

    if (success) {
      setValidationSuccess(preferredLanguage === 'mr' ? 'प्रोफाइल यशस्वीरित्या अद्यतनित केले गेले!' : 'Profile updated successfully!')
      logger.info('User updated profile successfully')
    } else {
      setValidationError(error || 'Failed to update profile.')
    }
  }


  const handleLinkGoogle = async () => {
    clearError()
    setValidationError(null)
    setValidationSuccess(null)

    const success = await linkGoogleAccount()
    if (success) {
      setValidationSuccess(preferredLanguage === 'mr' ? 'गुगल खाते यशस्वीरित्या लिंक केले गेले!' : 'Google account linked successfully!')
    } else {
      setValidationError(error || 'Failed to link Google account.')
    }
  }

  const handleUnlinkGoogle = async () => {
    clearError()
    setValidationError(null)
    setValidationSuccess(null)

    const success = await unlinkGoogleAccount()
    if (success) {
      setEmailId('')
      setValidationSuccess(preferredLanguage === 'mr' ? 'गुगल खाते यशस्वीरित्या अनलिंक केले गेले!' : 'Google account unlinked successfully!')
    } else {
      setValidationError(error || 'Failed to unlink Google account.')
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {preferredLanguage === 'mr' ? 'सेटिंग्ज आणि प्रोफाइल' : 'Settings & Profile'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {preferredLanguage === 'mr' ? 'तुमचे वैयक्तिक तपशील, सुरक्षा आणि भाषा व्यवस्थापित करा.' : 'Manage your personal details, security, and language preferences.'}
        </p>
      </div>

      {validationError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3.5 text-xs text-destructive font-semibold">
          ⚠️ {validationError}
        </div>
      )}

      {validationSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-[18px] w-[18px] shrink-0" />
          <span>{validationSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Summary Panel */}
        <div className="flex flex-col gap-4 md:col-span-1">
          <Card className="rounded-2xl border-border/40 bg-card shadow-sm overflow-hidden">
            <div className="h-20 bg-gradient-to-r from-primary/10 to-primary/5" />
            <div className="px-6 pb-6 relative flex flex-col items-center text-center">
              {user?.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt="Profile"
                  className="w-16 h-16 rounded-full border-2 border-background object-cover -mt-8 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-primary font-bold text-lg select-none -mt-8 shadow-sm shrink-0">
                  {fullName.trim().split(/\s+/).slice(0, 2).map(n => n.charAt(0)).join('').toUpperCase() || 'F'}
                </div>
              )}
              <h2 className="text-base font-bold text-foreground mt-3">{fullName || 'Farmer'}</h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">+{user?.mobileNumber}</p>

              <div className="mt-4 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary tracking-wide uppercase flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                <span>{membershipType === 'gold' ? 'Gold Account' : 'Free Account'}</span>
              </div>
            </div>
          </Card>

          {/* Google Credentials Link section */}
          <Card className="rounded-2xl border-border/40 bg-card shadow-sm p-5 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-foreground tracking-wider uppercase">
              {preferredLanguage === 'mr' ? 'सुरक्षा आणि दुवे' : 'Security & Links'}
            </h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {preferredLanguage === 'mr'
                ? 'तुमच्या खात्यात गुगल लॉगिन जोडा जेणेकरून तुम्ही पासवर्ड किंवा ओटीपीशिवाय थेट गुगलने लॉगिन करू शकता.'
                : 'Link your Google account to log in instantly in the future without requiring an SMS OTP.'}
            </p>

            {user?.googleUid ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex flex-col gap-2 mt-1">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    {preferredLanguage === 'mr' ? 'गुगल खाते जोडले आहे' : 'Google account linked'}
                  </span>
                  <span className="text-xs font-medium text-foreground truncate mt-0.5">{emailId || 'Linked'}</span>
                </div>

                <Button
                  variant="ghost"
                  onClick={handleUnlinkGoogle}
                  disabled={loading}
                  className="h-8 w-full mt-1.5 rounded-lg text-[10px] font-bold border border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive/10"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span>{preferredLanguage === 'mr' ? 'गुगल खाते अनलिंक करा' : 'Unlink Google Account'}</span>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={handleLinkGoogle}
                disabled={loading}
                className="h-10 mt-1 gap-2 rounded-xl text-xs font-semibold border-border bg-background hover:bg-accent/40 text-foreground"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {/* SVG Google icon */}
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
                    <span>{preferredLanguage === 'mr' ? 'गुगल खाते लिंक करा' : 'Link Google Account'}</span>
                  </>
                )}
              </Button>
            )}
          </Card>
        </div>

        {/* Right Side: Settings Forms */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <Card className="rounded-2xl border-border/40 bg-card shadow-sm p-6">
            <form onSubmit={handleProfileUpdateSubmit} className="flex flex-col gap-5">

              {/* Profile Details Section */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 border-b border-border/20 pb-2">
                  <User className="h-[18px] w-[18px] text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    {preferredLanguage === 'mr' ? 'वैयक्तिक तपशील' : 'Personal Details'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      {preferredLanguage === 'mr' ? 'पूर्ण नाव' : 'Full Name'}
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      {preferredLanguage === 'mr' ? 'मोबाईल नंबर (लॉगिन नंबर)' : 'Mobile Number (Login ID)'}
                    </label>
                    <input
                      type="text"
                      value={user?.mobileNumber || ''}
                      readOnly={true}
                      title={preferredLanguage === 'mr' ? 'हा तुमचा लॉगिन नंबर आहे, बदलता येणार नाही' : 'This is your login identifier and cannot be changed'}
                      className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none read-only:opacity-60 read-only:bg-accent/10 read-only:cursor-not-allowed"
                    />
                  </div>
                </div>

                {user?.googleUid && (
                  <div className="flex flex-col gap-1.5 mt-2">
                    <label className="text-xs font-semibold text-foreground">
                      {preferredLanguage === 'mr' ? 'ईमेल पत्ता' : 'Email Address'}
                    </label>
                    <input
                      type="email"
                      value={emailId}
                      onChange={e => setEmailId(e.target.value)}
                      readOnly={true}
                      title={preferredLanguage === 'mr' ? 'गुगल खाते जोडले आहे, त्यामुळे ईमेल बदलता येणार नाही' : 'Linked via Google, email cannot be changed'}
                      className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none read-only:opacity-60 read-only:bg-accent/10 read-only:cursor-not-allowed"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      {preferredLanguage === 'mr' ? 'पर्यायी मोबाईल नंबर' : 'Alternate Mobile'}
                    </label>
                    <input
                      type="tel"
                      value={alternateMobile}
                      onChange={e => setAlternateMobile(e.target.value.replace(/\D/g, '').substring(0, 10))}
                      placeholder="उदा. ९८७६५४३२१०"
                      className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      {preferredLanguage === 'mr' ? 'जन्मतारीख' : 'Date of Birth'}
                    </label>
                    <input
                      type="date"
                      value={dob}
                      onChange={e => setDob(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      {preferredLanguage === 'mr' ? 'आधार क्रमांक' : 'Aadhaar Number'}
                    </label>
                    <input
                      type="text"
                      value={aadhaarNumber}
                      onChange={e => setAadhaarNumber(e.target.value.replace(/\D/g, '').substring(0, 12))}
                      placeholder="१२ अंकी क्रमांक"
                      className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      {preferredLanguage === 'mr' ? 'शेतकरी ओळखपत्र (Farmer ID)' : 'Farmer ID'}
                    </label>
                    <input
                      type="text"
                      value={farmerId}
                      onChange={e => setFarmerId(e.target.value)}
                      placeholder="उदा. FID-12345"
                      className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Address / Location Section */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 border-b border-border/20 pb-2">
                  <MapPin className="h-[18px] w-[18px] text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    {preferredLanguage === 'mr' ? 'पत्ता आणि स्थान' : 'Address & Location'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      {preferredLanguage === 'mr' ? 'गाव' : 'Village'}
                    </label>
                    <input
                      type="text"
                      required
                      value={village}
                      onChange={e => setVillage(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      {preferredLanguage === 'mr' ? 'तालुका' : 'Taluka'}
                    </label>
                    <input
                      type="text"
                      required
                      value={taluka}
                      onChange={e => setTaluka(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      {preferredLanguage === 'mr' ? 'जिल्हा' : 'District'}
                    </label>
                    <input
                      type="text"
                      required
                      value={district}
                      onChange={e => setDistrict(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      {preferredLanguage === 'mr' ? 'पिनकोड' : 'Pincode'}
                    </label>
                    <input
                      type="text"
                      required
                      value={pincode}
                      onChange={e => setPincode(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                </div>

                {/* GPS Geographic Coordinates Mapping */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 border border-border/40 rounded-xl p-3.5 mt-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {preferredLanguage === 'mr' ? 'भौगोलिक स्थान (Coordinates)' : 'Geographic Location'}
                    </span>
                    {geoLocation ? (
                      <span className="text-xs font-bold text-foreground">
                        {geoLocation.latitude.toFixed(6)}, {geoLocation.longitude.toFixed(6)}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">
                        {preferredLanguage === 'mr' ? 'स्थान आढळले नाही' : 'No coordinates resolved'}
                      </span>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGPSDetect}
                    className={`h-9 px-4 gap-2 rounded-xl text-xs font-semibold border-border bg-background hover:bg-accent/40 ${gpsStatus === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15'
                      : 'text-foreground'
                      }`}
                  >
                    <MapPin className={`h-4 w-4 ${gpsStatus === 'fetching' ? 'animate-bounce' : ''}`} />
                    <span>
                      {gpsStatus === 'idle' && t('gpsDetect')}
                      {gpsStatus === 'fetching' && (preferredLanguage === 'mr' ? 'शोधत आहे...' : 'Searching...')}
                      {gpsStatus === 'success' && t('gpsSuccess')}
                      {gpsStatus === 'error' && t('gpsError')}
                    </span>
                  </Button>
                </div>
              </div>


              {/* Preferences Section */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 border-b border-border/20 pb-2">
                  <Globe className="h-[18px] w-[18px] text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    {preferredLanguage === 'mr' ? 'सिस्टम प्राधान्ये' : 'System Preferences'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      {preferredLanguage === 'mr' ? 'प्राधान्य दिलेली भाषा' : 'Preferred Language'}
                    </label>
                    <select
                      value={preferredLanguage}
                      onChange={e => setPreferredLanguage(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                    >
                      <option value="en">English</option>
                      <option value="mr">मराठी (Marathi)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      {preferredLanguage === 'mr' ? 'सदस्यता योजना' : 'Membership Plan'}
                    </label>
                    <select
                      value={membershipType}
                      onChange={e => setMembershipType(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                    >
                      <option value="free">{preferredLanguage === 'mr' ? 'मोफत योजना (Free)' : 'Free Plan'}</option>
                      <option value="gold">{preferredLanguage === 'mr' ? 'गोल्ड योजना (Gold)' : 'Gold Plan'}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Button
                type="submit"
                disabled={!hasChanges || loading}
                className="w-full h-11 mt-2 rounded-xl text-sm font-semibold shadow-md shadow-primary/10 bg-primary text-primary-foreground hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>{preferredLanguage === 'mr' ? 'बदल जतन करा' : 'Save Changes'}</span>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
