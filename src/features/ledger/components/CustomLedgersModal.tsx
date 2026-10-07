import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { FolderPlus, Plus, Trash2, X, Check } from 'lucide-react'
import type { CustomLedger, LedgerType } from '@/shared/types/ledger'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import { useLedgerStore, DEFAULT_CUSTOM_LEDGERS } from '@/shared/hooks/useLedgerStore'

interface CustomLedgersModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CustomLedgersModal({ isOpen, onClose }: CustomLedgersModalProps) {
  const { i18n } = useTranslation()
  const isMr = i18n.language === 'mr'
  const { user } = useAuthStore()
  const { customLedgers, createCustomLedger, deleteCustomLedger } = useLedgerStore()

  const [name, setName] = useState('')
  const [type, setType] = useState<LedgerType>('custom')
  const [partyType, setPartyType] = useState<CustomLedger['partyType']>('labor_gang')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!user) return
    if (!name.trim()) {
      setError(isMr ? 'कृपया खात्याचे नाव प्रविष्ट करा.' : 'Please enter ledger name.')
      return
    }

    const successId = await createCustomLedger(user.mobileNumber, {
      name: name.trim(),
      type,
      partyType,
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined
    })

    if (successId) {
      setName('')
      setPhone('')
      setNotes('')
    } else {
      setError(isMr ? 'खाते तयार करताना त्रुटी आली.' : 'Failed to create custom ledger.')
    }
  }

  const handleQuickAdd = async (preset: typeof DEFAULT_CUSTOM_LEDGERS[0]) => {
    if (!user) return
    if (customLedgers.some(cl => cl.name.toLowerCase() === preset.name.toLowerCase())) {
      setError(isMr ? 'हे खाते आधीपासून अस्तित्वात आहे.' : 'This ledger already exists.')
      return
    }
    await createCustomLedger(user.mobileNumber, {
      name: preset.name,
      type: preset.type,
      partyType: preset.partyType,
      notes: preset.notes
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto select-none animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent/40"
        >
          <X className="h-[18px] w-[18px]" />
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FolderPlus className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            {isMr ? 'सानुकूल खाती व्यवस्थापन (Custom Ledgers)' : 'Custom Ledgers Management'}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {isMr 
            ? 'आपल्या गरजेनुसार नवीन खाते किंवा पार्टी तयार करा (उदा. टोळी, ड्रायव्हर, व्यापारी, डेअरी).' 
            : 'Create custom accounts for labor gangs, tractor owners, dairies, and suppliers.'}
        </p>

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-2.5 mb-3 text-center font-semibold">
            ⚠️ {error}
          </div>
        )}

        {/* Create Form */}
        <form onSubmit={handleCreate} className="bg-muted/20 border border-border/60 rounded-2xl p-4 mb-4 flex flex-col gap-3">
          <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-primary" />
            <span>{isMr ? 'नवीन खाते तयार करा' : 'Create New Ledger'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-foreground">
                {isMr ? 'खात्याचे नाव' : 'Ledger Name'} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={isMr ? 'उदा. खुरपणी टोळी, ड्रायव्हर' : 'e.g. Weeding Gang, Driver'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-foreground">
                {isMr ? 'खात्याचा प्रकार' : 'Account Category'}
              </label>
              <select
                value={partyType}
                onChange={(e) => {
                  const val = e.target.value as any
                  setPartyType(val)
                  setType(val === 'labor_gang' || val === 'other' ? 'custom' : 'party')
                }}
                className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              >
                <option value="labor_gang">{isMr ? 'मजूर टोळी (Labor Gang)' : 'Labor Gang'}</option>
                <option value="farmer">{isMr ? 'शेतकरी / व्यक्ती (Farmer / Person)' : 'Farmer / Person'}</option>
                <option value="merchant">{isMr ? 'कृषी केंद्र / व्यापारी (Shop / Merchant)' : 'Shop / Merchant'}</option>
                <option value="transporter">{isMr ? 'ट्रॅक्टर / वाहन मालक (Transporter)' : 'Transporter / Tractor'}</option>
                <option value="dairy">{isMr ? 'दूध डेअरी (Dairy)' : 'Dairy'}</option>
                <option value="other">{isMr ? 'इतर (Other)' : 'Other'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-foreground">
                {isMr ? 'मोबाईल / फोन (ऐच्छिक)' : 'Phone (Optional)'}
              </label>
              <input
                type="tel"
                placeholder="10-digit number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-foreground">
                {isMr ? 'नोंदी / माहिती (ऐच्छिक)' : 'Remarks (Optional)'}
              </label>
              <input
                type="text"
                placeholder={isMr ? 'उदा. ५ मजूर रोजंदारी' : 'e.g. Daily farm labor'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              className="h-9 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground flex items-center gap-1 shadow-sm"
            >
              <Check className="h-4 w-4" />
              <span>{isMr ? 'खाते सेव्ह करा' : 'Save Ledger'}</span>
            </Button>
          </div>
        </form>

        {/* Quick Suggested Presets */}
        <div className="mb-4">
          <span className="text-[11px] font-bold text-muted-foreground block mb-2">
            {isMr ? 'त्वरित जोडा (Quick Suggestions):' : 'Quick Suggested Presets:'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_CUSTOM_LEDGERS.map((preset) => {
              const alreadyAdded = customLedgers.some(c => c.name.toLowerCase() === preset.name.toLowerCase())
              return (
                <button
                  key={preset.name}
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => handleQuickAdd(preset)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                    alreadyAdded
                      ? 'border-border/40 bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed'
                      : 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10'
                  }`}
                >
                  + {preset.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Existing Custom Ledgers List */}
        <div>
          <span className="text-xs font-bold text-foreground block mb-2">
            {isMr ? 'सध्याची सानुकूल खाती' : 'Active Custom Ledgers'} ({customLedgers.length})
          </span>
          <div className="divide-y divide-border/20 border border-border/40 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
            {customLedgers.length > 0 ? (
              customLedgers.map((ledger) => (
                <div key={ledger.id} className="p-2.5 flex justify-between items-center hover:bg-muted/10 transition-colors text-xs">
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-foreground truncate">{ledger.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {ledger.partyType ? ledger.partyType.replace('_', ' ') : ledger.type} 
                      {ledger.notes ? ` • ${ledger.notes}` : ''}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(isMr ? 'हे सानुकूल खाते कायमचे हटवायचे आहे का?' : 'Are you sure you want to delete this custom ledger?')) {
                        user && deleteCustomLedger(user.mobileNumber, ledger.id)
                      }
                    }}
                    aria-label={isMr ? 'खाते हटवा' : 'Delete ledger'}
                    className="text-muted-foreground hover:text-destructive h-7 w-7 rounded-lg flex items-center justify-center hover:bg-accent/40 transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground">
                {isMr ? 'अद्याप कोणतेही सानुकूल खाते नाही' : 'No custom ledgers created yet'}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 mt-2 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-10 px-5 rounded-xl text-xs font-semibold"
          >
            {isMr ? 'बंद करा' : 'Close'}
          </Button>
        </div>
      </div>
    </div>
  )
}
