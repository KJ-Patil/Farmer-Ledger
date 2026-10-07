import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, Plus, TrendingUp, TrendingDown, Trash2, Calendar, 
  X, Check, Search, Edit3, Sparkles, FolderPlus, Users, 
  Clock, Camera, Upload, FileText, Mic, Square, Paperclip, PieChart,
  History, Lock, ShieldCheck
} from 'lucide-react'
import { useLedgerStore } from '@/shared/hooks/useLedgerStore'
import { usePlotStore } from '@/shared/hooks/usePlotStore'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import type { LedgerType, TransactionType, PaymentMode, BillAttachment, OCRScanResult, Transaction } from '@/shared/types/ledger'
import { OCRScannerModal } from '../components/OCRScannerModal'
import { PartyLedgerView } from '../components/PartyLedgerView'
import { CreditTrackerView } from '../components/CreditTrackerView'
import { CustomLedgersModal } from '../components/CustomLedgersModal'
import { MoneyInModal } from '../components/MoneyInModal'
import { MoneyOutModal } from '../components/MoneyOutModal'
import { IncomeRegisterView } from '../components/IncomeRegisterView'
import { ProfitLossView } from '../components/ProfitLossView'
import { ReportsHubView } from '../components/ReportsHubView'

export const categoryTranslations: Record<string, { mr: string; en: string }> = {
  // Personal
  'home_expenses': { mr: 'घरखर्च (Home Expenses)', en: 'Home Expenses' },
  'groceries': { mr: 'किराणा (Groceries)', en: 'Groceries' },
  'medical': { mr: 'मेडिकल (Medical)', en: 'Medical' },
  'education': { mr: 'शिक्षण (Education)', en: 'Education' },
  'travel': { mr: 'प्रवास (Travel)', en: 'Travel' },
  'petrol': { mr: 'पेट्रोल (Petrol)', en: 'Petrol' },
  'diesel': { mr: 'डिझेल (Diesel)', en: 'Diesel' },
  'mobile_recharge': { mr: 'मोबाईल रिचार्ज (Mobile Recharge)', en: 'Mobile Recharge' },
  'electricity_bill': { mr: 'वीज बिल (Electricity Bill)', en: 'Electricity Bill' },
  'marriage_function': { mr: 'लग्न समारंभ (Marriage/Function)', en: 'Marriage/Function' },
  'emergency_expense': { mr: 'अचानक खर्च (Emergency Expense)', en: 'Emergency Expense' },
  'other_expense': { mr: 'इतर खर्च (Other Expense)', en: 'Other Expense' },
  // Agriculture
  'seeds': { mr: 'बियाणे (Seeds)', en: 'Seeds' },
  'fertilizers': { mr: 'खत (Fertilizers)', en: 'Fertilizers' },
  'pesticides': { mr: 'औषधे (Pesticides)', en: 'Pesticides' },
  'labor': { mr: 'मजुरी (Labor)', en: 'Labor' },
  'weeding': { mr: 'खुरपणी (Weeding)', en: 'Weeding' },
  'tractor': { mr: 'ट्रॅक्टर (Tractor)', en: 'Tractor' },
  'water': { mr: 'पाणी (Water)', en: 'Water' },
  'irrigation': { mr: 'सिंचन (Irrigation)', en: 'Irrigation' },
  'agri_electricity': { mr: 'शेती वीज बिल (Agri Electricity)', en: 'Agri Electricity' },
  'transport': { mr: 'वाहतूक (Transport)', en: 'Transport' },
  'harvesting_cost': { mr: 'काढणी खर्च (Harvesting Cost)', en: 'Harvesting Cost' },
  'packing': { mr: 'पॅकिंग (Packing)', en: 'Packing' },
  'market_cost': { mr: 'मार्केट खर्च (Market Cost)', en: 'Market Cost' },
  'hamali': { mr: 'हमाली खर्च (Hamali)', en: 'Hamali Labor' },
  'crop_sale': { mr: 'पीक विक्री (Crop Sale)', en: 'Crop Sale (Agri Income)' },
  'other_agri_expense': { mr: 'इतर शेती खर्च (Other Agri Expense)', en: 'Other Agri Expense' },
  // Dairy
  'dairy_fodder': { mr: 'जनावरांचा चारा (Dairy Fodder)', en: 'Fodder / Cattle Feed' },
  'dairy_medicines': { mr: 'डेअरी औषधे (Dairy Medicines)', en: 'Dairy Medicines' },
  'veterinary_doctor': { mr: 'पशुवैद्यकीय खर्च (Veterinary Dr.)', en: 'Veterinary Doctor' },
  'milk_collection': { mr: 'दूध संकलन खर्च (Milk Collection)', en: 'Milk Collection' },
  'dairy_electricity': { mr: 'डेअरी वीज बिल (Dairy Electricity)', en: 'Dairy Electricity' },
  'dairy_labor': { mr: 'डेअरी मजुरी (Dairy Labor)', en: 'Dairy Labor' },
  'other_dairy_expense': { mr: 'इतर डेअरी खर्च (Other Dairy)', en: 'Other Dairy Expense' }
}

export function LedgerPage() {
  const { t, i18n } = useTranslation()
  const isMr = i18n.language === 'mr'
  const { user } = useAuthStore()
  const { plots, crops, fetchPlots, fetchCrops } = usePlotStore()
  const { 
    transactions, 
    customLedgers,
    fetchTransactions, 
    fetchCustomLedgers,
    createTransaction, 
    deleteTransaction, 
    updateTransaction 
  } = useLedgerStore()

  // Navigation Tabs State
  const [activeTab, setActiveTab] = useState<'all_transactions' | 'income_register' | 'profit_loss' | 'reports_hub' | 'party_ledgers' | 'credit_tracker'>('all_transactions')

  // Modals visibility
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMoneyInModalOpen, setIsMoneyInModalOpen] = useState(false)
  const [isMoneyOutModalOpen, setIsMoneyOutModalOpen] = useState(false)
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false)
  const [isCustomLedgersModalOpen, setIsCustomLedgersModalOpen] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState<BillAttachment | null>(null)
  const [selectedAuditTx, setSelectedAuditTx] = useState<Transaction | null>(null)

  // Transaction Form States
  const [editingTxId, setEditingTxId] = useState<string | null>(null)
  const [type, setType] = useState<TransactionType>('expense')
  const [ledgerType, setLedgerType] = useState<LedgerType>('agriculture')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash')
  const [category, setCategory] = useState('seeds')
  const [customCategory, setCustomCategory] = useState('')
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [billNumber, setBillNumber] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [partyName, setPartyName] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState('')
  const [gstAmount, setGstAmount] = useState('')
  const [selectedPlotId, setSelectedPlotId] = useState('')
  const [selectedCropId, setSelectedCropId] = useState('')
  const [attachment, setAttachment] = useState<BillAttachment | null>(null)
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // File Upload input refs
  const fileCameraRef = useRef<HTMLInputElement>(null)
  const fileGalleryRef = useRef<HTMLInputElement>(null)
  const filePdfRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Filters State
  const [filterLedgerType, setFilterLedgerType] = useState<string>('all')
  const [filterTxType, setFilterTxType] = useState<string>('all')
  const [filterPaymentMode, setFilterPaymentMode] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (user) {
      fetchTransactions(user.mobileNumber)
      fetchCustomLedgers(user.mobileNumber)
      fetchPlots(user.mobileNumber)
    }
  }, [user])

  // Automatically fetch crops when plot is selected
  useEffect(() => {
    if (user && selectedPlotId) {
      fetchCrops(user.mobileNumber, selectedPlotId)
    }
  }, [user, selectedPlotId])

  // Reset category lists based on Ledger Type
  useEffect(() => {
    if (ledgerType === 'personal') {
      setCategory('home_expenses')
      setIsCustomCategory(false)
    } else if (ledgerType === 'agriculture') {
      setCategory('seeds')
      setIsCustomCategory(false)
    } else if (ledgerType === 'party' || ledgerType === 'custom') {
      if (customLedgers.length > 0) {
        setCategory(customLedgers[0].name)
      } else {
        setCategory('ABC कृषी सेवा केंद्र')
      }
    }
  }, [ledgerType, customLedgers])

  // Auto-set payment mode to credit if user enters due date
  useEffect(() => {
    if (paymentMode === 'credit' && !dueDate) {
      // Default due date to 30 days from transaction date
      const d = new Date(date)
      d.setDate(d.getDate() + 30)
      setDueDate(d.toISOString().split('T')[0])
    }
  }, [paymentMode, date])

  // Voice Note Recorder Handler
  const startVoiceRecording = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          const reader = new FileReader()
          reader.onloadend = () => {
            setVoiceNoteUrl(reader.result as string)
          }
          reader.readAsDataURL(audioBlob)
          stream.getTracks().forEach(track => track.stop())
        }

        mediaRecorder.start()
        setIsRecordingVoice(true)
      } else {
        // Fallback simulation for unsupported browsers/environments
        setIsRecordingVoice(true)
        setTimeout(() => {
          setIsRecordingVoice(false)
          setVoiceNoteUrl('simulation:voice_note_recorded')
        }, 2500)
      }
    } catch (err) {
      console.warn('Microphone access unavailable, using simulated voice note', err)
      // Provide simulated recorded voice note for smooth user experience
      setIsRecordingVoice(true)
      setTimeout(() => {
        setIsRecordingVoice(false)
        setVoiceNoteUrl('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=')
      }, 2000)
    }
  }

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop()
      setIsRecordingVoice(false)
    } else {
      setIsRecordingVoice(false)
      setVoiceNoteUrl('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=')
    }
  }

  // Handle Attachment Upload (Camera, Gallery, PDF)
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>, isPdf = false) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setAttachment({
        name: file.name,
        type: isPdf ? 'pdf' : 'image',
        dataUrl: reader.result as string,
        size: file.size
      })
    }
    reader.readAsDataURL(file)
  }

  // Handle OCR Result Auto-populate
  const handleApplyOCRResult = (result: OCRScanResult, billAttach?: BillAttachment) => {
    setType('expense')
    setLedgerType('agriculture')
    setAmount(String(result.amount))
    setDate(result.date)
    setBillNumber(result.billNumber)
    setPartyName(result.shopName)
    setItems(result.items)
    if (result.gstAmount) {
      setGstAmount(String(result.gstAmount))
    }
    if (billAttach) {
      setAttachment(billAttach)
    }
    setIsModalOpen(true)
  }

  const handleOpenAddModal = (prefillParty?: string) => {
    setEditingTxId(null)
    setValidationError(null)
    setAmount('')
    setNotes('')
    setItems('')
    setGstAmount('')
    setBillNumber('')
    setDueDate('')
    setAttachment(null)
    setVoiceNoteUrl(null)
    setSelectedPlotId('')
    setSelectedCropId('')
    setIsCustomCategory(false)

    if (prefillParty) {
      setPartyName(prefillParty)
      setLedgerType('party')
      setCategory(prefillParty)
    } else {
      setPartyName('')
      setLedgerType('agriculture')
      setCategory('seeds')
    }
    setPaymentMode('cash')
    setIsModalOpen(true)
  }

  const handleEditClick = (tx: any) => {
    if (tx.isAutoGenerated) {
      alert(
        isMr 
          ? 'नियम: कोणत्याही Auto Generated Ledger मध्ये थेट Edit करता येणार नाही.\nजर व्यवहारामध्ये बदल करायचा असेल तर मूळ Transaction शोधा आणि त्याच ठिकाणी बदल करा.' 
          : 'Rule: Auto-generated ledger entries cannot be directly edited.\nPlease locate and edit the original transaction.'
      )
      return
    }

    if (tx.isLocked) {
      alert(
        isMr 
          ? 'नियम: हे पीक पूर्ण (Completed) झालेले असल्याने याचे सर्व आर्थिक व्यवहार कायमस्वरूपी लॉक (Lock) केले आहेत.' 
          : 'Rule: This completed crop cycle transactions are permanently locked.'
      )
      return
    }

    setEditingTxId(tx.id)
    setType(tx.type)
    setLedgerType(tx.ledgerType || 'agriculture')
    setPaymentMode(tx.paymentMode || 'cash')
    
    // Check if category is preloaded or custom
    if (categoryTranslations[tx.category]) {
      setCategory(tx.category)
      setIsCustomCategory(false)
    } else {
      setIsCustomCategory(true)
      setCustomCategory(tx.category)
    }
    
    setAmount(String(tx.amount))
    setDate(tx.date)
    setBillNumber(tx.billNumber || '')
    setDueDate(tx.dueDate || '')
    setItems(tx.items || '')
    setGstAmount(tx.gstAmount ? String(tx.gstAmount) : '')
    setAttachment(tx.attachment || null)
    setVoiceNoteUrl(tx.voiceNoteUrl || null)
    
    // Link crop if it is linked
    if (tx.cropId) {
      const plotId = Object.keys(crops).find(pId => crops[pId]?.some(c => c.id === tx.cropId))
      if (plotId) {
        setSelectedPlotId(plotId)
        setSelectedCropId(tx.cropId)
      }
    } else {
      setSelectedPlotId('')
      setSelectedCropId('')
    }
    
    setPartyName(tx.partyName || '')
    setNotes(tx.notes || '')
    setValidationError(null)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!user) return

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setValidationError(isMr ? 'कृपया वैध रक्कम प्रविष्ट करा.' : 'Please enter a valid amount.')
      return
    }

    let finalCategory = category
    if (isCustomCategory) {
      finalCategory = customCategory.trim()
    } else if (ledgerType === 'party' && partyName) {
      finalCategory = partyName.trim()
    }

    if (!finalCategory) {
      setValidationError(isMr ? 'कृपया खाते / प्रवर्ग निवडा किंवा प्रविष्ट करा.' : 'Please select or enter category/ledger.')
      return
    }

    const activeCropList = selectedPlotId ? crops[selectedPlotId] || [] : []
    const activeCrop = activeCropList.find(c => c.id === selectedCropId)

    const txPayload = {
      type,
      ledgerType,
      category: finalCategory,
      amount: Number(amount),
      date,
      paymentMode,
      billNumber: billNumber.trim() || undefined,
      dueDate: paymentMode === 'credit' && dueDate ? dueDate : undefined,
      pendingAmount: paymentMode === 'credit' ? Number(amount) : 0,
      partyName: partyName.trim() || (ledgerType === 'party' ? finalCategory : undefined),
      cropId: selectedCropId || undefined,
      cropName: activeCrop ? activeCrop.cropType : undefined,
      notes: notes.trim() || undefined,
      items: items.trim() || undefined,
      gstAmount: gstAmount ? Number(gstAmount) : undefined,
      attachment: attachment || undefined,
      voiceNoteUrl: voiceNoteUrl || undefined
    }

    if (editingTxId) {
      const success = await updateTransaction(user.mobileNumber, editingTxId, txPayload)
      if (success) {
        setIsModalOpen(false)
        setEditingTxId(null)
      } else {
        setValidationError(isMr ? 'व्यवहार अद्यतनित करताना त्रुटी आली.' : 'Failed to update transaction.')
      }
    } else {
      const successId = await createTransaction(user.mobileNumber, txPayload)
      if (successId) {
        setIsModalOpen(false)
      } else {
        setValidationError(isMr ? 'व्यवहार जतन करताना त्रुटी आली.' : 'Failed to save transaction.')
      }
    }
  }

  // Filtered transactions list
  const filteredTxs = transactions.filter((tx) => {
    const matchesLedger = filterLedgerType === 'all' || tx.ledgerType === filterLedgerType
    const matchesTxType = filterTxType === 'all' || tx.type === filterTxType
    const matchesPaymentMode = filterPaymentMode === 'all' || (tx.paymentMode || 'cash') === filterPaymentMode
    
    const translatedCategory = categoryTranslations[tx.category]
      ? (isMr ? categoryTranslations[tx.category].mr : categoryTranslations[tx.category].en)
      : tx.category

    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = !searchQuery || 
      translatedCategory.toLowerCase().includes(searchLower) ||
      (tx.notes || '').toLowerCase().includes(searchLower) ||
      (tx.partyName || '').toLowerCase().includes(searchLower) ||
      (tx.billNumber || '').toLowerCase().includes(searchLower) ||
      (tx.cropName || '').toLowerCase().includes(searchLower) ||
      (tx.items || '').toLowerCase().includes(searchLower)

    return matchesLedger && matchesTxType && matchesPaymentMode && matchesSearch
  })

  // Summary Calculations
  const totalIncome = transactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0)
  const totalExpense = transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0)
  const netBalance = totalIncome - totalExpense
  const totalCreditDue = transactions
    .filter(tx => tx.paymentMode === 'credit' && (tx.pendingAmount !== undefined ? tx.pendingAmount : tx.amount) > 0)
    .reduce((sum, tx) => sum + (tx.pendingAmount !== undefined ? tx.pendingAmount : tx.amount), 0)

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto select-none pb-12">
      {/* Hidden File inputs for attachments */}
      <input 
        type="file" 
        ref={fileCameraRef} 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        onChange={(e) => handleAttachmentUpload(e, false)} 
      />
      <input 
        type="file" 
        ref={fileGalleryRef} 
        accept="image/*" 
        className="hidden" 
        onChange={(e) => handleAttachmentUpload(e, false)} 
      />
      <input 
        type="file" 
        ref={filePdfRef} 
        accept="application/pdf" 
        className="hidden" 
        onChange={(e) => handleAttachmentUpload(e, true)} 
      />

      {/* Header block with Actions */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary shrink-0" />
            <span>{isMr ? 'हिशोब आणि लेजर व्यवस्थापन' : 'Accounting & Ledger Management'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {isMr
              ? 'शेतकऱ्याचा वैयक्तिक, शेती आणि व्यवसायाचा संपूर्ण आर्थिक हिशोब.'
              : 'Complete financial ledger for farm business, personal cashflow, and party khaata.'}
          </p>
        </div>

        {/* Action Buttons - single row below subtitle */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOCRModalOpen(true)}
            className="rounded-xl h-10 px-3.5 text-xs font-bold gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 shadow-sm whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>{isMr ? 'AI बिल स्कॅनर' : 'AI OCR Scanner'}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCustomLedgersModalOpen(true)}
            className="rounded-xl h-10 px-3.5 text-xs font-bold gap-1.5 text-foreground hover:bg-muted/40 whitespace-nowrap"
          >
            <FolderPlus className="h-4 w-4 text-primary" />
            <span>{isMr ? 'सानुकूल खाती' : 'Custom Ledgers'}</span>
          </Button>

          <Button
            type="button"
            onClick={() => setIsMoneyInModalOpen(true)}
            className="rounded-xl shadow-md shadow-emerald-600/20 gap-1.5 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap"
          >
            <TrendingUp className="h-4 w-4" />
            <span>{isMr ? 'Money In' : 'Money In'}</span>
          </Button>

          <Button
            type="button"
            onClick={() => setIsMoneyOutModalOpen(true)}
            className="rounded-xl shadow-md shadow-rose-600/20 gap-1.5 h-10 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold whitespace-nowrap"
          >
            <TrendingDown className="h-4 w-4" />
            <span>{isMr ? 'Money Out' : 'Money Out'}</span>
          </Button>

          <Button
            onClick={() => handleOpenAddModal()}
            className="rounded-xl shadow-md shadow-primary/20 gap-1.5 h-10 px-4 bg-primary text-primary-foreground text-xs font-bold whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>{isMr ? 'व्यवहार जोडा' : 'Add Transaction'}</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards 4-Column Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Income */}
        <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5 shadow-sm p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
            {isMr ? 'एकूण जमा (Income)' : 'Total Income'}
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">
              ₹{totalIncome.toLocaleString()}
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
        </Card>

        {/* Total Expense */}
        <Card className="rounded-2xl border-destructive/20 bg-destructive/5 shadow-sm p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">
            {isMr ? 'एकूण खर्च (Expense)' : 'Total Expense'}
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl sm:text-2xl font-black text-destructive">
              ₹{totalExpense.toLocaleString()}
            </span>
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
        </Card>

        {/* Net Cash Balance */}
        <Card className={`rounded-2xl shadow-sm p-4 flex flex-col justify-between border-border/40 ${
          netBalance >= 0 ? 'bg-card' : 'bg-destructive/5 border-destructive/15'
        }`}>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {isMr ? 'शिल्लक रोकड (Net Balance)' : 'Net Balance'}
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className={`text-xl sm:text-2xl font-black ${netBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {netBalance < 0 ? '-' : ''}₹{Math.abs(netBalance).toLocaleString()}
            </span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
        </Card>

        {/* Total Credit Dues (उधारी बाकी) */}
        <Card className="rounded-2xl border-amber-500/20 bg-amber-500/5 shadow-sm p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
            {isMr ? 'बाकी उधारी (Credit Due)' : 'Pending Credit'}
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl sm:text-2xl font-black text-amber-600">
              ₹{totalCreditDue.toLocaleString()}
            </span>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
        </Card>
      </div>

      {/* Top Module Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-2xl border border-border/40 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('all_transactions')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'all_transactions'
              ? 'bg-card text-foreground shadow-sm ring-1 ring-border/50'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>{isMr ? 'सर्व व्यवहार (Transactions)' : 'All Transactions'}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-bold text-muted-foreground">
            {transactions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('income_register')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'income_register'
              ? 'bg-card text-emerald-600 shadow-sm ring-1 ring-border/50'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <span>{isMr ? 'उत्पन्न नोंदवही (Money In)' : 'Income Register'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profit_loss')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'profit_loss'
              ? 'bg-card text-primary shadow-sm ring-1 ring-border/50'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <PieChart className="h-4 w-4 text-primary" />
          <span>{isMr ? 'नफा-तोटा (Profit & Loss)' : 'Profit & Loss'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports_hub')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'reports_hub'
              ? 'bg-card text-amber-600 shadow-sm ring-1 ring-border/50'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4 text-amber-600" />
          <span>{isMr ? 'अहवाल (Reports & Export)' : 'Reports & Export'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('party_ledgers')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'party_ledgers'
              ? 'bg-card text-foreground shadow-sm ring-1 ring-border/50'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>{isMr ? 'पार्टी खाती (Party Ledgers)' : 'Party Ledgers'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('credit_tracker')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'credit_tracker'
              ? 'bg-card text-foreground shadow-sm ring-1 ring-border/50'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>{isMr ? 'उधारी हिशोब (Credit & Dues)' : 'Credit & Dues'}</span>
          {totalCreditDue > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
              ₹{totalCreditDue.toLocaleString()}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: All Transactions / Ledger View */}
      {activeTab === 'all_transactions' && (
        <Card className="rounded-2xl border-border/40 bg-card shadow-sm flex flex-col">
          {/* Filters Bar */}
          <div className="p-4 border-b border-border/20 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
              {/* Ledger Type Filter */}
              <select
                value={filterLedgerType}
                onChange={(e) => setFilterLedgerType(e.target.value)}
                className="h-9 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              >
                <option value="all">{isMr ? 'सर्व खाती (All Ledgers)' : 'All Ledgers'}</option>
                <option value="agriculture">{isMr ? 'शेती खाते (Agri)' : 'Agri Ledger'}</option>
                <option value="personal">{isMr ? 'वैयक्तिक खाते (Personal)' : 'Personal Ledger'}</option>
                <option value="party">{isMr ? 'पार्टी खाते (Party)' : 'Party Ledger'}</option>
                <option value="custom">{isMr ? 'सानुकूल खाते (Custom)' : 'Custom Ledger'}</option>
              </select>

              {/* Transaction Type Filter */}
              <select
                value={filterTxType}
                onChange={(e) => setFilterTxType(e.target.value)}
                className="h-9 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              >
                <option value="all">{isMr ? 'सर्व प्रकार (All Types)' : 'All Types'}</option>
                <option value="income">{isMr ? 'जमा (Income)' : 'Income'}</option>
                <option value="expense">{isMr ? 'खर्च (Expense)' : 'Expense'}</option>
              </select>

              {/* Payment Mode Filter */}
              <select
                value={filterPaymentMode}
                onChange={(e) => setFilterPaymentMode(e.target.value)}
                className="h-9 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none uppercase"
              >
                <option value="all">{isMr ? 'सर्व पेमेंट प्रकार' : 'All Modes'}</option>
                <option value="cash">CASH (रोख)</option>
                <option value="upi">UPI (गुगलपे/फोनपे)</option>
                <option value="credit">CREDIT (उधारी)</option>
                <option value="bank">BANK (बँक)</option>
                <option value="cheque">CHEQUE (धनादेश)</option>
              </select>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-64 shrink-0">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={isMr ? 'तपशील, बिल क्र., पार्टी शोधा...' : 'Search items, bills, party...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Transactions List */}
          <div className="divide-y divide-border/20 max-h-[550px] overflow-y-auto">
            {filteredTxs.length > 0 ? (
              filteredTxs.map((tx) => {
                const displayCategory = categoryTranslations[tx.category]
                  ? (isMr ? categoryTranslations[tx.category].mr.split(' ')[0] : categoryTranslations[tx.category].en)
                  : tx.category

                const isCredit = tx.paymentMode === 'credit'
                const isPending = isCredit && (tx.pendingAmount !== undefined ? tx.pendingAmount : tx.amount) > 0

                return (
                  <div key={tx.id} className="flex justify-between items-center p-3.5 sm:p-4 hover:bg-background/40 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'
                      }`}>
                        {tx.type === 'income' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground truncate">{displayCategory}</span>

                          {/* Ledger Type Badge */}
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                            tx.ledgerType === 'agriculture' 
                              ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20' 
                              : tx.ledgerType === 'personal'
                              ? 'bg-indigo-500/5 text-indigo-600 border-indigo-500/20'
                              : 'bg-amber-500/5 text-amber-600 border-amber-500/20'
                          }`}>
                            {tx.ledgerType === 'agriculture' ? (isMr ? 'शेती' : 'Agri') : tx.ledgerType === 'personal' ? (isMr ? 'वैयक्तिक' : 'Personal') : (isMr ? 'पार्टी' : 'Party')}
                          </span>

                          {/* Payment Mode Badge */}
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase border ${
                            isCredit 
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' 
                              : 'bg-muted text-muted-foreground border-border/40'
                          }`}>
                            {tx.paymentMode || 'CASH'}
                          </span>

                          {/* Bill Number Badge */}
                          {tx.billNumber && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-muted/60 text-foreground border border-border/40">
                              #{tx.billNumber}
                            </span>
                          )}

                          {/* Auto-posted Badge */}
                          {tx.isAutoGenerated && (
                            <span 
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-1"
                              title={isMr ? 'स्वयंचलित नोंद - थेट बदल करता येत नाही' : 'Auto-generated entry'}
                            >
                              <Lock className="h-2.5 w-2.5" />
                              <span>{isMr ? 'स्वयंचलित' : 'Auto'}</span>
                            </span>
                          )}

                          {/* Crop Locked Badge */}
                          {tx.isLocked && (
                            <span 
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1"
                              title={isMr ? 'पीक पूर्ण झालेले असल्याने व्यवहार लॉक केले आहेत' : 'Completed crop cycle - locked'}
                            >
                              <Lock className="h-2.5 w-2.5" />
                              <span>{isMr ? 'पीक लॉक' : 'Crop Locked'}</span>
                            </span>
                          )}

                          {/* Edited Audit Trail Badge */}
                          {tx.isEdited && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedAuditTx(tx)
                              }}
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                              title={isMr ? 'ऑडिट ट्रेल व बदल इतिहास पहा' : 'View Audit Trail & History'}
                            >
                              <History className="h-2.5 w-2.5" />
                              <span>{isMr ? 'बदल केलेले' : 'Edited'}</span>
                            </button>
                          )}

                          {/* Pending Badge */}
                          {isPending && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
                              {isMr ? 'बाकी' : 'Due'}
                            </span>
                          )}
                        </div>

                        {/* Metadata row */}
                        <span className="text-[10px] text-muted-foreground font-semibold mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="flex items-center gap-1 shrink-0">
                            <Calendar className="h-3 w-3" />
                            {new Date(tx.date).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>

                          {tx.partyName && (
                            <>
                              <span>•</span>
                              <span className="text-foreground shrink-0">👤 {tx.partyName}</span>
                            </>
                          )}

                          {tx.cropName && (
                            <>
                              <span>•</span>
                              <span className="text-primary shrink-0">🌾 {tx.cropName}</span>
                            </>
                          )}

                          {tx.items && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[120px] sm:max-w-xs">{tx.items}</span>
                            </>
                          )}

                          {tx.notes && (
                            <>
                              <span>•</span>
                              <span className="italic truncate max-w-[100px] sm:max-w-xs">{tx.notes}</span>
                            </>
                          )}

                          {/* Attachment Icon */}
                          {tx.attachment && (
                            <button
                              type="button"
                              onClick={() => setPreviewAttachment(tx.attachment || null)}
                              className="inline-flex items-center gap-0.5 text-primary hover:underline font-bold ml-1"
                            >
                              <Paperclip className="h-3 w-3" />
                              <span>{isMr ? 'बिल पहा' : 'Bill'}</span>
                            </button>
                          )}

                          {/* Voice Note Indicator */}
                          {tx.voiceNoteUrl && (
                            <span className="inline-flex items-center gap-0.5 text-indigo-500 font-bold ml-1">
                              <Mic className="h-3 w-3" />
                              <span>{isMr ? 'ऑडिओ' : 'Voice'}</span>
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="text-right">
                        <span className={`text-sm font-black block ${
                          tx.type === 'income' ? 'text-emerald-600' : 'text-foreground'
                        }`}>
                          {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                        </span>
                        {isPending && (
                          <span className="text-[10px] font-bold text-destructive">
                            {isMr ? 'बाकी:' : 'Due:'} ₹{(tx.pendingAmount ?? tx.amount).toLocaleString()}
                          </span>
                        )}
                      </div>
                      
                      {/* Edit Button with Protection */}
                      {tx.isAutoGenerated ? (
                        <button
                          type="button"
                          onClick={() => alert(isMr 
                            ? 'नियम: कोणत्याही Auto Generated Ledger मध्ये थेट Edit करता येणार नाही.\nजर व्यवहारामध्ये बदल करायचा असेल तर मूळ Transaction शोधून त्याच ठिकाणी बदल करा.' 
                            : 'Rule: Auto-generated ledger entries cannot be directly edited.\nPlease locate and edit the original transaction.'
                          )}
                          className="text-muted-foreground/40 hover:text-amber-500 h-8 w-8 rounded-lg flex items-center justify-center hover:bg-amber-500/10 transition-colors shrink-0"
                          title={isMr ? 'स्वयंचलित नोंद - थेट बदल करता येत नाही' : 'Auto-generated - cannot edit directly'}
                        >
                          <Lock className="h-4 w-4" />
                        </button>
                      ) : tx.isLocked ? (
                        <button
                          type="button"
                          onClick={() => alert(isMr 
                            ? 'नियम: हे पीक पूर्ण (Completed) झालेले असल्याने याचे सर्व आर्थिक व्यवहार कायमस्वरूपी लॉक (Lock) केले आहेत.' 
                            : 'Rule: This completed crop cycle transactions are permanently locked.'
                          )}
                          className="text-muted-foreground/40 hover:text-amber-500 h-8 w-8 rounded-lg flex items-center justify-center hover:bg-amber-500/10 transition-colors shrink-0"
                          title={isMr ? 'पीक लॉक आहे' : 'Crop is locked'}
                        >
                          <Lock className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEditClick(tx)}
                          className="text-muted-foreground hover:text-primary h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent/40 transition-colors shrink-0"
                          title={isMr ? 'दुरुस्त करा' : 'Edit'}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}

                      {/* Delete Button with Protection */}
                      {tx.isAutoGenerated ? (
                        <button
                          type="button"
                          onClick={() => alert(isMr 
                            ? 'नियम: Auto Generated नोंदी थेट Delete करता येत नाहीत.\nमूळ व्यवहार शोधा आणि Delete करा.' 
                            : 'Rule: Auto-generated entries cannot be directly deleted. Please delete the original transaction.'
                          )}
                          className="text-muted-foreground/30 hover:text-destructive/60 h-8 w-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors shrink-0"
                          title={isMr ? 'स्वयंचलित नोंद - डिलीट करता येत नाही' : 'Auto-generated - cannot delete'}
                        >
                          <Trash2 className="h-4 w-4 opacity-40" />
                        </button>
                      ) : tx.isLocked ? (
                        <button
                          type="button"
                          onClick={() => alert(isMr 
                            ? 'नियम: हे पीक पूर्ण (Completed) झालेले असल्याने याचे व्यवहार डिलीट करता येत नाहीत.' 
                            : 'Rule: Completed crop transactions cannot be deleted.'
                          )}
                          className="text-muted-foreground/30 hover:text-destructive/60 h-8 w-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors shrink-0"
                          title={isMr ? 'पीक लॉक आहे' : 'Crop is locked'}
                        >
                          <Trash2 className="h-4 w-4 opacity-40" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm(isMr ? 'हा व्यवहार कायमचा डिलीट करायचा आहे का?' : 'Are you sure you want to delete this transaction?')) {
                              user && deleteTransaction(user.mobileNumber, tx.id)
                            }
                          }}
                          className="text-muted-foreground hover:text-destructive h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent/40 transition-colors shrink-0"
                          title={isMr ? 'डिलीट करा' : 'Delete'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 gap-2">
                <BookOpen className="h-8 w-8 text-muted-foreground/45" />
                <p className="text-xs text-muted-foreground font-bold">
                  {isMr ? 'कोणतेही व्यवहार आढळले नाहीत.' : 'No transactions recorded matching filters.'}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Tab: Income Register View */}
      {activeTab === 'income_register' && (
        <IncomeRegisterView 
          transactions={transactions} 
          onOpenMoneyInModal={() => setIsMoneyInModalOpen(true)} 
          onPreviewAttachment={(att) => setPreviewAttachment(att)}
        />
      )}

      {/* Tab: Profit & Loss Engine View */}
      {activeTab === 'profit_loss' && (
        <ProfitLossView 
          transactions={transactions} 
          onOpenMoneyInModal={() => setIsMoneyInModalOpen(true)}
          onOpenMoneyOutModal={() => setIsMoneyOutModalOpen(true)}
        />
      )}

      {/* Tab: Reports & Export Hub View */}
      {activeTab === 'reports_hub' && (
        <ReportsHubView 
          transactions={transactions} 
          customLedgers={customLedgers}
        />
      )}

      {/* Tab 2: Party Ledgers (पार्टी खाती) */}
      {activeTab === 'party_ledgers' && (
        <PartyLedgerView 
          transactions={transactions} 
          customLedgers={customLedgers} 
          onOpenAddModal={(party) => handleOpenAddModal(party)} 
        />
      )}

      {/* Tab 3: Credit Purchases & Dues Tracker */}
      {activeTab === 'credit_tracker' && (
        <CreditTrackerView 
          transactions={transactions} 
          onOpenAddModal={() => {
            handleOpenAddModal()
            setPaymentMode('credit')
          }} 
        />
      )}

      {/* Money In Modal Component */}
      <MoneyInModal
        isOpen={isMoneyInModalOpen}
        onClose={() => setIsMoneyInModalOpen(false)}
      />

      {/* Money Out Modal Component */}
      <MoneyOutModal
        isOpen={isMoneyOutModalOpen}
        onClose={() => setIsMoneyOutModalOpen(false)}
      />

      {/* OCR Scanner Modal Component */}
      <OCRScannerModal
        isOpen={isOCRModalOpen}
        onClose={() => setIsOCRModalOpen(false)}
        onApplyResult={handleApplyOCRResult}
      />

      {/* Custom Ledgers Management Modal */}
      <CustomLedgersModal
        isOpen={isCustomLedgersModalOpen}
        onClose={() => setIsCustomLedgersModalOpen(false)}
      />

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl p-5 shadow-2xl relative">
            <button
              onClick={() => setPreviewAttachment(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent/40"
            >
              <X className="h-[18px] w-[18px]" />
            </button>

            <h3 className="text-sm font-bold text-foreground mb-3 truncate pr-8">
              {previewAttachment.name}
            </h3>

            {previewAttachment.type === 'image' ? (
              <div className="max-h-96 overflow-auto rounded-xl border border-border/60 bg-muted/20 flex items-center justify-center p-2">
                <img 
                  src={previewAttachment.dataUrl} 
                  alt="Bill attachment" 
                  className="max-h-80 w-auto rounded-lg object-contain shadow-sm"
                />
              </div>
            ) : (
              <div className="p-8 text-center bg-muted/20 border border-border/60 rounded-xl flex flex-col items-center gap-2">
                <FileText className="h-12 w-12 text-primary" />
                <span className="text-xs font-semibold">{previewAttachment.name}</span>
                <a
                  href={previewAttachment.dataUrl}
                  download={previewAttachment.name}
                  className="mt-2 text-xs font-bold text-primary underline"
                >
                  {isMr ? 'PDF डाउनलोड करा' : 'Download PDF'}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Trail Modal (ऑडिट ट्रेल व व्यवहार इतिहास) */}
      {selectedAuditTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex items-center justify-between bg-purple-500/10">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-purple-600" />
                <div>
                  <h3 className="font-black text-sm">
                    {isMr ? 'ऑडिट ट्रेल आणि व्यवहार बदल इतिहास' : 'Audit Trail & Transaction History'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {isMr ? 'आर्थिक व्यवहारांची पारदर्शकता व मागील नोंदींची सुरक्षा' : 'Financial integrity & historical audit trail'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAuditTx(null)}
                className="h-8 w-8 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              {/* Audit Status Badge */}
              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-purple-700 dark:text-purple-300 flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4" />
                    {isMr ? 'स्थिती: संपादित व्यवहार (Edited Transaction)' : 'Status: Edited Transaction'}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ID: {selectedAuditTx.id.slice(0, 10)}
                  </span>
                </div>
                {selectedAuditTx.editDate && (
                  <p className="text-muted-foreground text-[11px]">
                    📅 <span className="font-semibold">{isMr ? 'दुरुस्ती दिनांक:' : 'Edit Date:'}</span> {new Date(selectedAuditTx.editDate).toLocaleString(i18n.language)}
                  </p>
                )}
                {selectedAuditTx.editedBy && (
                  <p className="text-muted-foreground text-[11px]">
                    👤 <span className="font-semibold">{isMr ? 'बदल करणारा:' : 'Edited By:'}</span> {selectedAuditTx.editedBy}
                  </p>
                )}
              </div>

              {/* Current Value (सद्य मूल्य) */}
              <div className="rounded-2xl border p-3.5 bg-emerald-500/5 border-emerald-500/20">
                <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                  <Check className="h-4 w-4" />
                  <span>{isMr ? 'सद्य मूल्य (Current Value)' : 'Current Value'}</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">{isMr ? 'रक्कम:' : 'Amount:'}</span>
                    <span className="font-black text-emerald-600 text-sm">₹{selectedAuditTx.amount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">{isMr ? 'प्रकार / खाते:' : 'Category / Ledger:'}</span>
                    <span className="font-bold">{categoryTranslations[selectedAuditTx.category]?.[isMr ? 'mr' : 'en'] || selectedAuditTx.category}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">{isMr ? 'दिनांक:' : 'Date:'}</span>
                    <span className="font-bold">{selectedAuditTx.date}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">{isMr ? 'पेमेंट पद्धत:' : 'Payment Mode:'}</span>
                    <span className="font-bold uppercase">{selectedAuditTx.paymentMode}</span>
                  </div>
                  {selectedAuditTx.partyName && (
                    <div>
                      <span className="text-muted-foreground block text-[10px]">{isMr ? 'पार्टी / शेतकरी:' : 'Party:'}</span>
                      <span className="font-bold">{selectedAuditTx.partyName}</span>
                    </div>
                  )}
                  {selectedAuditTx.notes && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground block text-[10px]">{isMr ? 'टीप:' : 'Notes:'}</span>
                      <span className="italic">{selectedAuditTx.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Previous Value History (मागील मूल्ये इतिहास) */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{isMr ? 'मागील मूल्यांचा इतिहास (Previous Value History)' : 'Previous Values History'}</span>
                </h4>

                {selectedAuditTx.editHistory && selectedAuditTx.editHistory.length > 0 ? (
                  selectedAuditTx.editHistory.map((hist, idx) => (
                    <div key={idx} className="rounded-2xl border p-3 bg-muted/40 border-border text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground pb-1 border-b border-border/40">
                        <span>#{idx + 1} {isMr ? 'बदलापूर्वीची नोंद' : 'Historical Revision'}</span>
                        <span className="text-[10px]">{new Date(hist.editedAt).toLocaleString(i18n.language)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">{isMr ? 'मागील रक्कम:' : 'Prev Amount:'}</span>
                          <span className="font-black text-destructive">₹{hist.previousAmount.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">{isMr ? 'मागील वर्ग:' : 'Prev Category:'}</span>
                          <span className="font-bold">{categoryTranslations[hist.previousCategory]?.[isMr ? 'mr' : 'en'] || hist.previousCategory}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">{isMr ? 'मागील दिनांक:' : 'Prev Date:'}</span>
                          <span className="font-bold">{hist.previousDate}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">{isMr ? 'मागील पेमेंट:' : 'Prev Mode:'}</span>
                          <span className="font-bold uppercase">{hist.previousPaymentMode}</span>
                        </div>
                        {hist.previousNotes && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground block text-[10px]">{isMr ? 'मागील टीप:' : 'Prev Notes:'}</span>
                            <span className="italic text-muted-foreground">{hist.previousNotes}</span>
                          </div>
                        )}
                        {hist.reason && (
                          <div className="col-span-2 text-purple-600 dark:text-purple-400 text-[11px]">
                            {isMr ? 'बदलाचे कारण:' : 'Reason:'} {hist.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic p-2 bg-muted/20 rounded-xl">
                    {isMr ? 'या व्यवहाराचा मूळ इतिहास जतन केलेला आहे.' : 'Primary change history saved.'}
                  </p>
                )}
              </div>
            </div>

            <div className="p-3 border-t bg-muted/20 flex justify-end">
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setSelectedAuditTx(null)}>
                {isMr ? 'बंद करा' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Transaction Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto select-none animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent/40"
            >
              <X className="h-[18px] w-[18px]" />
            </button>

            <div className="flex items-center justify-between pr-8 mb-1">
              <h3 className="text-base font-bold text-foreground">
                {editingTxId 
                  ? (isMr ? 'व्यवहार सुधारा (Edit Transaction)' : 'Edit Transaction') 
                  : (isMr ? 'नवीन व्यवहार जोडा' : 'Add New Transaction')}
              </h3>

              {/* OCR shortcut button inside modal */}
              {!editingTxId && (
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setIsOCRModalOpen(true)
                  }}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>{isMr ? 'AI स्कॅन' : 'AI Scan'}</span>
                </button>
              )}
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              {isMr 
                ? 'वैयक्तिक, शेती किंवा पार्टी व्यवहाराची संपूर्ण माहिती नोंदवा.' 
                : 'Log personal cash flow, agricultural expenses, or merchant party credit.'}
            </p>

            {validationError && (
              <div className="text-[11px] font-bold text-destructive bg-destructive/5 border border-destructive/15 rounded-xl px-3.5 py-2.5 text-center mb-3">
                ⚠️ {validationError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* Type Toggles (Expense vs Income) */}
              <div className="grid grid-cols-2 gap-2 bg-accent/40 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`h-8 text-xs font-bold rounded-lg transition-all ${
                    type === 'expense' 
                      ? 'bg-destructive text-destructive-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isMr ? 'खर्च / नावे (Expense / Debit)' : 'Expense (Debit)'}
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`h-8 text-xs font-bold rounded-lg transition-all ${
                    type === 'income' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isMr ? 'जमा (Income / Credit)' : 'Income (Credit)'}
                </button>
              </div>

              {/* Ledger Type Toggles (Agriculture / Personal / Party / Custom) */}
              <div className="grid grid-cols-4 gap-1.5 bg-accent/40 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setLedgerType('agriculture')}
                  className={`h-8 text-[11px] font-bold rounded-lg transition-all ${
                    ledgerType === 'agriculture' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isMr ? 'शेती खाते' : 'Agri'}
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerType('personal')}
                  className={`h-8 text-[11px] font-bold rounded-lg transition-all ${
                    ledgerType === 'personal' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isMr ? 'वैयक्तिक' : 'Personal'}
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerType('party')}
                  className={`h-8 text-[11px] font-bold rounded-lg transition-all ${
                    ledgerType === 'party' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isMr ? 'पार्टी खाते' : 'Party'}
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerType('custom')}
                  className={`h-8 text-[11px] font-bold rounded-lg transition-all ${
                    ledgerType === 'custom' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isMr ? 'सानुकूल' : 'Custom'}
                </button>
              </div>

              {/* Transaction Type / Payment Mode Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>{isMr ? 'पेमेंट प्रकार (Transaction Type)' : 'Payment Mode'} <span className="text-destructive">*</span></span>
                  {paymentMode === 'credit' && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      {isMr ? 'उधारी खरेदी' : 'Credit Purchase'}
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['cash', 'upi', 'credit', 'bank', 'cheque'] as PaymentMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`h-8 rounded-xl border text-[10px] font-bold uppercase transition-all ${
                        paymentMode === mode
                          ? mode === 'credit' 
                            ? 'border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500 font-black' 
                            : 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Selector / Preloaded / Custom */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-foreground">
                    {isMr ? 'व्यवहार खाते / प्रवर्ग (Ledger)' : 'Ledger Category'} <span className="text-destructive">*</span>
                  </label>
                  {ledgerType !== 'party' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(!isCustomCategory)
                        setCustomCategory('')
                      }}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      {isCustomCategory 
                        ? (isMr ? 'यादी निवडा' : 'Select Preloaded') 
                        : (isMr ? 'सानुकूल लिहा +' : 'Type Custom +')}
                    </button>
                  )}
                </div>

                {isCustomCategory ? (
                  <input
                    type="text"
                    required
                    placeholder={isMr ? 'सानुकूल खात्याचे नाव प्रविष्ट करा...' : 'Enter custom category/ledger name...'}
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full h-9 px-3.5 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  />
                ) : ledgerType === 'party' || ledgerType === 'custom' ? (
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value)
                      if (ledgerType === 'party') {
                        setPartyName(e.target.value)
                      }
                    }}
                    className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  >
                    {customLedgers.map(cl => (
                      <option key={cl.id} value={cl.name}>{cl.name} ({cl.partyType ? cl.partyType.replace('_', ' ') : cl.type})</option>
                    ))}
                    {customLedgers.length === 0 && (
                      <option value="ABC कृषी सेवा केंद्र">ABC कृषी सेवा केंद्र</option>
                    )}
                  </select>
                ) : (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  >
                    {ledgerType === 'agriculture' ? (
                      <>
                        <option value="seeds">{categoryTranslations.seeds.mr}</option>
                        <option value="fertilizers">{categoryTranslations.fertilizers.mr}</option>
                        <option value="pesticides">{categoryTranslations.pesticides.mr}</option>
                        <option value="labor">{categoryTranslations.labor.mr}</option>
                        <option value="tractor">{categoryTranslations.tractor.mr}</option>
                        <option value="water">{categoryTranslations.water.mr}</option>
                        <option value="irrigation">{categoryTranslations.irrigation.mr}</option>
                        <option value="transport">{categoryTranslations.transport.mr}</option>
                        <option value="harvesting_cost">{categoryTranslations.harvesting_cost.mr}</option>
                        <option value="packing">{categoryTranslations.packing.mr}</option>
                        <option value="market_cost">{categoryTranslations.market_cost.mr}</option>
                        <option value="crop_sale">{categoryTranslations.crop_sale.mr}</option>
                        <option value="other_agri_expense">{categoryTranslations.other_agri_expense.mr}</option>
                      </>
                    ) : (
                      <>
                        <option value="home_expenses">{categoryTranslations.home_expenses.mr}</option>
                        <option value="groceries">{categoryTranslations.groceries.mr}</option>
                        <option value="medical">{categoryTranslations.medical.mr}</option>
                        <option value="education">{categoryTranslations.education.mr}</option>
                        <option value="travel">{categoryTranslations.travel.mr}</option>
                        <option value="petrol">{categoryTranslations.petrol.mr}</option>
                        <option value="diesel">{categoryTranslations.diesel.mr}</option>
                        <option value="mobile_recharge">{categoryTranslations.mobile_recharge.mr}</option>
                        <option value="electricity_bill">{categoryTranslations.electricity_bill.mr}</option>
                        <option value="marriage_function">{categoryTranslations.marriage_function.mr}</option>
                        <option value="emergency_expense">{categoryTranslations.emergency_expense.mr}</option>
                        <option value="other_expense">{categoryTranslations.other_expense.mr}</option>
                      </>
                    )}
                  </select>
                )}
              </div>

              {/* Amount & Date Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">
                    {isMr ? 'रक्कम (₹)' : 'Amount (₹)'} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="₹ e.g. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-sm font-bold focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">
                    {isMr ? 'व्यवहार तारीख' : 'Date'} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Bill Number & Party Name Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {isMr ? 'बिल / पावती क्रमांक' : 'Bill / Invoice #'}
                  </label>
                  <input
                    type="text"
                    placeholder={isMr ? 'उदा. INV-892' : 'e.g. INV-892'}
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {isMr ? 'पार्टी / व्यक्ती / दुकान नाव' : 'Party / Merchant Name'}
                  </label>
                  <input
                    type="text"
                    placeholder={isMr ? 'उदा. ABC कृषी सेवा केंद्र' : 'e.g. ABC Krishi Kendra'}
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Credit Purchase Specific: Due Date */}
              {paymentMode === 'credit' && (
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {isMr ? 'उधारी देय मुदत (Due Date)' : 'Credit Due Date'}
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                      {isMr ? 'बाकी रक्कम:' : 'Pending:'} ₹{amount || 0}
                    </span>
                  </div>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              )}

              {/* Items & GST Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {isMr ? 'वस्तू / तपशील' : 'Items Description'}
                  </label>
                  <input
                    type="text"
                    placeholder={isMr ? 'उदा. १०:२६:२६ (५ पोती)' : 'e.g. Seeds, Fertilizer bags'}
                    value={items}
                    onChange={(e) => setItems(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {isMr ? 'GST (रक्कम)' : 'GST (₹)'}
                  </label>
                  <input
                    type="number"
                    placeholder="₹ 0"
                    value={gstAmount}
                    onChange={(e) => setGstAmount(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Optional Link Plot / Crop for Agri */}
              {ledgerType === 'agriculture' && plots.length > 0 && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-foreground">
                      {isMr ? 'शेत गट (Link Plot)' : 'Link Plot'}
                    </label>
                    <select
                      value={selectedPlotId}
                      onChange={(e) => {
                        setSelectedPlotId(e.target.value)
                        setSelectedCropId('')
                      }}
                      className="w-full h-8 px-2 rounded-lg border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option value="">{isMr ? '-- निवडा --' : '-- Select Plot --'}</option>
                      {plots.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Gat {p.gatNumber})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-foreground">
                      {isMr ? 'पीक (Link Crop)' : 'Link Crop'}
                    </label>
                    <select
                      value={selectedCropId}
                      disabled={!selectedPlotId}
                      onChange={(e) => setSelectedCropId(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
                    >
                      <option value="">{isMr ? '-- निवडा --' : '-- Select Crop --'}</option>
                      {(selectedPlotId ? crops[selectedPlotId] || [] : []).map(c => (
                        <option key={c.id} value={c.id}>{c.cropType} ({c.variety})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Remarks / Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-foreground">
                  {isMr ? 'खर्चाचा तपशील / नोट्स' : 'Notes / Remarks'}
                </label>
                <input
                  type="text"
                  placeholder={isMr ? 'उदा. ५ पोती सुपर फॉस्फेट खरेदी' : 'e.g. Notes on transaction'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>

              {/* Attachments Section: Bill Upload & Voice Note */}
              <div className="flex flex-col gap-2 pt-1 border-t border-border/40">
                <span className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
                  <span>{isMr ? 'बिल व पुरावा जोडा (Attachments):' : 'Add Bill & Voice Note:'}</span>
                  {attachment && (
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="text-destructive text-[10px] hover:underline"
                    >
                      {isMr ? 'काढून टाका' : 'Remove Bill'}
                    </button>
                  )}
                </span>

                <div className="grid grid-cols-4 gap-2">
                  {/* Photo Capture */}
                  <button
                    type="button"
                    onClick={() => fileCameraRef.current?.click()}
                    className="h-10 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 text-foreground flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5 text-primary" />
                    <span>{isMr ? 'फोटो' : 'Photo'}</span>
                  </button>

                  {/* Gallery Upload */}
                  <button
                    type="button"
                    onClick={() => fileGalleryRef.current?.click()}
                    className="h-10 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 text-foreground flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{isMr ? 'गॅलरी' : 'Gallery'}</span>
                  </button>

                  {/* PDF Upload */}
                  <button
                    type="button"
                    onClick={() => filePdfRef.current?.click()}
                    className="h-10 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 text-foreground flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{isMr ? 'PDF' : 'PDF'}</span>
                  </button>

                  {/* Voice Note Recorder */}
                  <button
                    type="button"
                    onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
                    className={`h-10 rounded-xl border flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-all ${
                      isRecordingVoice
                        ? 'border-destructive bg-destructive/20 text-destructive animate-pulse'
                        : voiceNoteUrl
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600'
                        : 'border-border bg-muted/20 hover:bg-muted/40 text-foreground'
                    }`}
                  >
                    {isRecordingVoice ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5 text-red-500" />}
                    <span>{isRecordingVoice ? (isMr ? 'थांबवा' : 'Stop') : voiceNoteUrl ? (isMr ? 'नोंदवले' : 'Voice Saved') : (isMr ? 'आवाज' : 'Voice')}</span>
                  </button>
                </div>

                {/* Attachment Chip Preview */}
                {attachment && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-border/40 text-xs">
                    <span className="flex items-center gap-1.5 text-foreground truncate max-w-xs font-semibold">
                      <Paperclip className="h-3.5 w-3.5 text-primary" />
                      {attachment.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewAttachment(attachment)}
                      className="text-primary text-[10px] font-bold hover:underline"
                    >
                      {isMr ? 'पहा' : 'Preview'}
                    </button>
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-semibold"
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  className="h-10 px-5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground flex items-center gap-1.5 shadow-md shadow-primary/20"
                >
                  <Check className="h-4 w-4" />
                  <span>
                    {editingTxId 
                      ? (isMr ? 'सुधारा (Update)' : 'Update Transaction') 
                      : (isMr ? 'नोंदवा (Save)' : 'Log Transaction')}
                  </span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
