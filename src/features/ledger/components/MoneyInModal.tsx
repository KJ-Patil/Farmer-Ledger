import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { 
  Plus, X, Check, Sprout, Milk, Landmark, 
  Briefcase, Camera, Upload, FileText, Paperclip, 
  Calculator, ArrowRight, ShieldCheck, DollarSign
} from 'lucide-react'
import type { 
  IncomeCategory, 
  PaymentMode, 
  BillAttachment, 
  CropSaleDetails, 
  DairyIncomeDetails, 
  LoanDetails, 
  OtherIncomeDetails 
} from '@/shared/types/ledger'
import { usePlotStore } from '@/shared/hooks/usePlotStore'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import { useLedgerStore } from '@/shared/hooks/useLedgerStore'

interface MoneyInModalProps {
  isOpen: boolean
  onClose: () => void
  preselectedPlotId?: string
  preselectedCropId?: string
  preselectedCropType?: string
}

export function MoneyInModal({ 
  isOpen, 
  onClose, 
  preselectedPlotId, 
  preselectedCropId,
  preselectedCropType 
}: MoneyInModalProps) {
  const { i18n } = useTranslation()
  const isMr = i18n.language === 'mr'
  const { user } = useAuthStore()
  const { plots, crops, fetchPlots, fetchCrops } = usePlotStore()
  const { postIncomeTransaction, customLedgers } = useLedgerStore()

  const [activeCategory, setActiveCategory] = useState<IncomeCategory>('crop_sale')

  // Common Fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank')
  const [notes, setNotes] = useState('')
  const [billNumber, setBillNumber] = useState('')
  const [attachment, setAttachment] = useState<BillAttachment | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 1. Crop Sale Specific
  const [plotId, setPlotId] = useState(preselectedPlotId || '')
  const [cropId, setCropId] = useState(preselectedCropId || '')
  const [cropName, setCropName] = useState(preselectedCropType || 'Soybean')
  const [buyerName, setBuyerName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('पोती (Bags)')
  const [rate, setRate] = useState('')
  const [hamali, setHamali] = useState('')
  const [transport, setTransport] = useState('')
  const [otherDeductions, setOtherDeductions] = useState('')

  // 2. Dairy Specific
  const [dairyProduct, setDairyProduct] = useState<DairyIncomeDetails['product']>('milk')
  const [customProduct, setCustomProduct] = useState('')
  const [dairyQuantity, setDairyQuantity] = useState('')
  const [dairyUnit, setDairyUnit] = useState('लिटर (Liters)')
  const [dairyRate, setDairyRate] = useState('')
  const [dairyCustomer, setDairyCustomer] = useState('')

  // 3. Loan Specific
  const [loanProvider, setLoanProvider] = useState('')
  const [loanInstitution, setLoanInstitution] = useState('')
  const [loanType, setLoanType] = useState('पीक कर्ज (Crop Loan)')
  const [sanctionAmount, setSanctionAmount] = useState('')
  const [processingFee, setProcessingFee] = useState('')
  const [interestRate, setInterestRate] = useState('8.50')
  const [loanPeriodYears, setLoanPeriodYears] = useState('3')
  const [emiFrequency, setEmiFrequency] = useState<'monthly' | 'yearly' | 'half_yearly'>('monthly')
  const [firstInstallmentDate, setFirstInstallmentDate] = useState('')
  const [dueDate, setDueDate] = useState('')

  // 4. Other / Custom Income
  const [otherSubtype, setOtherSubtype] = useState<OtherIncomeDetails['incomeSubtype']>('subsidy')
  const [customIncomeName, setCustomIncomeName] = useState('')
  const [otherAmount, setOtherAmount] = useState('')
  const [otherSourceParty, setOtherSourceParty] = useState('')

  // File upload input refs
  const fileCameraRef = useRef<HTMLInputElement>(null)
  const fileGalleryRef = useRef<HTMLInputElement>(null)
  const filePdfRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      if (plots.length === 0) fetchPlots(user.mobileNumber)
      if (plotId) fetchCrops(user.mobileNumber, plotId)
    }
  }, [user, plotId])

  useEffect(() => {
    if (preselectedPlotId) setPlotId(preselectedPlotId)
    if (preselectedCropId) setCropId(preselectedCropId)
    if (preselectedCropType) setCropName(preselectedCropType)
  }, [preselectedPlotId, preselectedCropId, preselectedCropType])

  // Auto calculate Crop Sale Gross and Net
  const grossCropAmount = (Number(quantity) || 0) * (Number(rate) || 0)
  const totalCropDeductions = (Number(hamali) || 0) + (Number(transport) || 0) + (Number(otherDeductions) || 0)
  const netCropAmount = Math.max(0, grossCropAmount - totalCropDeductions)

  // Auto calculate Dairy Total
  const totalDairyAmount = (Number(dairyQuantity) || 0) * (Number(dairyRate) || 0)

  // Auto calculate Loan Net Received
  const numSanction = Number(sanctionAmount) || 0
  const numFee = Number(processingFee) || 0
  const netLoanReceived = Math.max(0, numSanction - numFee)

  if (!isOpen) return null

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isPdf = false) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!user) return

    let finalAmount = 0
    let payload: any = {}

    if (activeCategory === 'crop_sale') {
      if (grossCropAmount <= 0) {
        setError(isMr ? 'कृपया वैध प्रमाण आणि दर प्रविष्ट करा.' : 'Please enter valid quantity and rate.')
        return
      }
      finalAmount = netCropAmount
      const activePlot = plots.find(p => p.id === plotId)
      const cropList = plotId ? crops[plotId] || [] : []
      const activeCrop = cropList.find(c => c.id === cropId)

      const details: CropSaleDetails = {
        plotId: plotId || undefined,
        plotName: activePlot ? `${activePlot.name} (Gat #${activePlot.gatNumber})` : undefined,
        cropId: cropId || undefined,
        cropName: activeCrop ? activeCrop.cropType : cropName,
        buyerName: buyerName.trim() || (isMr ? 'व्यापारी' : 'Buyer'),
        quantity: Number(quantity),
        unit,
        rate: Number(rate),
        grossAmount: grossCropAmount,
        hamali: Number(hamali) || 0,
        transport: Number(transport) || 0,
        otherDeductions: Number(otherDeductions) || 0,
        netAmount: netCropAmount
      }

      payload = {
        ledgerType: 'agriculture',
        category: 'crop_sale',
        incomeCategory: 'crop_sale',
        cropSaleDetails: details,
        grossAmount: grossCropAmount,
        totalDeductions: totalCropDeductions,
        amount: netCropAmount,
        date,
        paymentMode,
        partyName: buyerName.trim() || undefined,
        plotId: plotId || undefined,
        plotName: activePlot?.name,
        cropId: cropId || undefined,
        cropName: activeCrop?.cropType || cropName,
        billNumber: billNumber.trim() || undefined,
        attachment: attachment || undefined,
        notes: notes.trim() || `${details.cropName} विक्री: ${details.quantity} ${unit} @ ₹${details.rate}`
      }
    } else if (activeCategory === 'dairy') {
      if (totalDairyAmount <= 0) {
        setError(isMr ? 'कृपया दुधाचे प्रमाण आणि दर प्रविष्ट करा.' : 'Please enter valid dairy quantity and rate.')
        return
      }
      finalAmount = totalDairyAmount
      const details: DairyIncomeDetails = {
        product: dairyProduct,
        customProductName: dairyProduct === 'other' ? customProduct : undefined,
        quantity: Number(dairyQuantity),
        unit: dairyUnit,
        rate: Number(dairyRate),
        totalAmount: totalDairyAmount,
        customerName: dairyCustomer.trim() || (isMr ? 'दूध ग्राहक' : 'Customer')
      }

      payload = {
        ledgerType: 'custom',
        category: 'दूध विक्री (Dairy Income)',
        incomeCategory: 'dairy',
        dairyDetails: details,
        amount: totalDairyAmount,
        date,
        paymentMode,
        partyName: details.customerName,
        billNumber: billNumber.trim() || undefined,
        attachment: attachment || undefined,
        notes: notes.trim() || `${dairyProduct} विक्री: ${dairyQuantity} ${dairyUnit} @ ₹${dairyRate}`
      }
    } else if (activeCategory === 'loan') {
      if (numSanction <= 0) {
        setError(isMr ? 'कृपया मंजूर कर्ज रक्कम प्रविष्ट करा.' : 'Please enter sanctioned loan amount.')
        return
      }
      if (!loanProvider.trim()) {
        setError(isMr ? 'कृपया बँक किंवा कर्ज देणाऱ्याचे नाव प्रविष्ट करा.' : 'Please enter loan provider or bank.')
        return
      }
      finalAmount = netLoanReceived

      const details: LoanDetails = {
        loanProvider: loanProvider.trim(),
        institution: loanInstitution.trim() || loanProvider.trim(),
        loanType,
        sanctionAmount: numSanction,
        processingFee: numFee,
        netReceived: netLoanReceived,
        interestRate: interestRate ? Number(interestRate) : undefined,
        loanPeriodYears: loanPeriodYears ? Number(loanPeriodYears) : undefined,
        emiFrequency,
        firstInstallmentDate: firstInstallmentDate || date,
        dueDate: dueDate || date,
        remainingAmount: numSanction
      }

      payload = {
        ledgerType: 'party',
        category: `${loanProvider} - कर्ज प्राप्त (Loan)`,
        incomeCategory: 'loan',
        loanDetails: details,
        amount: netLoanReceived,
        date,
        paymentMode: paymentMode || 'bank',
        partyName: loanProvider.trim(),
        billNumber: billNumber.trim() || undefined,
        attachment: attachment || undefined,
        notes: notes.trim() || `${loanType} प्राप्त (मंजूर: ₹${numSanction.toLocaleString()}, फी: ₹${numFee.toLocaleString()})`
      }
    } else {
      // Other / Custom
      const numOther = Number(otherAmount)
      if (numOther <= 0) {
        setError(isMr ? 'कृपया वैध रक्कम प्रविष्ट करा.' : 'Please enter a valid amount.')
        return
      }
      finalAmount = numOther

      const details: OtherIncomeDetails = {
        incomeSubtype: otherSubtype,
        customCategoryName: otherSubtype === 'other' ? customIncomeName : undefined,
        sourceParty: otherSourceParty.trim() || undefined,
        description: notes.trim() || undefined
      }

      const displayCat = otherSubtype === 'other' && customIncomeName 
        ? customIncomeName 
        : otherSubtype.replace('_', ' ').toUpperCase()

      payload = {
        ledgerType: 'personal',
        category: displayCat,
        incomeCategory: 'other',
        otherIncomeDetails: details,
        amount: numOther,
        date,
        paymentMode,
        partyName: otherSourceParty.trim() || undefined,
        billNumber: billNumber.trim() || undefined,
        attachment: attachment || undefined,
        notes: notes.trim() || `${displayCat} उत्पन्न`
      }
    }

    const successId = await postIncomeTransaction(user.mobileNumber, payload)
    if (successId) {
      onClose()
    } else {
      setError(isMr ? 'उत्पन्न नोंदवताना त्रुटी आली.' : 'Failed to post income.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto select-none animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent/40"
        >
          <X className="h-[18px] w-[18px]" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              {isMr ? 'उत्पन्न नोंदवा (Money In Entry)' : 'Record Income (Money In)'}
            </h3>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {isMr ? 'Module 6A: स्वयंचलित लेजर पोस्टिंग' : 'Module 6A: Double-Entry Posting Engine'}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          {isMr 
            ? 'शेतीमाल विक्री, दूध व्यवसाय, बँक कर्ज किंवा इतर उत्पन्नाची नोंद करा. सिस्टीम सर्व लेजरमध्ये स्वयंचलित नोंदी करेल.' 
            : 'Record crop sales, dairy, loan disbursements, or other farm income with double-entry auto posting.'}
        </p>

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-2.5 mb-3 text-center font-semibold">
            ⚠️ {error}
          </div>
        )}

        {/* Category Toggles */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-muted/40 rounded-2xl border border-border/40 mb-4">
          <button
            type="button"
            onClick={() => setActiveCategory('crop_sale')}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              activeCategory === 'crop_sale'
                ? 'bg-card text-emerald-600 shadow-sm ring-1 ring-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sprout className="h-4 w-4" />
            <span className="truncate">{isMr ? 'शेतीमाल विक्री' : 'Crop Sale'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('dairy')}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              activeCategory === 'dairy'
                ? 'bg-card text-emerald-600 shadow-sm ring-1 ring-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Milk className="h-4 w-4" />
            <span className="truncate">{isMr ? 'दूध व्यवसाय' : 'Dairy Income'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('loan')}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              activeCategory === 'loan'
                ? 'bg-card text-emerald-600 shadow-sm ring-1 ring-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Landmark className="h-4 w-4" />
            <span className="truncate">{isMr ? 'कर्ज / लोन' : 'Loan Received'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('other')}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              activeCategory === 'other'
                ? 'bg-card text-emerald-600 shadow-sm ring-1 ring-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span className="truncate">{isMr ? 'इतर उत्पन्न' : 'Other Income'}</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* 1. Crop Sale Category Fields */}
          {activeCategory === 'crop_sale' && (
            <div className="flex flex-col gap-3 bg-muted/15 p-3.5 rounded-2xl border border-border/40">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {isMr ? 'शेत गट (Plot)' : 'Link Plot'}
                  </label>
                  <select
                    value={plotId}
                    onChange={(e) => {
                      setPlotId(e.target.value)
                      setCropId('')
                    }}
                    className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="">{isMr ? '-- शेत गट निवडा --' : '-- Select Plot --'}</option>
                    {plots.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Gat #{p.gatNumber})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {isMr ? 'पीक (Crop)' : 'Crop Name'} <span className="text-destructive">*</span>
                  </label>
                  {plotId && crops[plotId] && crops[plotId].length > 0 ? (
                    <select
                      value={cropId}
                      onChange={(e) => {
                        setCropId(e.target.value)
                        const c = crops[plotId].find(item => item.id === e.target.value)
                        if (c) setCropName(c.cropType)
                      }}
                      className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option value="">{isMr ? '-- पीक निवडा --' : '-- Select Crop --'}</option>
                      {crops[plotId].map(c => {
                        const isCompleted = c.status === 'completed' || c.status === 'harvested' || c.isLocked
                        return (
                          <option key={c.id} value={c.id} disabled={isCompleted}>
                            {c.cropType} ({c.variety}) {isCompleted ? (isMr ? '🔒 (पूर्ण/Locked)' : '🔒 (Completed)') : ''}
                          </option>
                        )
                      })}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder={isMr ? 'उदा. सोयाबीन, कांदा, ऊस' : 'e.g. Soybean, Onion, Wheat'}
                      value={cropName}
                      onChange={(e) => setCropName(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Buyer & Quantity Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {isMr ? 'खरेदीदार / व्यापारी (Buyer)' : 'Buyer / APMC Merchant'}
                  </label>
                  <input
                    type="text"
                    placeholder={isMr ? 'उदा. राहुल ट्रेडर्स' : 'e.g. APMC Merchant'}
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {isMr ? 'वजन / प्रमाण' : 'Quantity'} <span className="text-destructive">*</span>
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="any"
                      placeholder="उदा. 10"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                    />
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="h-9 px-1.5 rounded-xl border border-border bg-background text-foreground text-[11px] font-semibold focus:ring-1 focus:ring-primary outline-none shrink-0"
                    >
                      <option value="पोती (Bags)">पोती</option>
                      <option value="क्विंटल (Quintal)">क्विंटल</option>
                      <option value="किलो (Kg)">किलो</option>
                      <option value="टन (Ton)">टन</option>
                      <option value="क्रेट्स (Crates)">क्रेट्स</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {isMr ? 'दर प्रति युनिट (₹)' : 'Rate / Unit (₹)'} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="₹ e.g. 4000"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              {/* Deductions (Hamali, Transport, Other) */}
              <div className="bg-destructive/5 border border-destructive/15 p-3 rounded-xl flex flex-col gap-2">
                <span className="text-[11px] font-bold text-destructive uppercase tracking-wider">
                  {isMr ? 'कपात खर्च (Deductions - Auto-posted to Expense Ledger):' : 'Deductions (Auto-posted as expenses):'}
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground font-semibold">{isMr ? 'हमाली (₹)' : 'Hamali (₹)'}</span>
                    <input
                      type="number"
                      placeholder="₹ 0"
                      value={hamali}
                      onChange={(e) => setHamali(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground font-semibold">{isMr ? 'वाहतूक (₹)' : 'Transport (₹)'}</span>
                    <input
                      type="number"
                      placeholder="₹ 0"
                      value={transport}
                      onChange={(e) => setTransport(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground font-semibold">{isMr ? 'इतर कपात (₹)' : 'Other (₹)'}</span>
                    <input
                      type="number"
                      placeholder="₹ 0"
                      value={otherDeductions}
                      onChange={(e) => setOtherDeductions(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Auto Summary Calculation Bar */}
              <div className="bg-emerald-500/10 border border-emerald-500/25 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold block">{isMr ? 'एकूण उत्पन्न (Gross)' : 'Gross Sale'}</span>
                  <span className="font-bold text-foreground">₹{grossCropAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-destructive font-semibold block">{isMr ? 'एकूण कपात (Deductions)' : 'Total Deductions'}</span>
                  <span className="font-bold text-destructive">-₹{totalCropDeductions.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold block">{isMr ? 'प्रत्यक्ष जमा (Net Received)' : 'Net Amount Received'}</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm">₹{netCropAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Dairy Category Fields */}
          {activeCategory === 'dairy' && (
            <div className="flex flex-col gap-3 bg-muted/15 p-3.5 rounded-2xl border border-border/40">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {isMr ? 'दूध उत्पादन (Product)' : 'Dairy Product'} <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={dairyProduct}
                    onChange={(e) => setDairyProduct(e.target.value as any)}
                    className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="milk">{isMr ? 'दूध (Milk)' : 'Milk'}</option>
                    <option value="ghee">{isMr ? 'तूप (Ghee)' : 'Ghee'}</option>
                    <option value="paneer">{isMr ? 'पनीर (Paneer)' : 'Paneer'}</option>
                    <option value="curd">{isMr ? 'दही (Curd)' : 'Curd'}</option>
                    <option value="buttermilk">{isMr ? 'ताक (Buttermilk)' : 'Buttermilk'}</option>
                    <option value="khava">{isMr ? 'खवा (Khava)' : 'Khava'}</option>
                    <option value="animal_sale">{isMr ? 'जनावर विक्री (Animal Sale)' : 'Animal Sale'}</option>
                    <option value="dung">{isMr ? 'शेणखत विक्री (Cow Dung Manure)' : 'Cow Dung Manure'}</option>
                    <option value="other">{isMr ? 'इतर उत्पादन (Other)' : 'Other'}</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {isMr ? 'ग्राहक / डेअरी नाव' : 'Customer / Dairy Center'}
                  </label>
                  <input
                    type="text"
                    placeholder={isMr ? 'उदा. संगमनेर दूध डेअरी' : 'e.g. Sangamner Dairy'}
                    value={dairyCustomer}
                    onChange={(e) => setDairyCustomer(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              {dairyProduct === 'other' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">{isMr ? 'उत्पादनाचे नाव' : 'Product Name'}</label>
                  <input
                    type="text"
                    placeholder={isMr ? 'उदा. मलाई, लस्सी' : 'e.g. Cream, Lassi'}
                    value={customProduct}
                    onChange={(e) => setCustomProduct(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {isMr ? 'प्रमाण (Quantity)' : 'Quantity'} <span className="text-destructive">*</span>
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="any"
                      placeholder="100"
                      value={dairyQuantity}
                      onChange={(e) => setDairyQuantity(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                    />
                    <select
                      value={dairyUnit}
                      onChange={(e) => setDairyUnit(e.target.value)}
                      className="h-9 px-1.5 rounded-xl border border-border bg-background text-foreground text-[11px] font-semibold focus:ring-1 focus:ring-primary outline-none shrink-0"
                    >
                      <option value="लिटर (Liters)">लिटर</option>
                      <option value="किलो (Kg)">किलो</option>
                      <option value="नग (Units)">नग</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {isMr ? 'दर प्रति युनिट (₹)' : 'Rate / Unit (₹)'} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="₹ 50"
                    value={dairyRate}
                    onChange={(e) => setDairyRate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/25 p-3 rounded-xl flex justify-between items-center text-xs">
                <span className="font-semibold text-foreground">{isMr ? 'एकूण दूध उत्पन्न (Total):' : 'Total Dairy Income:'}</span>
                <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm">₹{totalDairyAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* 3. Loan Category Fields */}
          {activeCategory === 'loan' && (
            <div className="flex flex-col gap-3 bg-muted/15 p-3.5 rounded-2xl border border-border/40">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {isMr ? 'बँक / कर्ज देणाऱ्याचे नाव' : 'Bank / Loan Provider'} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isMr ? 'उदा. SBI, बँक ऑफ महाराष्ट्र, निफाड पतसंस्था' : 'e.g. SBI, Bank of Maharashtra'}
                    value={loanProvider}
                    onChange={(e) => setLoanProvider(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {isMr ? 'कर्ज प्रकार' : 'Loan Type'}
                  </label>
                  <select
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="पीक कर्ज (Crop Loan)">पीक कर्ज (Crop Loan)</option>
                    <option value="मुदत कर्ज (Term Loan)">मुदत कर्ज (Term Loan)</option>
                    <option value="ट्रॅक्टर / वाहन कर्ज (Tractor / Vehicle Loan)">ट्रॅक्टर / वाहन कर्ज</option>
                    <option value="सोने कर्ज (Gold Loan)">सोने कर्ज (Gold Loan)</option>
                    <option value="वैयक्तिक कर्ज (Personal Loan)">वैयक्तिक कर्ज (Personal)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {isMr ? 'मंजूर कर्ज रक्कम (Sanction ₹)' : 'Sanctioned Amount (₹)'} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1000"
                    placeholder="₹ 50000"
                    value={sanctionAmount}
                    onChange={(e) => setSanctionAmount(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {isMr ? 'प्रोसेसिंग फी कपात (Fee ₹)' : 'Processing Fee (₹)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="₹ 2000"
                    value={processingFee}
                    onChange={(e) => setProcessingFee(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              {/* Loan terms & EMI settings */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-foreground">{isMr ? 'व्याजदर (% p.a.)' : 'Interest Rate (%)'}</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="8.50"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-foreground">{isMr ? 'कालावधी (वर्षे)' : 'Tenure (Years)'}</label>
                  <input
                    type="number"
                    placeholder="3"
                    value={loanPeriodYears}
                    onChange={(e) => setLoanPeriodYears(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-foreground">{isMr ? 'हप्ता वारंवारता' : 'EMI Frequency'}</label>
                  <select
                    value={emiFrequency}
                    onChange={(e) => setEmiFrequency(e.target.value as any)}
                    className="w-full h-8 px-1 rounded-lg border border-border bg-background text-foreground text-[10px] font-semibold focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="monthly">{isMr ? 'मासिक (Monthly)' : 'Monthly'}</option>
                    <option value="yearly">{isMr ? 'वार्षिक (Yearly)' : 'Yearly'}</option>
                    <option value="half_yearly">{isMr ? 'सहामाही (6 Months)' : '6 Months'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-foreground">{isMr ? 'पहिला हप्ता तारीख (First EMI)' : 'First EMI Date'}</label>
                  <input
                    type="date"
                    value={firstInstallmentDate}
                    onChange={(e) => setFirstInstallmentDate(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-foreground">{isMr ? 'कर्ज परतफेड मुदत तारीख' : 'Due Date'}</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">{isMr ? 'मंजूर कर्ज दायित्व' : 'Sanction Liability'}</span>
                  <span className="font-bold text-foreground">₹{numSanction.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-primary font-bold block">{isMr ? 'प्रत्यक्ष बँक खात्यात जमा (Net Received)' : 'Net Deposited to Bank'}</span>
                  <span className="font-black text-primary text-sm">₹{netLoanReceived.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Other / Custom Income Category Fields */}
          {activeCategory === 'other' && (
            <div className="flex flex-col gap-3 bg-muted/15 p-3.5 rounded-2xl border border-border/40">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {isMr ? 'उत्पन्न प्रवर्ग' : 'Income Subtype'}
                  </label>
                  <select
                    value={otherSubtype}
                    onChange={(e) => setOtherSubtype(e.target.value as any)}
                    className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="subsidy">{isMr ? 'सरकारी अनुदान (Govt Subsidy)' : 'Govt Subsidy'}</option>
                    <option value="insurance_claim">{isMr ? 'पीक विमा दावा (Crop Insurance)' : 'Crop Insurance'}</option>
                    <option value="tractor_rent">{isMr ? 'ट्रॅक्टर भाडे (Tractor Rental)' : 'Tractor Rent'}</option>
                    <option value="implements_rent">{isMr ? 'शेती अवजारे भाड्याने (Implements Rent)' : 'Implements Rent'}</option>
                    <option value="water_sale">{isMr ? 'पाणी विक्री (Water Sale)' : 'Water Sale'}</option>
                    <option value="saplings_sale">{isMr ? 'रोप / नर्सरी विक्री (Saplings Sale)' : 'Saplings Sale'}</option>
                    <option value="seeds_sale">{isMr ? 'बियाणे विक्री (Seeds Sale)' : 'Seeds Sale'}</option>
                    <option value="organic_manure_sale">{isMr ? 'सेंद्रिय खत विक्री (Manure Sale)' : 'Manure Sale'}</option>
                    <option value="wage">{isMr ? 'मजुरी / काम (Wages)' : 'Wages'}</option>
                    <option value="interest">{isMr ? 'व्याज उत्पन्न (Interest)' : 'Interest'}</option>
                    <option value="commission">{isMr ? 'कमिशन (Commission)' : 'Commission'}</option>
                    <option value="other">{isMr ? 'इतर सानुकूल उत्पन्न (Custom)' : 'Custom'}</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    {isMr ? 'मिळालेली रक्कम (₹)' : 'Amount Received (₹)'} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="₹ 10000"
                    value={otherAmount}
                    onChange={(e) => setOtherAmount(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              {otherSubtype === 'other' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-foreground">{isMr ? 'सानुकूल खात्याचे नाव' : 'Custom Category Name'}</label>
                  <input
                    type="text"
                    required
                    placeholder={isMr ? 'उदा. पोल्ट्री विक्री, गांडूळ खत' : 'e.g. Poultry, Vermicompost'}
                    value={customIncomeName}
                    onChange={(e) => setCustomIncomeName(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-foreground">
                  {isMr ? 'स्रोत / व्यक्ती नाव (Source / Party)' : 'Source / Party Name'}
                </label>
                <input
                  type="text"
                  placeholder={isMr ? 'उदा. कृषी विभाग, ग्राहक' : 'e.g. Agri Dept, Customer'}
                  value={otherSourceParty}
                  onChange={(e) => setOtherSourceParty(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>
          )}

          {/* Common Footer Grid: Date, Payment Mode & Bill Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-foreground">
                {isMr ? 'जमा तारीख' : 'Date'} <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-foreground">
                {isMr ? 'पेमेंट प्रकार' : 'Payment Mode'}
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full h-9 px-2 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary outline-none uppercase"
              >
                <option value="bank">BANK (बँक / RTGS)</option>
                <option value="upi">UPI (गुगल पे / फोनपे)</option>
                <option value="cash">CASH (रोख)</option>
                <option value="cheque">CHEQUE (धनादेश)</option>
                <option value="credit">CREDIT (उधारी बाकी)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-foreground">
                {isMr ? 'पावती / बिल क्रमांक' : 'Receipt / Bill #'}
              </label>
              <input
                type="text"
                placeholder="INV-102"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-foreground">
              {isMr ? 'तपशील / टीप (Notes)' : 'Notes / Remarks'}
            </label>
            <input
              type="text"
              placeholder={isMr ? 'व्यवहाराची अतिरिक्त नोंद' : 'Additional remarks'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Hidden File inputs */}
          <input 
            type="file" 
            ref={fileCameraRef} 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            onChange={(e) => handleFileUpload(e, false)} 
          />
          <input 
            type="file" 
            ref={fileGalleryRef} 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => handleFileUpload(e, false)} 
          />
          <input 
            type="file" 
            ref={filePdfRef} 
            accept="application/pdf" 
            className="hidden" 
            onChange={(e) => handleFileUpload(e, true)} 
          />

          {/* Attachments Section */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-muted/20">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-muted-foreground">{isMr ? 'पावती जोडा:' : 'Attach Bill:'}</span>
              <button
                type="button"
                onClick={() => fileCameraRef.current?.click()}
                className="h-8 px-2 rounded-lg border border-border bg-background text-[10px] font-semibold flex items-center gap-1 hover:bg-muted"
              >
                <Camera className="h-3 w-3 text-primary" />
                <span>{isMr ? 'फोटो' : 'Photo'}</span>
              </button>
              <button
                type="button"
                onClick={() => fileGalleryRef.current?.click()}
                className="h-8 px-2 rounded-lg border border-border bg-background text-[10px] font-semibold flex items-center gap-1 hover:bg-muted"
              >
                <Upload className="h-3 w-3 text-indigo-500" />
                <span>{isMr ? 'गॅलरी' : 'Gallery'}</span>
              </button>
              <button
                type="button"
                onClick={() => filePdfRef.current?.click()}
                className="h-8 px-2 rounded-lg border border-border bg-background text-[10px] font-semibold flex items-center gap-1 hover:bg-muted"
              >
                <FileText className="h-3 w-3 text-emerald-500" />
                <span>PDF</span>
              </button>
            </div>

            {attachment && (
              <div className="flex items-center gap-1 text-[10px] text-primary font-bold">
                <Paperclip className="h-3 w-3" />
                <span className="truncate max-w-[100px]">{attachment.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="text-destructive ml-1 hover:underline"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 px-4 rounded-xl text-xs font-semibold"
            >
              {isMr ? 'रद्द करा' : 'Cancel'}
            </Button>

            <Button
              type="submit"
              className="h-10 px-5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <Check className="h-4 w-4" />
              <span>{isMr ? 'उत्पन्न नोंदवा (Save Income)' : 'Save Income'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
