import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Loader2, Check, X } from 'lucide-react'
import { usePlotStore } from '@/shared/hooks/usePlotStore'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import { logger } from '@/shared/services/logger'

interface AddCropModalProps {
  isOpen: boolean
  plotId: string
  cropId?: string
  onClose: () => void
  onSuccess: () => void
}

export function AddCropModal({ isOpen, plotId, cropId, onClose, onSuccess }: AddCropModalProps) {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const { createCrop, updateCrop, loading, plots, crops } = usePlotStore()

  // Form State
  const [cropType, setCropType] = useState('')
  const [cropSearch, setCropSearch] = useState('')
  const [showCropSuggestions, setShowCropSuggestions] = useState(false)
  const [variety, setVariety] = useState('')
  const [season, setSeason] = useState('Kharif')
  const [area, setArea] = useState('')
  const [sowingDate, setSowingDate] = useState('')
  const [expectedHarvestDate, setExpectedHarvestDate] = useState('')
  const [estimatedYield, setEstimatedYield] = useState('')
  const [estimatedYieldUnit, setEstimatedYieldUnit] = useState<'quintal' | 'kg' | 'ton'>('quintal')
  const [validationError, setValidationError] = useState<string | null>(null)

  // Remaining area calculation logic
  const activePlot = plots.find(p => p.id === plotId)
  const plotCrops = plotId && crops[plotId] ? crops[plotId] : []
  const activeCrops = plotCrops.filter(c => c.status !== 'harvested' && c.id !== cropId)
  const occupiedArea = activeCrops.reduce((sum, c) => sum + (c.area || 0), 0)
  const remainingArea = activePlot ? activePlot.area - occupiedArea : 0

  // Reset form / pre-fill edit mode data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (cropId && plotId && crops[plotId]) {
        const crop = crops[plotId].find(c => c.id === cropId)
        if (crop) {
          setCropType(crop.cropType)
          setCropSearch(crop.cropType)
          setVariety(crop.variety)
          setSeason(crop.season)
          setArea(String(crop.area || ''))
          setSowingDate(crop.sowingDate)
          setExpectedHarvestDate(crop.expectedHarvestDate)
          setEstimatedYield(crop.estimatedYield ? String(crop.estimatedYield) : '')
          setEstimatedYieldUnit(crop.estimatedYieldUnit || 'quintal')
          setValidationError(null)
          return
        }
      }
      setCropType('')
      setCropSearch('')
      setShowCropSuggestions(false)
      setVariety('')
      setSeason('Kharif')
      setArea('')
      setSowingDate('')
      setExpectedHarvestDate('')
      setEstimatedYield('')
      setEstimatedYieldUnit('quintal')
      setValidationError(null)
    }
  }, [isOpen, cropId, plotId, crops])



  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!user || !plotId) return

    const finalCropType = cropType || cropSearch
    if (!finalCropType || !variety || !area || !sowingDate || !expectedHarvestDate) {
      setValidationError(i18n.language === 'mr' ? 'कृपया सर्व आवश्यक माहिती भरा.' : 'Please fill all required fields.')
      return
    }

    if (isNaN(Number(area)) || Number(area) <= 0) {
      setValidationError(i18n.language === 'mr' ? 'कृपया वैध क्षेत्रफळ प्रविष्ट करा.' : 'Please enter a valid area size.')
      return
    }

    if (activePlot && Number(area) > remainingArea) {
      setValidationError(
        i18n.language === 'mr' 
          ? `या प्लॉटमध्ये फक्त ${remainingArea.toFixed(2)} ${activePlot.areaUnit} जागा शिल्लक आहे!` 
          : `Only ${remainingArea.toFixed(2)} ${activePlot.areaUnit} remaining in this plot!`
      )
      return
    }

    const sowTime = new Date(sowingDate).getTime()
    const harvestTime = new Date(expectedHarvestDate).getTime()

    if (harvestTime <= sowTime) {
      setValidationError(
        i18n.language === 'mr' 
          ? 'अपेक्षित काढणी तारीख पेरणी तारखेच्या नंतरची असावी.' 
          : 'Expected harvest date must be after the sowing date.'
      )
      return
    }

    const cropPayload = {
      cropType: finalCropType,
      variety,
      season,
      area: Number(area),
      sowingDate,
      expectedHarvestDate,
      estimatedYield: estimatedYield ? Number(estimatedYield) : undefined,
      estimatedYieldUnit: estimatedYield ? estimatedYieldUnit : undefined
    }

    if (cropId) {
      const success = await updateCrop(user.mobileNumber, plotId, cropId, cropPayload)
      if (success) {
        logger.info('Crop updated successfully', { plotId, cropId })
        onSuccess()
        onClose()
      } else {
        setValidationError(i18n.language === 'mr' ? 'पिक अद्यतनित करताना त्रुटी आली.' : 'Failed to update crop.')
      }
    } else {
      const successId = await createCrop(user.mobileNumber, plotId, cropPayload)
      if (successId) {
        logger.info('Crop registered successfully', { plotId, cropId: successId })
        onSuccess()
        onClose()
      } else {
        setValidationError(i18n.language === 'mr' ? 'पिक जतन करताना त्रुटी आली.' : 'Failed to register crop.')
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-[380px] bg-card border border-border rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent/40"
        >
          <X className="h-[18px] w-[18px]" />
        </button>

        <h3 className="text-base font-bold text-foreground mb-1 mt-1">
          {cropId 
            ? (i18n.language === 'mr' ? 'पिकाची माहिती सुधारा' : 'Edit Crop Details')
            : t('addCrop')}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          {cropId 
            ? (i18n.language === 'mr' ? 'पिकाचे क्षेत्रफळ आणि उत्पादनाची माहिती अद्यतनित करा.' : 'Update crop size and yield estimations.')
            : t('cropDetails')}
        </p>

        {validationError && (
          <div className="text-[11px] font-bold text-destructive bg-destructive/5 border border-destructive/15 rounded-xl px-3.5 py-2.5 text-center mb-4 animate-shake">
            ⚠️ {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1 relative">
            <label className="text-xs font-semibold text-foreground">
              {t('cropType')} <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder={i18n.language === 'mr' ? 'पीक शोधा किंवा नवीन नाव लिहा...' : 'Search or type crop name...'}
                value={cropSearch}
                onChange={(e) => {
                  setCropSearch(e.target.value)
                  setCropType(e.target.value)
                  setShowCropSuggestions(true)
                }}
                onFocus={() => setShowCropSuggestions(true)}
                className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
              {showCropSuggestions && (
                <div className="absolute top-11 left-0 right-0 z-50 max-h-48 overflow-y-auto bg-card border border-border rounded-xl shadow-lg p-1 flex flex-col gap-0.5 scroll-fade">
                  {[
                    { value: 'Wheat', label: t('wheat') },
                    { value: 'Cotton', label: t('cotton') },
                    { value: 'Soybean', label: t('soybean') },
                    { value: 'Rice', label: t('rice') },
                    { value: 'Sugarcane', label: t('sugarcane') },
                    { value: 'Onion', label: i18n.language === 'mr' ? 'कांदा (Onion)' : 'Onion' },
                    { value: 'Tomato', label: i18n.language === 'mr' ? 'टोमॅटो (Tomato)' : 'Tomato' },
                    { value: 'Maize', label: i18n.language === 'mr' ? 'मका (Maize)' : 'Maize' },
                    { value: 'Grapes', label: i18n.language === 'mr' ? 'द्राक्षे (Grapes)' : 'Grapes' },
                    { value: 'Pomegranate', label: i18n.language === 'mr' ? 'डाळिंब (Pomegranate)' : 'Pomegranate' },
                  ].filter(c => 
                    c.label.toLowerCase().includes(cropSearch.toLowerCase()) ||
                    c.value.toLowerCase().includes(cropSearch.toLowerCase())
                  ).map((crop) => (
                    <button
                      key={crop.value}
                      type="button"
                      onClick={() => {
                        setCropType(crop.value)
                        setCropSearch(crop.label)
                        setShowCropSuggestions(false)
                      }}
                      className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-accent/40 font-bold text-foreground transition-all flex items-center justify-between"
                    >
                      <span>{crop.label}</span>
                      {cropType === crop.value && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  ))}
                  
                  {cropSearch && ![
                    t('wheat').toLowerCase(),
                    t('cotton').toLowerCase(),
                    t('soybean').toLowerCase(),
                    t('rice').toLowerCase(),
                    t('sugarcane').toLowerCase(),
                    'onion',
                    'tomato',
                    'maize',
                    'grapes',
                    'pomegranate'
                  ].includes(cropSearch.trim().toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCropType(cropSearch)
                        setShowCropSuggestions(false)
                      }}
                      className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-primary/10 font-bold text-primary transition-all border border-dashed border-primary/20 bg-primary/5 mt-0.5"
                    >
                      ➕ "{cropSearch}" {i18n.language === 'mr' ? 'सानुकूल पीक जोडा' : 'Add as custom crop'}
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {showCropSuggestions && (
              <div 
                className="fixed inset-0 z-40 bg-transparent" 
                onClick={() => setShowCropSuggestions(false)}
              />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-foreground">
              {t('cropVariety')} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Phule Pragati"
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-foreground">
                {i18n.language === 'mr' ? 'क्षेत्रफळ (Area)' : 'Area Size'} <span className="text-destructive">*</span>
              </label>
              {activePlot && (
                <span className="text-[10px] font-bold text-primary">
                  {i18n.language === 'mr' 
                    ? `शिल्लक: ${remainingArea.toFixed(2)} ${activePlot.areaUnit}` 
                    : `Remaining: ${remainingArea.toFixed(2)} ${activePlot.areaUnit}`}
                </span>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              required
              placeholder={i18n.language === 'mr' ? 'पिकाचे क्षेत्रफळ प्रविष्ट करा' : 'Enter crop area size'}
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-foreground">
              {t('cropSeason')}
            </label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="Kharif">{t('seasonKharif')}</option>
              <option value="Rabi">{t('seasonRabi')}</option>
              <option value="Zaid">{t('seasonZaid')}</option>
            </select>
          </div>

          <div className="grid grid-cols-5 gap-2.5">
            <div className="col-span-3 flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground">
                {i18n.language === 'mr' ? 'अंदाजे उत्पादन' : 'Estimated Yield'}
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 50"
                value={estimatedYield}
                onChange={(e) => setEstimatedYield(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground">
                {t('areaUnit') === 'युनिट' ? 'युनिट' : 'Unit'}
              </label>
              <select
                value={estimatedYieldUnit}
                onChange={(e) => setEstimatedYieldUnit(e.target.value as any)}
                className="w-full h-10 px-2 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              >
                <option value="quintal">{i18n.language === 'mr' ? 'क्विंटल' : 'Quintal'}</option>
                <option value="kg">{i18n.language === 'mr' ? 'किलो' : 'Kg'}</option>
                <option value="ton">{i18n.language === 'mr' ? 'टन' : 'Ton'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] sm:text-xs font-semibold text-foreground">
                {t('sowingDate')} <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                required
                value={sowingDate}
                onChange={(e) => setSowingDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] sm:text-xs font-semibold text-foreground">
                {t('expectedHarvest')} <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                required
                value={expectedHarvestDate}
                onChange={(e) => setExpectedHarvestDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={onClose}
              className="h-10 px-4 rounded-xl text-xs font-semibold"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-10 px-5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground flex items-center gap-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{t('save')}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
