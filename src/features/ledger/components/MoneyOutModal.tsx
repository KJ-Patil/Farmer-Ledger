import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { 
  X, 
  Check, 
  Sprout, 
  Milk, 
  Home, 
  Camera, 
  Upload, 
  FileText, 
  Paperclip, 
  Mic, 
  Square, 
  TrendingDown, 
  Clock, 
  Calendar, 
  User, 
  DollarSign,
  AlertCircle
} from 'lucide-react'
import { usePlotStore } from '@/shared/hooks/usePlotStore'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import { useLedgerStore } from '@/shared/hooks/useLedgerStore'
import type { 
  LedgerType, 
  PaymentMode, 
  BillAttachment, 
  AgriExpenseCategory, 
  DairyExpenseCategory, 
  PersonalExpenseCategory 
} from '@/shared/types/ledger'

interface MoneyOutModalProps {
  isOpen: boolean
  onClose: () => void
  preselectedPlotId?: string
  preselectedCropId?: string
}

export function MoneyOutModal({
  isOpen,
  onClose,
  preselectedPlotId,
  preselectedCropId
}: MoneyOutModalProps) {
  const { i18n } = useTranslation()
  const isMr = i18n.language === 'mr'
  const { user } = useAuthStore()
  const { plots, crops, fetchPlots, fetchCrops } = usePlotStore()
  const { postExpenseTransaction } = useLedgerStore()

  // Primary expense ledger section: 'agriculture' | 'dairy' | 'personal'
  const [expenseLedger, setExpenseLedger] = useState<'agriculture' | 'dairy' | 'personal'>('agriculture')

  // Common Fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash')
  const [partyName, setPartyName] = useState('')
  const [notes, setNotes] = useState('')
  const [billNumber, setBillNumber] = useState('')
  const [dueDate, setDueDate] = useState('')

  // Agriculture Fields
  const [agriCategory, setAgriCategory] = useState<AgriExpenseCategory>('seeds')
  const [selectedPlotId, setSelectedPlotId] = useState(preselectedPlotId || '')
  const [selectedCropId, setSelectedCropId] = useState(preselectedCropId || '')
  const [cropSeason, setCropSeason] = useState(isMr ? 'खरीप २०२६' : 'Kharif 2026')

  // Dairy Fields
  const [dairyCategory, setDairyCategory] = useState<DairyExpenseCategory>('dairy_fodder')

  // Personal Fields
  const [personalCategory, setPersonalCategory] = useState<PersonalExpenseCategory>('home_expenses')

  // Attachment & Voice Recording
  const [attachment, setAttachment] = useState<BillAttachment | null>(null)
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const fileCameraRef = useRef<HTMLInputElement>(null)
  const fileGalleryRef = useRef<HTMLInputElement>(null)
  const filePdfRef = useRef<HTMLInputElement>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load plots and crops if needed
  useEffect(() => {
    if (user?.mobileNumber && isOpen) {
      fetchPlots(user.mobileNumber)
      fetchCrops(user.mobileNumber)
    }
  }, [user?.mobileNumber, isOpen, fetchPlots, fetchCrops])

  // Sync preselected plot/crop
  useEffect(() => {
    if (preselectedPlotId) setSelectedPlotId(preselectedPlotId)
    if (preselectedCropId) setSelectedCropId(preselectedCropId)
  }, [preselectedPlotId, preselectedCropId])

  // Rule 1: Auto-map to running (active) crop when plot is selected
  useEffect(() => {
    if (selectedPlotId && crops && Array.isArray(crops)) {
      const runningCrop = crops.find(
        (c) => c.plotId === selectedPlotId && c.status !== 'completed' && c.status !== 'harvested' && !c.isLocked
      )
      if (runningCrop && !preselectedCropId) {
        setSelectedCropId(runningCrop.id)
      }
    }
  }, [selectedPlotId, crops, preselectedCropId])

  if (!isOpen) return null

  // File Upload Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'pdf') => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setAttachment({
        name: file.name,
        type,
        dataUrl: reader.result as string,
        size: file.size
      })
    }
    reader.readAsDataURL(file)
  }

  // Voice Note Recording Handlers
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioUrl = URL.createObjectURL(audioBlob)
        setVoiceNoteUrl(audioUrl)
      }

      mediaRecorderRef.current.start()
      setIsRecordingVoice(true)
    } catch (err) {
      console.error('Audio recording failed:', err)
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop())
      setIsRecordingVoice(false)
    }
  }

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const parsedAmount = Number(amount)
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage(isMr ? 'कृपया वैध खर्च रक्कम प्रविष्ट करा.' : 'Please enter a valid expense amount.')
      return
    }

    if (!user?.mobileNumber) {
      setErrorMessage(isMr ? 'वापरकर्ता प्रमाणीकरण आवश्यक आहे.' : 'User authentication required.')
      return
    }

    // Determine category and parameters based on ledger section
    let chosenCategory = ''
    let finalPlotId = undefined
    let finalPlotName = undefined
    let finalCropId = undefined
    let finalCropName = undefined

    if (expenseLedger === 'agriculture') {
      chosenCategory = agriCategory
      if (selectedPlotId) {
        finalPlotId = selectedPlotId
        const plot = plots.find((p) => p.id === selectedPlotId)
        finalPlotName = plot ? `${plot.plotName} (${plot.surveyNumber || ''})`.trim() : undefined
      }
      if (selectedCropId) {
        finalCropId = selectedCropId
        const crop = crops.find((c) => c.id === selectedCropId)
        finalCropName = crop ? `${crop.cropName} (${crop.cropVariety || ''})`.trim() : undefined
      }
    } else if (expenseLedger === 'dairy') {
      chosenCategory = dairyCategory
    } else {
      chosenCategory = personalCategory
    }

    setIsSubmitting(true)
    try {
      const resId = await postExpenseTransaction(user.mobileNumber, {
        ledgerType: expenseLedger,
        category: chosenCategory,
        amount: parsedAmount,
        date,
        paymentMode,
        partyName: partyName.trim() || undefined,
        plotId: finalPlotId,
        plotName: finalPlotName,
        cropId: finalCropId,
        cropName: finalCropName,
        cropSeason: expenseLedger === 'agriculture' ? cropSeason : undefined,
        billNumber: billNumber.trim() || undefined,
        dueDate: paymentMode === 'credit' ? dueDate : undefined,
        notes: notes.trim() || undefined,
        attachment: attachment || undefined,
        voiceNoteUrl: voiceNoteUrl || undefined
      })

      if (resId) {
        setSuccessMessage(
          isMr 
            ? 'खर्चाची नोंद यशस्वीरित्या झाली! सर्व संबंधित खात्यांमध्ये Auto Posting पूर्ण.' 
            : 'Expense recorded successfully! Auto-posted to all relevant ledgers.'
        )
        setTimeout(() => {
          onClose()
        }, 1200)
      } else {
        setErrorMessage(isMr ? 'खर्च नोंदवण्यात त्रुटी आली.' : 'Failed to record expense.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Category Dictionaries
  const agriCategoriesList: { id: AgriExpenseCategory; labelMr: string; labelEn: string; icon: string }[] = [
    { id: 'seeds', labelMr: 'बियाणे (Seeds)', labelEn: 'Seeds', icon: '🌱' },
    { id: 'fertilizers', labelMr: 'खत (Fertilizers)', labelEn: 'Fertilizers', icon: '🧪' },
    { id: 'pesticides', labelMr: 'औषधे / कीटकनाशक', labelEn: 'Pesticides', icon: '🧴' },
    { id: 'labor', labelMr: 'मजुरी (Labor)', labelEn: 'Labor', icon: '👥' },
    { id: 'weeding', labelMr: 'खुरपणी (Weeding)', labelEn: 'Weeding', icon: '🌿' },
    { id: 'tractor', labelMr: 'ट्रॅक्टर भाडे/खर्च', labelEn: 'Tractor Rent/Cost', icon: '🚜' },
    { id: 'irrigation', labelMr: 'सिंचन (Irrigation)', labelEn: 'Irrigation', icon: '💧' },
    { id: 'agri_electricity', labelMr: 'शेती वीज बिल', labelEn: 'Agri Electricity', icon: '⚡' },
    { id: 'transport', labelMr: 'वाहतूक खर्च', labelEn: 'Transport', icon: '🚛' },
    { id: 'packing', labelMr: 'पॅकिंग व पोती', labelEn: 'Packing / Bags', icon: '📦' },
    { id: 'market_cost', labelMr: 'मार्केट / अडत खर्च', labelEn: 'Market / Commission', icon: '🏪' },
    { id: 'hamali', labelMr: 'हमाली (Hamali)', labelEn: 'Hamali Labor', icon: '🏋️' },
    { id: 'other_agri_expense', labelMr: 'इतर शेती खर्च', labelEn: 'Other Agri Expense', icon: '⚙️' },
  ]

  const dairyCategoriesList: { id: DairyExpenseCategory; labelMr: string; labelEn: string; icon: string }[] = [
    { id: 'dairy_fodder', labelMr: 'जनावरांचा चारा / पेंड', labelEn: 'Fodder / Cattle Feed', icon: '🌾' },
    { id: 'dairy_medicines', labelMr: 'औषधे व टॉनिक', labelEn: 'Medicines & Tonics', icon: '💊' },
    { id: 'veterinary_doctor', labelMr: 'पशुवैद्यकीय खर्च (डॉक्टर)', labelEn: 'Veterinary Doctor', icon: '🩺' },
    { id: 'milk_collection', labelMr: 'दूध संकलन खर्च', labelEn: 'Milk Collection Cost', icon: '🥛' },
    { id: 'dairy_electricity', labelMr: 'डेअरी वीज बिल', labelEn: 'Dairy Electricity', icon: '⚡' },
    { id: 'dairy_labor', labelMr: 'डेअरी मजुरी / कामगार', labelEn: 'Dairy Labor', icon: '🧑‍🌾' },
    { id: 'other_dairy_expense', labelMr: 'इतर डेअरी खर्च', labelEn: 'Other Dairy Expense', icon: '🐄' },
  ]

  const personalCategoriesList: { id: PersonalExpenseCategory; labelMr: string; labelEn: string; icon: string }[] = [
    { id: 'home_expenses', labelMr: 'घरखर्च (Home Expense)', labelEn: 'Home Expense', icon: '🏠' },
    { id: 'groceries', labelMr: 'किराणा (Groceries)', labelEn: 'Groceries', icon: '🛒' },
    { id: 'medical', labelMr: 'मेडिकल / आरोग्य', labelEn: 'Medical & Health', icon: '🏥' },
    { id: 'education', labelMr: 'शिक्षण फी / पुस्तके', labelEn: 'Education', icon: '📚' },
    { id: 'travel', labelMr: 'प्रवास खर्च (Travel)', labelEn: 'Travel', icon: '🚌' },
    { id: 'petrol', labelMr: 'पेट्रोल (Petrol)', labelEn: 'Petrol', icon: '⛽' },
    { id: 'diesel', labelMr: 'डिझेल (Diesel)', labelEn: 'Diesel', icon: '🛢️' },
    { id: 'electricity_bill', labelMr: 'घरगुती वीज बिल', labelEn: 'Electricity Bill', icon: '💡' },
    { id: 'mobile_recharge', labelMr: 'मोबाईल रिचार्ज', labelEn: 'Mobile Recharge', icon: '📱' },
    { id: 'marriage_function', labelMr: 'लग्न समारंभ / कार्य', labelEn: 'Function / Marriage', icon: '🎉' },
    { id: 'emergency_expense', labelMr: 'अचानक खर्च (Emergency)', labelEn: 'Emergency', icon: '🚨' },
    { id: 'other_expense', labelMr: 'इतर वैयक्तिक खर्च', labelEn: 'Other Personal Expense', icon: '📝' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-card border border-border/60 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/40 bg-gradient-to-r from-rose-500/10 via-destructive/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center text-rose-600 shadow-sm">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground">
                {isMr ? 'खर्च नोंदवा (Money Out)' : 'Record Expense (Money Out)'}
              </h2>
              <p className="text-[11px] text-muted-foreground font-medium">
                {isMr ? 'एक नोंद → शेती, डेअरी, रोख वही व नफा-तोटा खात्यात आपोआप जमा' : 'One Entry → Auto-posted to Plot, Dairy, Cash Book & P&L'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 3 Ledger Category Selection Tabs */}
        <div className="p-3 bg-muted/30 border-b border-border/30 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpenseLedger('agriculture')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              expenseLedger === 'agriculture'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border/30'
            }`}
          >
            <Sprout className="h-4 w-4" />
            <span>{isMr ? 'शेती खर्च (Agri)' : 'Agriculture'}</span>
          </button>

          <button
            type="button"
            onClick={() => setExpenseLedger('dairy')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              expenseLedger === 'dairy'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border/30'
            }`}
          >
            <Milk className="h-4 w-4" />
            <span>{isMr ? 'दूध व्यवसाय (Dairy)' : 'Dairy'}</span>
          </button>

          <button
            type="button"
            onClick={() => setExpenseLedger('personal')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              expenseLedger === 'personal'
                ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/20'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border/30'
            }`}
          >
            <Home className="h-4 w-4" />
            <span>{isMr ? 'वैयक्तिक खर्च (Personal)' : 'Personal'}</span>
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-6 space-y-4 flex-1">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-medium flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Amount & Date Primary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 block">
                {isMr ? 'खर्च रक्कम (Amount ₹) *' : 'Expense Amount (₹) *'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  autoFocus
                  className="w-full h-11 pl-8 pr-3 rounded-xl border border-rose-500/30 bg-rose-500/5 text-foreground text-base font-black focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 block">
                {isMr ? 'तारीख (Date) *' : 'Date *'}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
            </div>
          </div>

          {/* Category Selection Grid according to chosen Expense Ledger */}
          <div>
            <label className="text-[11px] font-bold text-foreground mb-1.5 block">
              {expenseLedger === 'agriculture'
                ? isMr ? 'शेती खर्च प्रकार (Category) *' : 'Agri Expense Category *'
                : expenseLedger === 'dairy'
                ? isMr ? 'डेअरी खर्च प्रकार (Category) *' : 'Dairy Expense Category *'
                : isMr ? 'वैयक्तिक खर्च प्रकार (Category) *' : 'Personal Expense Category *'}
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-border/40 rounded-2xl bg-muted/10">
              {expenseLedger === 'agriculture' &&
                agriCategoriesList.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setAgriCategory(cat.id)}
                    className={`p-2 rounded-xl text-left text-xs font-semibold transition-all flex items-center gap-2 border ${
                      agriCategory === cat.id
                        ? 'bg-primary/10 border-primary text-primary shadow-xs font-bold'
                        : 'bg-card border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="truncate">{isMr ? cat.labelMr : cat.labelEn}</span>
                  </button>
                ))}

              {expenseLedger === 'dairy' &&
                dairyCategoriesList.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setDairyCategory(cat.id)}
                    className={`p-2 rounded-xl text-left text-xs font-semibold transition-all flex items-center gap-2 border ${
                      dairyCategory === cat.id
                        ? 'bg-blue-600/10 border-blue-600 text-blue-600 shadow-xs font-bold'
                        : 'bg-card border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="truncate">{isMr ? cat.labelMr : cat.labelEn}</span>
                  </button>
                ))}

              {expenseLedger === 'personal' &&
                personalCategoriesList.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setPersonalCategory(cat.id)}
                    className={`p-2 rounded-xl text-left text-xs font-semibold transition-all flex items-center gap-2 border ${
                      personalCategory === cat.id
                        ? 'bg-amber-600/10 border-amber-600 text-amber-700 dark:text-amber-400 shadow-xs font-bold'
                        : 'bg-card border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="truncate">{isMr ? cat.labelMr : cat.labelEn}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Agriculture Specific Options: Plot, Crop, Season */}
          {expenseLedger === 'agriculture' && (
            <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/15 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <Sprout className="h-4 w-4" />
                <span>{isMr ? 'प्लॉट व पीक जोडणी (Auto Plot & Crop Ledger)' : 'Plot & Crop Linkage'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground mb-1 block">
                    {isMr ? 'शेत गट / प्लॉट' : 'Plot / Field'}
                  </label>
                  <select
                    value={selectedPlotId}
                    onChange={(e) => setSelectedPlotId(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-medium outline-none"
                  >
                    <option value="">{isMr ? '-- शेत निवडा (ऐच्छिक) --' : '-- Select Plot --'}</option>
                    {plots.map((plot) => (
                      <option key={plot.id} value={plot.id}>
                        {plot.plotName} ({plot.area} {plot.areaUnit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground mb-1 block">
                    {isMr ? 'पीक (Crop)' : 'Crop'}
                  </label>
                  <select
                    value={selectedCropId}
                    onChange={(e) => setSelectedCropId(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-medium outline-none"
                  >
                    <option value="">{isMr ? '-- पीक निवडा (ऐच्छिक) --' : '-- Select Crop --'}</option>
                    {crops
                      .filter((c) => !selectedPlotId || c.plotId === selectedPlotId)
                      .map((crop) => {
                        const isCompleted = crop.status === 'completed' || crop.status === 'harvested' || crop.isLocked
                        return (
                          <option key={crop.id} value={crop.id} disabled={isCompleted}>
                            {crop.cropName} {crop.cropVariety ? `(${crop.cropVariety})` : ''} {isCompleted ? (isMr ? '🔒 (पूर्ण/Locked)' : '🔒 (Completed)') : ''}
                          </option>
                        )
                      })}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground mb-1 block">
                    {isMr ? 'हंगाम / वर्ष' : 'Season / Year'}
                  </label>
                  <input
                    type="text"
                    value={cropSeason}
                    onChange={(e) => setCropSeason(e.target.value)}
                    placeholder={isMr ? 'उदा. खरीप २०२६' : 'e.g. Kharif 2026'}
                    className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-medium outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payment Mode & Party Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 block">
                {isMr ? 'पेमेंट प्रकार (Payment Mode) *' : 'Payment Mode *'}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'cash', labelMr: 'रोख', labelEn: 'Cash' },
                  { id: 'upi', labelMr: 'UPI', labelEn: 'UPI' },
                  { id: 'bank', labelMr: 'बँक', labelEn: 'Bank' },
                  { id: 'credit', labelMr: 'उधारी', labelEn: 'Credit' },
                  { id: 'cheque', labelMr: 'धनादेश', labelEn: 'Cheque' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMode(mode.id as PaymentMode)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                      paymentMode === mode.id
                        ? 'bg-foreground text-background border-foreground shadow-xs'
                        : 'bg-background border-border/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {isMr ? mode.labelMr : mode.labelEn}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 block">
                {expenseLedger === 'dairy'
                  ? isMr ? 'दुकान / डॉक्टर / विक्रेता' : 'Merchant / Doctor / Party'
                  : expenseLedger === 'agriculture'
                  ? isMr ? 'दुकानदार / मजूर टोळी / व्यापारी' : 'Merchant / Labor Gang'
                  : isMr ? 'व्यक्ती / दुकान (Party Name)' : 'Person / Shop Name'}
              </label>
              <input
                type="text"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder={isMr ? 'उदा. महालक्ष्मी कृषी केंद्र / गणपत पाटील' : 'e.g. Mahalakshmi Agro'}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Credit Due Date if Payment Mode is Credit */}
          {paymentMode === 'credit' && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                <Clock className="h-4 w-4" />
                <span>{isMr ? 'उधारी परतफेड तारीख (Due Date) :' : 'Credit Due Date :'}</span>
              </div>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 px-2.5 rounded-xl border border-amber-500/30 bg-background text-foreground text-xs font-bold outline-none"
              />
            </div>
          )}

          {/* Bill Number & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 block">
                {isMr ? 'बिल क्रमांक (Bill No. - Optional)' : 'Bill Number (Optional)'}
              </label>
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder={isMr ? 'उदा. INV-8472' : 'e.g. INV-8472'}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 block">
                {isMr ? 'टीप (Notes - Optional)' : 'Notes (Optional)'}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isMr ? 'खर्चाबाबत विशेष माहिती...' : 'Add any note...'}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Attachments & Voice Note */}
          <div className="space-y-2 pt-1 border-t border-border/30">
            <span className="text-[11px] font-bold text-muted-foreground block">
              {isMr ? 'पावती / फोटो / आवाज नोंद (Attachments & Voice Note)' : 'Attachments & Voice Note'}
            </span>

            {/* Hidden Input elements */}
            <input
              type="file"
              ref={fileCameraRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'image')}
            />
            <input
              type="file"
              ref={fileGalleryRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'image')}
            />
            <input
              type="file"
              ref={filePdfRef}
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'pdf')}
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileCameraRef.current?.click()}
                className="rounded-xl h-9 text-xs font-bold gap-1.5 hover:bg-muted/60"
              >
                <Camera className="h-4 w-4 text-primary" />
                <span>{isMr ? 'कॅमेरा' : 'Camera'}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileGalleryRef.current?.click()}
                className="rounded-xl h-9 text-xs font-bold gap-1.5 hover:bg-muted/60"
              >
                <Upload className="h-4 w-4 text-primary" />
                <span>{isMr ? 'गॅलरी' : 'Gallery'}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => filePdfRef.current?.click()}
                className="rounded-xl h-9 text-xs font-bold gap-1.5 hover:bg-muted/60"
              >
                <FileText className="h-4 w-4 text-primary" />
                <span>{isMr ? 'PDF बिल' : 'PDF Bill'}</span>
              </Button>

              {!isRecordingVoice ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleStartRecording}
                  className="rounded-xl h-9 text-xs font-bold gap-1.5 hover:bg-muted/60"
                >
                  <Mic className="h-4 w-4 text-rose-500" />
                  <span>{isMr ? 'आवाज नोंद' : 'Voice Note'}</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleStopRecording}
                  className="rounded-xl h-9 text-xs font-bold gap-1.5 bg-rose-500 hover:bg-rose-600 text-white animate-pulse"
                >
                  <Square className="h-3.5 w-3.5" />
                  <span>{isMr ? 'रेकॉर्डिंग थांबवा' : 'Stop Recording'}</span>
                </Button>
              )}
            </div>

            {/* Preview indicators */}
            {(attachment || voiceNoteUrl) && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {attachment && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/60 border border-border/40 text-xs font-medium">
                    <Paperclip className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate max-w-[140px]">{attachment.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {voiceNoteUrl && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-600">
                    <Mic className="h-3.5 w-3.5" />
                    <span>{isMr ? 'आवाज नोंद जोडली' : 'Voice attached'}</span>
                    <button
                      type="button"
                      onClick={() => setVoiceNoteUrl(null)}
                      className="hover:text-destructive ml-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-border/40 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl h-11 px-5 text-xs font-bold"
            >
              {isMr ? 'रद्द करा' : 'Cancel'}
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl h-11 px-6 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 gap-2"
            >
              <Check className="h-4 w-4" />
              <span>
                {isSubmitting
                  ? isMr ? 'नोंद होत आहे...' : 'Saving...'
                  : isMr ? 'खर्च जतन करा (Save Expense)' : 'Save Expense'}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
