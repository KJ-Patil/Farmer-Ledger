import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Camera, Upload, FileText, Sparkles, Check, X, Loader2, Eye } from 'lucide-react'
import { scanBillImage, parseBillData, SAMPLE_BILLS, type SampleBill } from '@/shared/services/ocrService'
import type { OCRScanResult, BillAttachment } from '@/shared/types/ledger'

interface OCRScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onApplyResult: (result: OCRScanResult, attachment?: BillAttachment) => void
}

export function OCRScannerModal({ isOpen, onClose, onApplyResult }: OCRScannerModalProps) {
  const { i18n } = useTranslation()
  const isMr = i18n.language === 'mr'

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [currentAttachment, setCurrentAttachment] = useState<BillAttachment | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanStatus, setScanStatus] = useState('')
  const [extractedData, setExtractedData] = useState<OCRScanResult | null>(null)
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null)

  if (!isOpen) return null

  // Handle image file selection from Gallery or Camera
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isPdf = false) => {
    const file = e.target.files?.[0]
    if (!file) return

    setActiveSampleId(null)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      setPreviewImage(isPdf ? null : dataUrl)

      const attachment: BillAttachment = {
        name: file.name,
        type: isPdf ? 'pdf' : 'image',
        dataUrl,
        size: file.size
      }
      setCurrentAttachment(attachment)

      // Start scanning
      await runOCR(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const runOCR = async (imageSource: string) => {
    setScanning(true)
    setScanProgress(10)
    setScanStatus(isMr ? 'बिल तपासत आहे...' : 'Processing bill...')

    try {
      const result = await scanBillImage(imageSource, (progress, status) => {
        setScanProgress(progress)
        setScanStatus(status)
      })
      setExtractedData(result)
    } catch (err) {
      console.error(err)
      setScanStatus(isMr ? 'स्कॅनिंगमध्ये अडचण आली' : 'Failed to scan image')
    } finally {
      setScanning(false)
    }
  }

  // Handle Instant Sample Bill Click
  const handleSelectSample = (sample: SampleBill) => {
    setActiveSampleId(sample.id)
    setPreviewImage(sample.mockImageUrl)
    const attachment: BillAttachment = {
      name: `${sample.title}.jpg`,
      type: 'image',
      dataUrl: sample.mockImageUrl
    }
    setCurrentAttachment(attachment)

    setScanning(true)
    setScanProgress(20)
    setScanStatus(isMr ? 'नमुना पावती वाचत आहे...' : 'Scanning sample receipt...')

    setTimeout(() => {
      setScanProgress(70)
      setScanStatus(isMr ? 'तपशील वेगळे करत आहे...' : 'Extracting line items...')
      setTimeout(() => {
        const parsed = parseBillData(sample.sampleText)
        setExtractedData(parsed)
        setScanProgress(100)
        setScanStatus(isMr ? 'स्कॅन पूर्ण झाले!' : 'Scan Complete!')
        setScanning(false)
      }, 500)
    }, 400)
  }

  const handleApply = () => {
    if (extractedData) {
      onApplyResult(extractedData, currentAttachment || undefined)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto select-none animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent/40 transition-colors"
        >
          <X className="h-[18px] w-[18px]" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              {isMr ? 'AI बिल स्कॅनर (OCR Scanner)' : 'AI Bill OCR Scanner'}
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
              {isMr ? 'प्रीमियम फिचर' : 'Premium Feature'}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          {isMr 
            ? 'बिलाचा फोटो काढा किंवा अपलोड करा. AI दुकानाचे नाव, बिल क्र., वस्तू, रक्कम व GST वाचून आपोआप भरून देईल.'
            : 'Capture or upload receipts. AI extracts merchant, bill number, items, total, and GST automatically.'}
        </p>

        {/* Hidden File Inputs */}
        <input 
          type="file" 
          ref={cameraInputRef} 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          onChange={(e) => handleFileChange(e, false)} 
        />
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          className="hidden" 
          onChange={(e) => handleFileChange(e, false)} 
        />
        <input 
          type="file" 
          ref={pdfInputRef} 
          accept="application/pdf" 
          className="hidden" 
          onChange={(e) => handleFileChange(e, true)} 
        />

        {/* Upload & Action Buttons */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => cameraInputRef.current?.click()}
            className="h-16 flex flex-col items-center justify-center gap-1 rounded-2xl border-dashed border-border/80 hover:border-primary hover:bg-primary/5 transition-all text-foreground"
          >
            <Camera className="h-5 w-5 text-primary" />
            <span className="text-[11px] font-bold">{isMr ? 'फोटो काढा' : 'Take Photo'}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="h-16 flex flex-col items-center justify-center gap-1 rounded-2xl border-dashed border-border/80 hover:border-primary hover:bg-primary/5 transition-all text-foreground"
          >
            <Upload className="h-5 w-5 text-indigo-500" />
            <span className="text-[11px] font-bold">{isMr ? 'गॅलरी' : 'Gallery'}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => pdfInputRef.current?.click()}
            className="h-16 flex flex-col items-center justify-center gap-1 rounded-2xl border-dashed border-border/80 hover:border-primary hover:bg-primary/5 transition-all text-foreground"
          >
            <FileText className="h-5 w-5 text-emerald-500" />
            <span className="text-[11px] font-bold">{isMr ? 'PDF बिल' : 'PDF Bill'}</span>
          </Button>
        </div>

        {/* Quick Test Preset Bills */}
        <div className="mb-4">
          <span className="text-[11px] font-bold text-muted-foreground block mb-2">
            {isMr ? 'किंवा चाचणीसाठी नमुना बिल निवडा (Instant Demo):' : 'Or test with a sample bill preset:'}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SAMPLE_BILLS.map(sample => (
              <button
                key={sample.id}
                type="button"
                onClick={() => handleSelectSample(sample)}
                className={`text-left p-2.5 rounded-xl border transition-all text-xs ${
                  activeSampleId === sample.id
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                    : 'border-border/60 bg-muted/20 hover:bg-muted/40 text-foreground'
                }`}
              >
                <div className="truncate font-semibold">{sample.title}</div>
                <div className="text-[10px] text-muted-foreground truncate">{sample.subtitle}</div>
                <div className="text-[10px] font-bold text-emerald-600 mt-1">₹{sample.amount.toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>

        {/* OCR Scanning Progress / Animation */}
        {scanning && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-4 flex flex-col gap-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-bold text-primary">
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-4 w-4 animate-spin" />
                {scanStatus}
              </span>
              <span>{scanProgress}%</span>
            </div>
            <div className="w-full bg-primary/10 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Extracted Data Review Card */}
        {extractedData && !scanning && (
          <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-2xl p-4 mb-4 flex flex-col gap-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-600" />
                {isMr ? 'AI ने वाचलेला तपशील (Verified Data)' : 'AI Extracted Details'}
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                {Math.round((extractedData.confidence || 0.9) * 100)}% Confidence
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {isMr ? 'दुकानाचे नाव' : 'Shop Name'}
                </span>
                <input
                  type="text"
                  value={extractedData.shopName}
                  onChange={(e) => setExtractedData({ ...extractedData, shopName: e.target.value })}
                  className="font-bold text-foreground bg-background border border-border/60 rounded-lg px-2 py-1 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {isMr ? 'बिल क्रमांक' : 'Bill Number'}
                </span>
                <input
                  type="text"
                  value={extractedData.billNumber}
                  onChange={(e) => setExtractedData({ ...extractedData, billNumber: e.target.value })}
                  className="font-bold text-foreground bg-background border border-border/60 rounded-lg px-2 py-1 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {isMr ? 'तारीख' : 'Date'}
                </span>
                <input
                  type="date"
                  value={extractedData.date}
                  onChange={(e) => setExtractedData({ ...extractedData, date: e.target.value })}
                  className="font-bold text-foreground bg-background border border-border/60 rounded-lg px-2 py-1 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {isMr ? 'एकूण रक्कम (₹)' : 'Total Amount (₹)'}
                </span>
                <input
                  type="number"
                  value={extractedData.amount}
                  onChange={(e) => setExtractedData({ ...extractedData, amount: Number(e.target.value) })}
                  className="font-bold text-emerald-600 bg-background border border-border/60 rounded-lg px-2 py-1 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {isMr ? 'GST रक्कम' : 'GST Amount'}
                </span>
                <input
                  type="number"
                  value={extractedData.gstAmount}
                  onChange={(e) => setExtractedData({ ...extractedData, gstAmount: Number(e.target.value) })}
                  className="font-bold text-foreground bg-background border border-border/60 rounded-lg px-2 py-1 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col col-span-2 sm:col-span-1">
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {isMr ? 'वस्तू / तपशील' : 'Items Description'}
                </span>
                <input
                  type="text"
                  value={extractedData.items}
                  onChange={(e) => setExtractedData({ ...extractedData, items: e.target.value })}
                  className="font-semibold text-foreground bg-background border border-border/60 rounded-lg px-2 py-1 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>

            {previewImage && (
              <div className="flex items-center gap-2 mt-1 pt-2 border-t border-emerald-500/20">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium truncate">
                  {currentAttachment?.name || 'Bill Attachment'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
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
            type="button"
            disabled={!extractedData || scanning}
            onClick={handleApply}
            className="h-10 px-5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground flex items-center gap-1.5 shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>{isMr ? 'हिशोबात जोडा (Apply to Ledger)' : 'Apply to Ledger'}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
