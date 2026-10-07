import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  AlertCircle, CheckCircle2, Clock, Calendar, 
  ChevronDown, ChevronUp, Wallet, X, Check 
} from 'lucide-react'
import type { Transaction, PaymentMode } from '@/shared/types/ledger'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import { useLedgerStore } from '@/shared/hooks/useLedgerStore'

interface CreditTrackerViewProps {
  transactions: Transaction[]
  onOpenAddModal: () => void
}

export function CreditTrackerView({ transactions, onOpenAddModal }: CreditTrackerViewProps) {
  const { i18n } = useTranslation()
  const isMr = i18n.language === 'mr'
  const { user } = useAuthStore()
  const { recordCreditPayment } = useLedgerStore()

  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payMode, setPayMode] = useState<PaymentMode>('upi')
  const [payNotes, setPayNotes] = useState('')

  // Filter all credit purchases
  const creditPurchases = transactions.filter(tx => 
    tx.paymentMode === 'credit' || (tx.pendingAmount !== undefined && tx.pendingAmount > 0)
  )

  const totalCreditTaken = creditPurchases.reduce((sum, tx) => sum + tx.amount, 0)
  const totalPendingDue = creditPurchases.reduce((sum, tx) => sum + (tx.pendingAmount !== undefined ? tx.pendingAmount : tx.amount), 0)
  const totalPaidBack = totalCreditTaken - totalPendingDue

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedTx || !payAmount || Number(payAmount) <= 0) return

    await recordCreditPayment(user.mobileNumber, selectedTx.id, {
      date: payDate,
      amount: Number(payAmount),
      paymentMode: payMode,
      notes: payNotes || `${selectedTx.partyName || 'पार्टी'} ला उधारी हप्ता भरणा`
    })

    setSelectedTx(null)
    setPayAmount('')
    setPayNotes('')
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="flex flex-col gap-5 select-none">
      {/* Header and KPI Cards */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <span>{isMr ? 'उधारी खरेदी व्यवस्थापन (Credit Purchases)' : 'Credit Purchases & Dues'}</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            {isMr 
              ? 'उधारीवर घेतलेला माल, देय तारीख, बाकी रक्कम आणि हप्ता भरणा इतिहास.' 
              : 'Track credit purchases, due amounts, pending balances, and repayment history.'}
          </p>
        </div>

        <Button
          onClick={onOpenAddModal}
          className="h-10 px-4 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm"
        >
          <Wallet className="h-4 w-4" />
          <span>{isMr ? 'उधारी खरेदी नोंदवा' : 'Add Credit Purchase'}</span>
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-amber-500/20 bg-amber-500/5 p-4 flex flex-col gap-1 shadow-sm">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
            {isMr ? 'एकूण बाकी उधारी (Pending Due)' : 'Total Pending Due'}
          </span>
          <span className="text-2xl font-black text-amber-600 mt-1">
            ₹{totalPendingDue.toLocaleString()}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {creditPurchases.filter(tx => (tx.pendingAmount ?? tx.amount) > 0).length} {isMr ? 'बिले बाकी आहेत' : 'pending bills'}
          </span>
        </Card>

        <Card className="rounded-2xl border-border/40 bg-card p-4 flex flex-col gap-1 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {isMr ? 'एकूण घेतलेली उधारी' : 'Total Credit Taken'}
          </span>
          <span className="text-2xl font-black text-foreground mt-1">
            ₹{totalCreditTaken.toLocaleString()}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {creditPurchases.length} {isMr ? 'एकूण खरेदी' : 'total credit bills'}
          </span>
        </Card>

        <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col gap-1 shadow-sm">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
            {isMr ? 'भरणा केलेली रक्कम (Paid)' : 'Total Paid Back'}
          </span>
          <span className="text-2xl font-black text-emerald-600 mt-1">
            ₹{totalPaidBack.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {totalCreditTaken > 0 ? `${Math.round((totalPaidBack / totalCreditTaken) * 100)}% भरणा झाला` : '100%'}
          </span>
        </Card>
      </div>

      {/* Credit Purchases List */}
      <div className="flex flex-col gap-3">
        {creditPurchases.length > 0 ? (
          creditPurchases.map((tx) => {
            const pending = tx.pendingAmount !== undefined ? tx.pendingAmount : tx.amount
            const isSettled = pending <= 0
            const isOverdue = !isSettled && tx.dueDate && tx.dueDate < today
            const isExpanded = expandedTxId === tx.id

            return (
              <Card 
                key={tx.id} 
                className={`rounded-2xl border transition-all p-4 ${
                  isSettled 
                    ? 'border-emerald-500/20 bg-emerald-500/5' 
                    : isOverdue 
                    ? 'border-destructive/30 bg-destructive/5' 
                    : 'border-border/60 bg-card hover:border-border'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isSettled 
                        ? 'bg-emerald-500/10 text-emerald-600' 
                        : isOverdue 
                        ? 'bg-destructive/10 text-destructive' 
                        : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {isSettled ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {tx.partyName || tx.category}
                        </span>
                        {tx.billNumber && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/40">
                            #{tx.billNumber}
                          </span>
                        )}
                        {isSettled ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">
                            {isMr ? 'पूर्ण भरणा' : 'Fully Settled'}
                          </span>
                        ) : isOverdue ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/20 animate-pulse">
                            {isMr ? 'मुदत उलटली (Overdue)' : 'Overdue'}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/20">
                            {isMr ? 'बाकी (Pending)' : 'Pending'}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground font-semibold mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {isMr ? 'खरेदी:' : 'Date:'} {new Date(tx.date).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {tx.dueDate && (
                          <>
                            <span>•</span>
                            <span className={isOverdue ? 'text-destructive font-bold' : ''}>
                              {isMr ? 'मुदत तारीख:' : 'Due:'} {new Date(tx.dueDate).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </>
                        )}
                        {tx.items && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-xs">{tx.items}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-border/20">
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground font-bold block">
                        {isMr ? 'बाकी रक्कम / बिल' : 'Pending / Total'}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-base font-black ${isSettled ? 'text-emerald-600' : 'text-destructive'}`}>
                          ₹{pending.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground line-through">
                          ₹{tx.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isSettled && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedTx(tx)
                            setPayAmount(String(pending))
                          }}
                          className="h-8 px-3 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm"
                        >
                          {isMr ? 'हप्ता भरा' : 'Pay'}
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                        className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Payment History Drawer */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border/40 flex flex-col gap-2 animate-in fade-in duration-150">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      {isMr ? 'हप्ता भरणा इतिहास (Payment History):' : 'Payment History:'}
                    </span>

                    {tx.payments && tx.payments.length > 0 ? (
                      <div className="divide-y divide-border/20 border border-border/40 rounded-xl overflow-hidden bg-background/50">
                        {tx.payments.map((p) => (
                          <div key={p.id} className="p-2.5 flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                {p.paymentMode}
                              </span>
                              <span className="font-semibold text-foreground">
                                {new Date(p.date).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              {p.notes && <span className="text-muted-foreground text-[10px] italic">({p.notes})</span>}
                            </div>
                            <span className="font-bold text-emerald-600">₹{p.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic py-1">
                        {isMr ? 'अद्याप कोणताही हप्ता भरलेला नाही.' : 'No partial payments made yet.'}
                      </span>
                    )}
                  </div>
                )}
              </Card>
            )
          })
        ) : (
          <Card className="p-12 text-center flex flex-col items-center justify-center gap-2.5 rounded-2xl border-dashed border-border/60">
            <CheckCircle2 className="h-10 w-10 text-emerald-500/50" />
            <h4 className="text-sm font-bold text-foreground">
              {isMr ? 'कोणतीही उधारी बाकी नाही!' : 'No Outstanding Credit Purchases!'}
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              {isMr 
                ? 'जेव्हा आपण उधारीवर बियाणे, खत किंवा औषधे खरेदी करता, तेव्हा ते येथे दिसेल.' 
                : 'When you purchase agri supplies on credit, they will appear here with due dates and payment tracking.'}
            </p>
          </Card>
        )}
      </div>

      {/* Settle / Pay Installment Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 select-none animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent/40"
            >
              <X className="h-[18px] w-[18px]" />
            </button>

            <h3 className="text-base font-bold text-foreground mb-1">
              {isMr ? 'उधारीचा हप्ता भरा' : 'Pay Credit Installment'}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {isMr ? `बिल: #${selectedTx.billNumber || selectedTx.id.slice(0, 6)} (${selectedTx.partyName || selectedTx.category})` : `Bill: #${selectedTx.billNumber || selectedTx.id.slice(0, 6)}`}
            </p>

            <form onSubmit={handleSettleSubmit} className="flex flex-col gap-3.5">
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex justify-between items-center text-xs">
                <span className="font-semibold text-amber-700 dark:text-amber-300">
                  {isMr ? 'सध्याची एकूण बाकी:' : 'Current Outstanding:'}
                </span>
                <span className="font-black text-amber-700 dark:text-amber-300 text-sm">
                  ₹{(selectedTx.pendingAmount !== undefined ? selectedTx.pendingAmount : selectedTx.amount).toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">
                    {isMr ? 'भरणा रक्कम (₹)' : 'Payment Amount (₹)'} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedTx.pendingAmount !== undefined ? selectedTx.pendingAmount : selectedTx.amount}
                    placeholder="₹ e.g. 2000"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-bold focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">
                    {isMr ? 'भरणा तारीख' : 'Payment Date'} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">
                  {isMr ? 'पेमेंट प्रकार' : 'Payment Mode'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['upi', 'cash', 'bank', 'cheque'] as PaymentMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMode(m)}
                      className={`h-9 rounded-xl border text-xs font-bold transition-all uppercase ${
                        payMode === m
                          ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/30'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">
                  {isMr ? 'तपशील / पावती क्रमांक' : 'Notes / Receipt #'}
                </label>
                <input
                  type="text"
                  placeholder={isMr ? 'उदा. ५००० रु. UPI द्वारे दिले' : 'e.g. Paid via UPI'}
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/40 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedTx(null)}
                  className="h-10 px-4 rounded-xl text-xs font-semibold"
                >
                  {isMr ? 'रद्द करा' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  className="h-10 px-5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>{isMr ? 'हप्ता नोंदवा' : 'Record Payment'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
