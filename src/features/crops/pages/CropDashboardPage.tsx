import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Loader2, Calendar, Sprout, TrendingUp, TrendingDown, CheckCircle2, ChevronRight, X, Check, Activity } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePlotStore } from '@/shared/hooks/usePlotStore'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import { AddCropModal } from '@/features/crops/components/AddCropModal'
import { MoneyInModal } from '@/features/ledger/components/MoneyInModal'
import type { CropStatus } from '@/shared/types/plot'

export function CropDashboardPage() {
  const { plotId, cropId } = useParams<{ plotId: string; cropId: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const { plots, crops, fetchPlots, fetchCrops, updateCropStatus, loading } = usePlotStore()

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isMoneyInModalOpen, setIsMoneyInModalOpen] = useState(false)

  // Harvest Details state
  const [showHarvestDialog, setShowHarvestDialog] = useState(false)
  const [actualHarvestDate, setActualHarvestDate] = useState(new Date().toISOString().split('T')[0])
  const [actualYield, setActualYield] = useState('')
  const [actualYieldUnit, setActualYieldUnit] = useState<'quintal' | 'kg' | 'ton'>('quintal')
  const [harvestError, setHarvestError] = useState<string | null>(null)



  useEffect(() => {
    if (user) {
      if (plots.length === 0) {
        fetchPlots(user.mobileNumber)
      }
      if (plotId) {
        fetchCrops(user.mobileNumber, plotId)
      }
    }
  }, [user, plotId, plots.length, fetchPlots, fetchCrops])

  const activePlot = plots.find((p) => p.id === plotId)
  const activeCrop = plotId && crops[plotId] ? crops[plotId].find((c) => c.id === cropId) : undefined
  const isCropLocked = activeCrop?.stage === 'completed'

  if (loading && !activeCrop) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!activePlot || !activeCrop) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-center select-none">
        <p className="text-sm font-semibold text-muted-foreground">
          {i18n.language === 'mr' ? 'पिक सापडले नाही.' : 'Crop not found.'}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate(plotId ? `/plots/${plotId}` : '/plots')} className="rounded-xl">
          ← {i18n.language === 'mr' ? 'मागे जा' : 'Go Back'}
        </Button>
      </div>
    )
  }

  const handleStatusChange = async (newStatus: CropStatus, harvestData?: any) => {
    if (user && plotId && cropId) {
      await updateCropStatus(user.mobileNumber, plotId, cropId, newStatus, harvestData)
    }
  }

  const handleHarvestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setHarvestError(null)
    if (!actualYield || isNaN(Number(actualYield)) || Number(actualYield) <= 0) {
      setHarvestError(i18n.language === 'mr' ? 'कृपया वैध प्रत्यक्ष उत्पादन प्रविष्ट करा.' : 'Please enter a valid actual yield.')
      return
    }

    const sowTime = new Date(activeCrop.sowingDate).getTime()
    const harvestTime = new Date(actualHarvestDate).getTime()
    if (harvestTime <= sowTime) {
      setHarvestError(i18n.language === 'mr' ? 'प्रत्यक्ष काढणी तारीख पेरणी तारखेच्या नंतरची असावी.' : 'Actual harvest date must be after sowing date.')
      return
    }

    await handleStatusChange('harvested', {
      actualHarvestDate,
      actualYield: Number(actualYield),
      actualYieldUnit
    })
    setShowHarvestDialog(false)
  }

  // Timeline steps
  const timelineSteps: { key: CropStatus; label: string; desc: string }[] = [
    { key: 'sown', label: t('sown'), desc: i18n.language === 'mr' ? 'पेरणी किंवा पुनर्लागवड झाली.' : 'Sowing or transplantation done.' },
    { key: 'vegetative', label: t('vegetative'), desc: i18n.language === 'mr' ? 'पाने आणि फांद्या फुटणे.' : 'Leaf development and vegetative growth.' },
    { key: 'flowering', label: t('flowering'), desc: i18n.language === 'mr' ? 'फुले आणि फळे धरण्याचा काळ.' : 'Budding and reproductive growth.' },
    { key: 'harvested', label: t('harvested'), desc: i18n.language === 'mr' ? 'काढणी आणि विक्री तयार.' : 'Harvesting and yield calculation.' }
  ]

  const currentStepIdx = timelineSteps.findIndex((s) => s.key === activeCrop.status)

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto select-none">
      {/* Header section */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate(`/plots/${plotId}`)}
            className="h-9 w-9 rounded-xl shrink-0"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>{t('cropDashboard')}</span>
              <span className="text-primary font-extrabold text-lg bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/20">
                {t(activeCrop.cropType.toLowerCase()) !== activeCrop.cropType.toLowerCase() 
                  ? t(activeCrop.cropType.toLowerCase()) 
                  : activeCrop.cropType}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {i18n.language === 'mr' ? 'पिकाचा आलेख, स्थिती बदल आणि महसूल नोंदी.' : 'Manage crop developmental status and shortcut logs.'}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditModalOpen(true)}
          className="rounded-xl text-xs font-semibold gap-1.5 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary shrink-0"
        >
          {i18n.language === 'mr' ? 'सुधारा (Edit)' : 'Edit Crop'}
        </Button>
      </div>

      {/* Automated Harvest Reminder Banner */}
      {activeCrop.status !== 'harvested' && new Date(activeCrop.expectedHarvestDate) <= new Date() && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-pulse">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold uppercase tracking-wider">
              {i18n.language === 'mr' ? 'काढणीची तारीख उलटून गेली आहे' : 'Harvest Date Passed'}
            </span>
            <span className="text-xs font-semibold opacity-90 leading-normal">
              {i18n.language === 'mr' 
                ? `या पिकाची काढणी तारीख (${new Date(activeCrop.expectedHarvestDate).toLocaleDateString(i18n.language)}) उलटली आहे. कृपया काढणीची नोंद करून जागा रिकामी करा.`
                : `This crop's expected harvest date was ${new Date(activeCrop.expectedHarvestDate).toLocaleDateString(i18n.language)}. Please mark it as harvested to release the plot area.`}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setShowHarvestDialog(true)}
            className="bg-amber-500 hover:bg-amber-600 text-background text-xs font-semibold rounded-xl shrink-0"
          >
            {i18n.language === 'mr' ? 'काढणीची नोंद करा' : 'Mark as Harvested'}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card: Details & Quick Status Updates */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          <Card className="rounded-2xl border-border/40 bg-card shadow-sm p-5 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-foreground tracking-wider uppercase border-b border-border/20 pb-2">
              {t('cropDetails')}
            </h3>

            <div className="flex flex-col gap-3.5 text-xs font-semibold">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Sprout className="h-4 w-4 text-primary shrink-0" />
                  <span>{t('cropVariety')}</span>
                </span>
                <span className="text-foreground">{activeCrop.variety}</span>
              </div>

              {activeCrop.area !== undefined && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Sprout className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{i18n.language === 'mr' ? 'पिकाचे क्षेत्रफळ' : 'Crop Area'}</span>
                  </span>
                  <span className="text-foreground font-bold">
                    {activeCrop.area} {activePlot ? activePlot.areaUnit : ''}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>{t('cropSeason')}</span>
                </span>
                <span className="text-foreground">{t(`season${activeCrop.season}`)}</span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                  <span>{t('sowingDate')}</span>
                </span>
                <span className="text-foreground">
                  {new Date(activeCrop.sowingDate).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{t('expectedHarvest')}</span>
                </span>
                <span className="text-foreground">
                  {new Date(activeCrop.expectedHarvestDate).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {activeCrop.estimatedYield !== undefined && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-orange-500 shrink-0" />
                    <span>{i18n.language === 'mr' ? 'अंदाजे उत्पादन' : 'Estimated Yield'}</span>
                  </span>
                  <span className="text-foreground font-bold">
                    {activeCrop.estimatedYield} {t(activeCrop.estimatedYieldUnit || 'quintal')}
                  </span>
                </div>
              )}

              {activeCrop.status === 'harvested' && activeCrop.actualHarvestDate && (
                <div className="flex items-center justify-between text-muted-foreground border-t border-border/20 pt-2.5 mt-1">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{i18n.language === 'mr' ? 'प्रत्यक्ष काढणी' : 'Actual Harvest Date'}</span>
                  </span>
                  <span className="text-foreground">
                    {new Date(activeCrop.actualHarvestDate).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}

              {activeCrop.status === 'harvested' && activeCrop.actualYield !== undefined && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Sprout className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{i18n.language === 'mr' ? 'प्रत्यक्ष उत्पादन' : 'Actual Yield'}</span>
                  </span>
                  <span className="text-foreground font-extrabold text-emerald-600">
                    {activeCrop.actualYield} {t(activeCrop.actualYieldUnit || 'quintal')}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Quick logs shortcuts */}
          <Card className="rounded-2xl border-border/40 bg-card shadow-sm p-5 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-foreground tracking-wider uppercase flex items-center justify-between">
              <span>{t('incomeExpenseShortcuts')}</span>
              {isCropLocked && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 font-black">
                  🔒 Locked
                </span>
              )}
            </h3>

            {isCropLocked ? (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs font-bold space-y-1.5">
                <div className="flex items-center gap-1.5 font-black text-xs">
                  <span>🔒</span>
                  <span>{i18n.language === 'mr' ? 'पीक प्रकल्प पूर्ण व हिशोब लॉक (Completed & Locked)' : 'Crop Cycle Completed & Locked'}</span>
                </div>
                <p className="text-[11px] font-normal leading-relaxed opacity-90">
                  {i18n.language === 'mr' 
                    ? 'हा पीक प्रकल्प पूर्ण (Completed) झाल्यामुळे यात नवीन खर्च किंवा उत्पन्नाची नोंद करता येणार नाही (Rule 2 & 3). मागील पिकाचा हिशोब व नफा-तोटा कायमस्वरूपी जतन (Archived) केला आहे.' 
                    : 'This crop cycle has ended. Financial records are locked and permanently archived. To record new transactions, please select an active running crop.'}
                </p>
              </div>
            ) : (
              <>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {i18n.language === 'mr' 
                    ? 'या पिकासाठी उत्पन्न आणि खर्चाचे व्यवहार नोंदवा.' 
                    : 'Directly record ledger credit transactions or inventory expenses for this crop.'}
                </p>
                
                <div className="flex flex-col gap-2.5 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsMoneyInModalOpen(true)}
                    className="h-10 rounded-xl text-xs font-semibold gap-2 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 hover:text-emerald-700"
                  >
                    <TrendingUp className="h-4 w-4 shrink-0" />
                    <span>{i18n.language === 'mr' ? 'उत्पन्न जोडा (Record Income)' : 'Record Income Log'}</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => navigate('/ledger')}
                    className="h-10 rounded-xl text-xs font-semibold gap-2 border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive hover:text-destructive/80"
                  >
                    <TrendingDown className="h-4 w-4 shrink-0" />
                    <span>{i18n.language === 'mr' ? 'खर्च जोडा (Record Expense)' : 'Record Expense Log'}</span>
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Right Side: Crop Status Tracker Timeline */}
        <Card className="lg:col-span-2 rounded-2xl border-border/40 bg-card shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-border/20">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <ChevronRight className="h-5 w-5 text-primary shrink-0" />
              <span>{t('cropStatus')}</span>
            </CardTitle>
            <CardDescription className="text-xs font-semibold">
              {i18n.language === 'mr' ? 'पिकाच्या वाढीची स्थिती तपासा आणि अद्यतनित करा.' : 'Track and transition the developmental cycles of your crop.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 p-6 flex flex-col justify-between gap-8">
            {/* Timeline display */}
            <div className="relative flex flex-col gap-6 pl-6 border-l border-border/60">
              {timelineSteps.map((step, idx) => {
                const isActive = step.key === activeCrop.status
                const isCompleted = idx < currentStepIdx


                return (
                  <div key={step.key} className="relative flex flex-col gap-0.5">
                    {/* Circle marker */}
                    <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      isActive 
                        ? 'bg-primary border-primary scale-110 shadow-sm shadow-primary/20 ring-4 ring-primary/10' 
                        : isCompleted 
                          ? 'bg-emerald-500 border-emerald-500' 
                          : 'bg-background border-border/60'
                    }`}>
                      {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-background fill-emerald-500 stroke-none" />}
                    </div>

                    <span className={`text-xs font-bold leading-none ${
                      isActive ? 'text-primary' : isCompleted ? 'text-emerald-600' : 'text-muted-foreground'
                    }`}>
                      {step.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold mt-1">
                      {step.desc}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Transition Controls */}
            {activeCrop.status !== 'harvested' && (
              <div className="border-t border-border/20 pt-4 flex flex-col gap-2 mt-4">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                  Update Development Phase
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeCrop.status === 'sown' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange('vegetative')}
                      className="rounded-xl text-xs font-semibold px-4"
                    >
                      Move to Vegetative
                    </Button>
                  )}
                  {activeCrop.status === 'vegetative' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange('flowering')}
                      className="rounded-xl text-xs font-semibold px-4"
                    >
                      Move to Flowering
                    </Button>
                  )}
                  {activeCrop.status === 'flowering' && (
                    <Button
                      size="sm"
                      onClick={() => setShowHarvestDialog(true)}
                      className="rounded-xl text-xs font-semibold px-4 bg-emerald-500 hover:bg-emerald-600 text-background"
                    >
                      {i18n.language === 'mr' ? 'काढणीची नोंद करा' : 'Mark as Harvested'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Harvest Form Modal Dialog */}
      {showHarvestDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm p-4 select-none animate-in fade-in duration-200">
          <div className="w-full max-w-[360px] bg-card border border-border rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <button 
              onClick={() => setShowHarvestDialog(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent/40"
            >
              <X className="h-[18px] w-[18px]" />
            </button>

            <h3 className="text-base font-bold text-foreground mb-1 mt-1">
              {i18n.language === 'mr' ? 'पीक काढणी नोंदणी' : 'Record Crop Harvest'}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {i18n.language === 'mr' 
                ? 'काढणीची अंतिम तारीख आणि प्रत्यक्ष मिळालेलं उत्पादन नोंदवा.' 
                : 'Enter the actual harvest date and the final yield harvested.'}
            </p>

            {harvestError && (
              <div className="text-[11px] font-bold text-destructive bg-destructive/5 border border-destructive/15 rounded-xl px-3.5 py-2.5 text-center mb-4">
                ⚠️ {harvestError}
              </div>
            )}

            <form onSubmit={handleHarvestSubmit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">
                  {i18n.language === 'mr' ? 'काढणी तारीख' : 'Actual Harvest Date'} <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={actualHarvestDate}
                  onChange={(e) => setActualHarvestDate(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-5 gap-2.5">
                <div className="col-span-3 flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">
                    {i18n.language === 'mr' ? 'प्रत्यक्ष उत्पादन' : 'Actual Yield'} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="e.g. 48.5"
                    value={actualYield}
                    onChange={(e) => setActualYield(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>

                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">
                    {i18n.language === 'mr' ? 'युनिट' : 'Unit'}
                  </label>
                  <select
                    value={actualYieldUnit}
                    onChange={(e) => setActualYieldUnit(e.target.value as any)}
                    className="w-full h-10 px-2 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  >
                    <option value="quintal">{i18n.language === 'mr' ? 'क्विंटल' : 'Quintal'}</option>
                    <option value="kg">{i18n.language === 'mr' ? 'किलो' : 'Kg'}</option>
                    <option value="ton">{i18n.language === 'mr' ? 'टन' : 'Ton'}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowHarvestDialog(false)}
                  className="h-10 px-4 rounded-xl text-xs font-semibold"
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  className="h-10 px-5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-background flex items-center gap-1"
                >
                  <Check className="h-4 w-4" />
                  <span>{i18n.language === 'mr' ? 'जतन करा' : 'Save Harvest'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AddCropModal
        isOpen={isEditModalOpen}
        plotId={plotId || ''}
        cropId={cropId}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          setIsEditModalOpen(false)
          if (user && plotId) {
            fetchCrops(user.mobileNumber, plotId)
          }
        }}
      />

      <MoneyInModal
        isOpen={isMoneyInModalOpen}
        onClose={() => setIsMoneyInModalOpen(false)}
        preselectedPlotId={plotId}
        preselectedCropId={cropId}
        preselectedCropType={activeCrop.cropType}
      />
    </div>
  )
}
