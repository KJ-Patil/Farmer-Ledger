import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Loader2, MapPin, Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { usePlotStore } from '@/shared/hooks/usePlotStore'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import type { GeoLocation } from '@/shared/types/auth'
import { logger } from '@/shared/services/logger'
import { isMock } from '@/shared/services/firebase'
import { useGeolocated } from 'react-geolocated'



interface AddPlotModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type Step = 'details' | 'type' | 'location' | 'preview'

export function AddPlotModal({ isOpen, onClose, onSuccess }: AddPlotModalProps) {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const { createPlot, loading, plots } = usePlotStore()

  // Form State
  const [step, setStep] = useState<Step>('details')
  const [name, setName] = useState('')
  const [gatNumber, setGatNumber] = useState('')
  const [area, setArea] = useState('')
  const [areaUnit, setAreaUnit] = useState<'acre' | 'hectare' | 'guntha'>('acre')
  const [soilType, setSoilType] = useState('Black')
  const [irrigationType, setIrrigationType] = useState('Well')
  const [waterAvailability, setWaterAvailability] = useState<'perennial' | 'seasonal'>('perennial')

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('details')
      setName('')
      setGatNumber('')
      setArea('')
      setAreaUnit('acre')
      setSoilType('Black')
      setIrrigationType('Well')
      setWaterAvailability('perennial')
      setGeoLocation(undefined)
      setGpsStatus('idle')
      setValidationError(null)
    }
  }, [isOpen])



  // GPS State
  const [geoLocation, setGeoLocation] = useState<GeoLocation | undefined>(undefined)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle')
  const [validationError, setValidationError] = useState<string | null>(null)
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
        logger.info('GPS coordinates captured for plot', resultCoords)
        setIsFetchingGps(false)
      } else if (positionError) {
        logger.error('GPS fetch failed for plot via react-geolocated', positionError)
        if (isMock || import.meta.env.DEV) {
          logger.info('Simulating mock GPS coordinates for plot')
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
        setValidationError(t('gpsError'))
        setIsFetchingGps(false)
      }
    }
  }, [coords, positionError, isGeolocationAvailable, isGeolocationEnabled, isFetchingGps])


  if (!isOpen) return null

  const handleNext = () => {
    setValidationError(null)
    if (step === 'details') {
      if (!name || !gatNumber || !area) {
        setValidationError(i18n.language === 'mr' ? 'कृपया सर्व आवश्यक माहिती भरा.' : 'Please fill all required fields.')
        return
      }
      if (isNaN(Number(area)) || Number(area) <= 0) {
        setValidationError(i18n.language === 'mr' ? 'कृपया वैध क्षेत्रफळ प्रविष्ट करा.' : 'Please enter a valid area size.')
        return
      }

      // Check for duplicate Gat/Survey Number
      const isDuplicate = plots.some(
        p => p.gatNumber.trim().toLowerCase() === gatNumber.trim().toLowerCase()
      )
      if (isDuplicate) {
        setValidationError(i18n.language === 'mr' ? 'हा गट/सर्व्हे नंबर आधीच नोंदणीकृत आहे!' : 'This Gat/Survey Number is already registered!')
        return
      }

      setStep('type')
    } else if (step === 'type') {
      setStep('location')
    } else if (step === 'location') {
      setStep('preview')
    }
  }

  const handleBack = () => {
    setValidationError(null)
    if (step === 'type') setStep('details')
    else if (step === 'location') setStep('type')
    else if (step === 'preview') setStep('location')
  }

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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const successId = await createPlot(user.mobileNumber, {
      name,
      gatNumber,
      area: Number(area),
      areaUnit,
      soilType,
      irrigationType,
      waterAvailability,
      location: geoLocation
    })

    if (successId) {
      onSuccess()
      onClose()
    } else {
      setValidationError(i18n.language === 'mr' ? 'जतन करण्यात अडचण आली. कृपया पुन्हा प्रयत्न करा.' : 'Failed to save plot. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-[400px] bg-card border border-border rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent/40"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        <h3 className="text-base font-bold text-foreground mb-1 mt-1">
          {t('addPlot')}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          {t('plotManagement')}
        </p>

        {validationError && (
          <div className="text-[11px] font-bold text-destructive bg-destructive/5 border border-destructive/15 rounded-xl px-3.5 py-2.5 text-center mb-4 animate-shake">
            ⚠️ {validationError}
          </div>
        )}

        <div className="min-h-[220px] flex flex-col justify-center">
          {/* STEP 1: DETAILS */}
          {step === 'details' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t('plotName')} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={i18n.language === 'mr' ? 'उदा. विहिरीचा प्लॉट' : 'e.g. Well Plot'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t('gatNumber')} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 102/A"
                  value={gatNumber}
                  onChange={(e) => setGatNumber(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-5 gap-2.5">
                <div className="col-span-3 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    क्षेत्रफळ (Area) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 2.5"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>

                <div className="col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t('areaUnit')}
                  </label>
                  <select
                    value={areaUnit}
                    onChange={(e) => setAreaUnit(e.target.value as any)}
                    className="w-full h-11 px-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  >
                    <option value="acre">{t('acre')}</option>
                    <option value="hectare">{t('hectare')}</option>
                    <option value="guntha">{t('guntha')}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SOIL, IRRIGATION & WATER AVAILABILITY */}
          {step === 'type' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t('soilType')}
                </label>
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                >
                  <option value="Black">{t('soilBlack')}</option>
                  <option value="Medium">{t('soilMedium')}</option>
                  <option value="Light">{t('soilLight')}</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t('irrigationType')}
                </label>
                <select
                  value={irrigationType}
                  onChange={(e) => setIrrigationType(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                >
                  <option value="Well">{t('irrigationWell')}</option>
                  <option value="Borewell">{t('irrigationBorewell')}</option>
                  <option value="River">{t('irrigationRiver')}</option>
                  <option value="Canal">{t('irrigationCanal')}</option>
                  <option value="Pipeline">{t('irrigationPipeline')}</option>
                  <option value="Rainfed">{t('irrigationRainfed')}</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t('waterAvailability')}
                </label>
                <select
                  value={waterAvailability}
                  onChange={(e) => setWaterAvailability(e.target.value as any)}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                >
                  <option value="perennial">{t('perennial')}</option>
                  <option value="seasonal">{t('seasonal')}</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 3: LOCATION DETECTION */}
          {step === 'location' && (
            <div className="flex flex-col gap-4 py-2">
              <p className="text-xs text-muted-foreground leading-relaxed text-center">
                {i18n.language === 'mr'
                  ? 'तुमच्या शेताचे अचूक स्थान आणि नकाशा तपशील मिळवण्यासाठी खालील बटण दाबा.'
                  : 'Capture the GPS coordinates of your farm to map layouts and log weather notifications.'}
              </p>

              <Button
                type="button"
                variant="outline"
                onClick={handleGPSDetect}
                className={`h-11 gap-2 rounded-xl text-xs font-semibold mt-2 border-border/80 ${gpsStatus === 'success'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-background hover:bg-accent/40'
                  }`}
              >
                <MapPin className={`h-4.5 w-4.5 ${gpsStatus === 'fetching' ? 'animate-bounce' : ''}`} />
                <span>
                  {gpsStatus === 'idle' && t('gpsDetect')}
                  {gpsStatus === 'fetching' && 'शोधत आहे...'}
                  {gpsStatus === 'success' && t('gpsSuccess')}
                  {gpsStatus === 'error' && t('gpsError')}
                </span>
              </Button>

              {geoLocation && (
                <div className="bg-muted/30 border border-border/30 rounded-xl p-3 text-[10px] font-semibold text-muted-foreground flex flex-col gap-0.5 mt-1 select-text">
                  <span>Latitude: {geoLocation.latitude.toFixed(6)}</span>
                  <span>Longitude: {geoLocation.longitude.toFixed(6)}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: PREVIEW & SAVE */}
          {step === 'preview' && (
            <div className="flex flex-col gap-3 py-2 bg-muted/20 border border-border/20 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                {t('plotDetails')}
              </h4>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs font-medium">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground">{t('plotName')}</span>
                  <span className="text-foreground font-bold">{name}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground">{t('gatNumber')}</span>
                  <span className="text-foreground font-bold">{gatNumber}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground">क्षेत्रफळ (Area)</span>
                  <span className="text-foreground font-bold">{area} {t(areaUnit)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground">{t('soilType')}</span>
                  <span className="text-foreground font-bold">{t(`soil${soilType}`)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground">{t('irrigationType')}</span>
                  <span className="text-foreground font-bold">
                    {t(`irrigation${irrigationType}`)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground">{t('waterAvailability')}</span>
                  <span className="text-foreground font-bold">
                    {t(waterAvailability)}
                  </span>
                </div>
              </div>

              {geoLocation ? (
                <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1.5 mt-2 bg-emerald-500/10 py-1.5 px-3 rounded-lg border border-emerald-500/20 w-fit">
                  <Check className="h-3 w-3" /> GPS Location Attached
                </span>
              ) : (
                <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-1.5 mt-2 bg-muted py-1.5 px-3 rounded-lg w-fit">
                  No GPS coordinates attached
                </span>
              )}
            </div>
          )}
        </div>

        {/* CONTROLS */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-border/40 gap-2">
          {step !== 'details' ? (
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={handleBack}
              className="h-10 px-3.5 rounded-xl text-xs font-semibold gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>मागे</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-10 px-3.5 rounded-xl text-xs font-semibold text-muted-foreground"
            >
              {t('cancel')}
            </Button>
          )}

          {step !== 'preview' ? (
            <Button
              type="button"
              onClick={handleNext}
              className="h-10 px-3.5 rounded-xl text-xs font-semibold gap-1 ml-auto bg-primary text-primary-foreground"
            >
              <span>पुढे</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="h-10 px-4 rounded-xl text-xs font-semibold ml-auto bg-primary text-primary-foreground"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-1">
                  <Check className="h-4 w-4" /> {t('save')}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
