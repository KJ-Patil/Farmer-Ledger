import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Plus, Search, Check, X, Phone, Wallet } from 'lucide-react'
import type { Transaction, CustomLedger, PaymentMode } from '@/shared/types/ledger'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import { useLedgerStore } from '@/shared/hooks/useLedgerStore'

interface PartyLedgerViewProps {
  transactions: Transaction[]
  customLedgers: CustomLedger[]
  onOpenAddModal: (prefillParty?: string) => void
}

export function PartyLedgerView({ transactions, customLedgers, onOpenAddModal }: PartyLedgerViewProps) {
  const { i18n } = useTranslation()
  const isMr = i18n.language === 'mr'
  const { user } = useAuthStore()
  const { createTransaction, recordCreditPayment } = useLedgerStore()

  const [selectedPartyName, setSelectedPartyName] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentType, setPaymentType] = useState<'pay_to_party' | 'receive_from_party'>('pay_to_party')

  // Aggregate all unique parties from transactions AND custom ledgers
  const partiesList = useMemo(() => {
    const map = new Map<string, {
      name: string
      phone?: string
      partyType?: string
      totalDebit: number  // Farmer's purchases/expenses (शेतकऱ्याने देणे / खरेदी)
      totalCredit: number // Farmer's payments/income (भरणा / जमा)
      pendingCreditDue: number
      txCount: number
      lastDate?: string
    }>()

    // 1. Seed from Custom Ledgers
    customLedgers.forEach((cl) => {
      map.set(cl.name, {
        name: cl.name,
        phone: cl.phone,
        partyType: cl.partyType,
        totalDebit: 0,
        totalCredit: 0,
        pendingCreditDue: 0,
        txCount: 0
      })
    })

    // 2. Aggregate transactions
    transactions.forEach((tx) => {
      const pName = tx.partyName || (tx.ledgerType === 'party' ? tx.category : null)
      if (!pName) return

      let record = map.get(pName)
      if (!record) {
        record = {
          name: pName,
          totalDebit: 0,
          totalCredit: 0,
          pendingCreditDue: 0,
          txCount: 0
        }
        map.set(pName, record)
      }

      record.txCount += 1
      if (!record.lastDate || new Date(tx.date) > new Date(record.lastDate)) {
        record.lastDate = tx.date
      }

      if (tx.type === 'expense') {
        record.totalDebit += tx.amount
      } else {
        record.totalCredit += tx.amount
      }

      if (tx.paymentMode === 'credit' && tx.pendingAmount) {
        record.pendingCreditDue += tx.pendingAmount
      }
    })

    return Array.from(map.values()).sort((a, b) => {
      // Sort by pending credit dues first, then by tx count
      return (b.pendingCreditDue - a.pendingCreditDue) || (b.txCount - a.txCount)
    })
  }, [transactions, customLedgers])

  // Filter parties by search query
  const filteredParties = partiesList.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.phone && p.phone.includes(searchQuery))
  )

  // Current active party
  const activeParty = selectedPartyName 
    ? partiesList.find(p => p.name === selectedPartyName) || null
    : null

  // Transactions specifically for the active party, ordered by date ascending for statement
  const partyTransactions = useMemo(() => {
    if (!selectedPartyName) return []

    const relevant = transactions.filter(tx => 
      tx.partyName === selectedPartyName || (tx.ledgerType === 'party' && tx.category === selectedPartyName)
    )

    // Sort ascending for ledger statement running balance calculation
    relevant.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let runningBal = 0
    return relevant.map(tx => {
      // For a merchant/party: Expense = Debit (खरेदी/देणे वाढले), Income/Payment = Credit (भरणा केला)
      const debit = tx.type === 'expense' ? tx.amount : 0
      const credit = tx.type === 'income' ? tx.amount : 0
      runningBal = runningBal + debit - credit

      return {
        ...tx,
        debit,
        credit,
        runningBalance: runningBal
      }
    })
  }, [selectedPartyName, transactions])

  // Handle Payment Submit
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedPartyName || !paymentAmount || Number(paymentAmount) <= 0) return

    const numAmount = Number(paymentAmount)

    // Check if there is an outstanding credit purchase for this party to mark partial settlement
    const pendingCreditTx = transactions.find(tx => 
      (tx.partyName === selectedPartyName || tx.category === selectedPartyName) &&
      tx.paymentMode === 'credit' &&
      (tx.pendingAmount || 0) > 0
    )

    if (pendingCreditTx && paymentType === 'pay_to_party') {
      await recordCreditPayment(user.mobileNumber, pendingCreditTx.id, {
        date: paymentDate,
        amount: numAmount,
        paymentMode,
        notes: paymentNotes || `${selectedPartyName} ला हप्ता भरणा`
      })
    } else {
      // Record a regular party payment transaction
      await createTransaction(user.mobileNumber, {
        type: paymentType === 'pay_to_party' ? 'expense' : 'income',
        ledgerType: 'party',
        category: selectedPartyName,
        partyName: selectedPartyName,
        amount: numAmount,
        date: paymentDate,
        paymentMode,
        notes: paymentNotes || (paymentType === 'pay_to_party' ? `${selectedPartyName} ला भरणा` : `${selectedPartyName} कडून जमा`)
      })
    }

    setIsPaymentModalOpen(false)
    setPaymentAmount('')
    setPaymentNotes('')
  }

  return (
    <div className="flex flex-col gap-5 select-none">
      {/* Search and Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span>{isMr ? 'पार्टी खाती आणि लेजर स्टेटमेंट' : 'Party Ledgers & Statement'}</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            {isMr 
              ? 'प्रत्येक व्यापारी, मजूर टोळी व व्यक्तीचे स्वतंत्र खाते (Khaata), उधारी आणि हिशोब.'
              : 'Individual ledger accounts with date, bill number, debit, credit, and balance.'}
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={isMr ? 'पार्टीचे नाव शोधा...' : 'Search party / merchant...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none"
          />
        </div>
      </div>

      {/* Main Layout: Split Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left column: List of Parties */}
        <div className="lg:col-span-5 flex flex-col gap-2.5 max-h-[600px] overflow-y-auto pr-1">
          {filteredParties.length > 0 ? (
            filteredParties.map((party) => {
              const isSelected = selectedPartyName === party.name
              const netBalance = party.totalDebit - party.totalCredit

              return (
                <Card
                  key={party.name}
                  onClick={() => setSelectedPartyName(party.name)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                    isSelected 
                      ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary' 
                      : 'border-border/60 bg-card hover:border-primary/40 hover:bg-muted/10'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {party.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground leading-snug">{party.name}</h4>
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5">
                          <span>{party.txCount} {isMr ? 'व्यवहार' : 'txns'}</span>
                          {party.partyType && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{party.partyType.replace('_', ' ')}</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-muted-foreground block">
                        {isMr ? 'एकूण बाकी' : 'Net Balance'}
                      </span>
                      <span className={`text-sm font-black ${
                        netBalance > 0 ? 'text-destructive' : netBalance < 0 ? 'text-emerald-600' : 'text-foreground'
                      }`}>
                        ₹{Math.abs(netBalance).toLocaleString()}
                        <span className="text-[9px] font-bold ml-1">
                          {netBalance > 0 ? (isMr ? 'देणे बाकी' : 'Dr') : netBalance < 0 ? (isMr ? 'जमा' : 'Cr') : 'Nil'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {party.pendingCreditDue > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-border/40 flex justify-between items-center text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                      <span>{isMr ? 'उधारी खरेदी बाकी:' : 'Credit Pending:'}</span>
                      <span>₹{party.pendingCreditDue.toLocaleString()}</span>
                    </div>
                  )}
                </Card>
              )
            })
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground font-medium bg-muted/10 rounded-2xl border border-dashed border-border/60">
              {isMr ? 'कोणतेही पार्टी खाते आढळले नाही' : 'No party accounts found'}
            </div>
          )}
        </div>

        {/* Right column: Statement View for Active Party */}
        <div className="lg:col-span-7">
          {activeParty ? (
            <Card className="rounded-2xl border-border/60 bg-card p-5 shadow-sm flex flex-col gap-4">
              {/* Party Header Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-border/40">
                <div>
                  <h3 className="text-base font-bold text-foreground">{activeParty.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {isMr ? 'खाते स्टेटमेंट (Ledger Statement)' : 'Account Statement'}
                    </span>
                    {activeParty.phone && (
                      <span className="text-[10px] font-semibold text-primary flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {activeParty.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="h-9 px-3 rounded-xl text-xs font-bold gap-1 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    <span>{isMr ? 'हप्ता / भरणा करा' : 'Record Payment'}</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenAddModal(activeParty.name)}
                    className="h-9 px-3 rounded-xl text-xs font-bold gap-1 text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{isMr ? 'खरेदी नोंदवा' : 'Add Bill'}</span>
                  </Button>
                </div>
              </div>

              {/* Statement KPI Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-destructive/5 border border-destructive/15 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-destructive uppercase block">
                    {isMr ? 'नावे (Total Debit)' : 'Total Debit'}
                  </span>
                  <span className="text-base font-black text-destructive mt-0.5 block">
                    ₹{activeParty.totalDebit.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-medium">
                    {isMr ? 'खरेदी / देणे' : 'Purchases / Due'}
                  </span>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/15 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase block">
                    {isMr ? 'जमा (Total Credit)' : 'Total Credit'}
                  </span>
                  <span className="text-base font-black text-emerald-600 mt-0.5 block">
                    ₹{activeParty.totalCredit.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-medium">
                    {isMr ? 'भरणा / फेडले' : 'Payments Paid'}
                  </span>
                </div>

                <div className="bg-primary/5 border border-primary/15 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-primary uppercase block">
                    {isMr ? 'शिल्लक (Balance)' : 'Net Balance'}
                  </span>
                  <span className="text-base font-black text-primary mt-0.5 block">
                    ₹{Math.abs(activeParty.totalDebit - activeParty.totalCredit).toLocaleString()}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-semibold">
                    {activeParty.totalDebit >= activeParty.totalCredit ? (isMr ? 'देणे बाकी' : 'To Pay') : (isMr ? 'अगाऊ जमा' : 'Advance')}
                  </span>
                </div>
              </div>

              {/* Statement Table */}
              <div className="border border-border/40 rounded-xl overflow-hidden mt-1">
                <div className="bg-muted/40 px-3 py-2 grid grid-cols-12 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span className="col-span-3">{isMr ? 'तारीख' : 'Date'}</span>
                  <span className="col-span-3">{isMr ? 'बिल क्र. / तपशील' : 'Bill # / Details'}</span>
                  <span className="col-span-2 text-right">{isMr ? 'नावे (Dr)' : 'Debit'}</span>
                  <span className="col-span-2 text-right">{isMr ? 'जमा (Cr)' : 'Credit'}</span>
                  <span className="col-span-2 text-right">{isMr ? 'शिल्लक' : 'Balance'}</span>
                </div>

                <div className="divide-y divide-border/20 max-h-72 overflow-y-auto">
                  {partyTransactions.length > 0 ? (
                    partyTransactions.map((tx: any) => (
                      <div key={tx.id} className="px-3 py-2.5 grid grid-cols-12 text-xs items-center hover:bg-muted/10 transition-colors">
                        <span className="col-span-3 font-semibold text-foreground">
                          {new Date(tx.date).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: '2-digit' })}
                        </span>

                        <div className="col-span-3 flex flex-col min-w-0 pr-1">
                          <span className="font-bold text-foreground truncate text-[11px]">
                            {tx.billNumber ? `#${tx.billNumber}` : tx.category}
                          </span>
                          <span className="text-[9px] text-muted-foreground truncate">
                            {tx.notes || (tx.paymentMode ? `via ${tx.paymentMode.toUpperCase()}` : '')}
                          </span>
                        </div>

                        <span className="col-span-2 text-right font-bold text-destructive">
                          {tx.debit > 0 ? `₹${tx.debit.toLocaleString()}` : '-'}
                        </span>

                        <span className="col-span-2 text-right font-bold text-emerald-600">
                          {tx.credit > 0 ? `₹${tx.credit.toLocaleString()}` : '-'}
                        </span>

                        <span className="col-span-2 text-right font-black text-foreground text-[11px]">
                          ₹{Math.abs(tx.runningBalance).toLocaleString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      {isMr ? 'या खात्यावर अद्याप व्यवहार नाहीत.' : 'No transactions recorded yet for this party.'}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="rounded-2xl border-dashed border-border/60 bg-card p-12 text-center flex flex-col items-center justify-center gap-3">
              <Users className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  {isMr ? 'डावीकडील यादीतून पार्टी खाते निवडा' : 'Select a Party Account'}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {isMr 
                    ? 'त्या व्यक्तीचे किंवा दुकानाचे संपूर्ण लेजर स्टेटमेंट, जमा-खर्च आणि उधारी पाहण्यासाठी क्लिक करा.'
                    : 'Click any party to view full statement, bill numbers, debit, credit, and running balance.'}
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Payment / Settlement Modal */}
      {isPaymentModalOpen && activeParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 select-none animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent/40"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <h3 className="text-base font-bold text-foreground mb-1">
              {isMr ? 'हप्ता किंवा भरणा नोंदवा' : 'Record Payment / Settle Khaata'}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {isMr ? `पार्टी: ${activeParty.name}` : `Party: ${activeParty.name}`}
            </p>

            <form onSubmit={handleRecordPaymentSubmit} className="flex flex-col gap-3.5">
              {/* Payment direction toggle */}
              <div className="grid grid-cols-2 gap-2 bg-accent/40 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setPaymentType('pay_to_party')}
                  className={`h-8 text-xs font-bold rounded-lg transition-all ${
                    paymentType === 'pay_to_party'
                      ? 'bg-destructive text-destructive-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isMr ? 'पार्टीला पैसे दिले (Payment Paid)' : 'Paid to Party'}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('receive_from_party')}
                  className={`h-8 text-xs font-bold rounded-lg transition-all ${
                    paymentType === 'receive_from_party'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isMr ? 'पार्टीकडून मिळाले (Received)' : 'Received from Party'}
                </button>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">
                    {isMr ? 'रक्कम (₹)' : 'Amount (₹)'} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="₹ e.g. 5000"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
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
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">
                  {isMr ? 'पेमेंट प्रकार (Transaction Type)' : 'Payment Mode'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['cash', 'upi', 'bank', 'cheque'] as PaymentMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`h-9 rounded-xl border text-xs font-bold transition-all uppercase ${
                        paymentMode === mode
                          ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/30'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">
                  {isMr ? 'तपशील / पावती क्रमांक' : 'Notes / Receipt #'}
                </label>
                <input
                  type="text"
                  placeholder={isMr ? 'उदा. ५००० रु. गुगल पे द्वारे भरले' : 'e.g. Paid via Google Pay'}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/40 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-semibold"
                >
                  {isMr ? 'रद्द करा' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  className="h-10 px-5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>{isMr ? 'नोंदवा (Record Payment)' : 'Record Payment'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
