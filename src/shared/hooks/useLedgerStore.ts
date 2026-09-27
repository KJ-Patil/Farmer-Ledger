import { create } from 'zustand'
import { db, isMock } from '@/shared/services/firebase'
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, updateDoc } from 'firebase/firestore'
import { logger } from '@/shared/services/logger'
import type { Transaction, CustomLedger, PaymentRecord } from '@/shared/types/ledger'

export const DEFAULT_CUSTOM_LEDGERS: Omit<CustomLedger, 'id' | 'createdAt'>[] = [
  { name: 'ABC कृषी सेवा केंद्र', type: 'party', partyType: 'merchant', notes: 'खत, बियाणे व औषधे केंद्र' },
  { name: 'गणपत पाटील', type: 'party', partyType: 'farmer', notes: 'शेतकरी / स्थानिक व्यवहार' },
  { name: 'खुरपणी टोळी', type: 'custom', partyType: 'labor_gang', notes: 'शेती कामासाठी मजुरांची टोळी' },
  { name: 'ट्रॅक्टर मालक', type: 'party', partyType: 'transporter', notes: 'नांगरणी व शेती कामे' },
  { name: 'ड्रायव्हर', type: 'custom', partyType: 'other', notes: 'वाहतूक व वाहन चालक' },
  { name: 'दूध डेअरी', type: 'party', partyType: 'dairy', notes: 'रोजचे दूध संकलन केंद्र' },
  { name: 'खत विक्रेता', type: 'party', partyType: 'merchant', notes: 'रासायनिक व सेंद्रिय खते' },
]

interface LedgerStoreState {
  transactions: Transaction[]
  customLedgers: CustomLedger[]
  loading: boolean
  error: string | null
  fetchTransactions: (mobileNumber: string) => Promise<void>
  createTransaction: (mobileNumber: string, txData: Omit<Transaction, 'id' | 'status' | 'timestamp'>) => Promise<string | null>
  postIncomeTransaction: (mobileNumber: string, incomeData: Omit<Transaction, 'id' | 'status' | 'timestamp'>) => Promise<string | null>
  postExpenseTransaction: (mobileNumber: string, expenseData: Omit<Transaction, 'id' | 'status' | 'timestamp' | 'type'>) => Promise<string | null>
  deleteTransaction: (mobileNumber: string, txId: string) => Promise<boolean>
  updateTransaction: (mobileNumber: string, txId: string, txData: Partial<Transaction>) => Promise<boolean>
  fetchCustomLedgers: (mobileNumber: string) => Promise<void>
  createCustomLedger: (mobileNumber: string, ledgerData: Omit<CustomLedger, 'id' | 'createdAt'>) => Promise<string | null>
  deleteCustomLedger: (mobileNumber: string, ledgerId: string) => Promise<boolean>
  recordCreditPayment: (mobileNumber: string, txId: string, payment: Omit<PaymentRecord, 'id' | 'timestamp'>) => Promise<boolean>
  recordLoanEmiPayment: (mobileNumber: string, loanTxId: string, payment: { amount: number; date: string; paymentMode: Transaction['paymentMode']; notes?: string }) => Promise<boolean>
}

export const useLedgerStore = create<LedgerStoreState>((set, get) => ({
  transactions: [],
  customLedgers: [],
  loading: false,
  error: null,

  fetchTransactions: async (mobileNumber: string) => {
    if (!mobileNumber) return
    set({ loading: true, error: null })
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }

      if (isMock) {
        const localTxsStr = localStorage.getItem(`farmer_ledger_${cleanMobile}`)
        const localTxs = localTxsStr ? JSON.parse(localTxsStr) : []
        localTxs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        set({ transactions: localTxs, loading: false })
      } else {
        const txsRef = collection(db as any, 'users', cleanMobile, 'ledger')
        const q = query(txsRef, orderBy('timestamp', 'desc'))
        const snapshot = await getDocs(q)
        const fetchedTxs: Transaction[] = []
        snapshot.forEach((docSnap) => {
          fetchedTxs.push({
            id: docSnap.id,
            ...docSnap.data()
          } as Transaction)
        })
        set({ transactions: fetchedTxs, loading: false })
      }
    } catch (err: any) {
      logger.error('Failed to fetch transactions', err)
      set({ error: err.message || 'Failed to load ledger', loading: false })
    }
  },

  createTransaction: async (mobileNumber: string, txData) => {
    if (!mobileNumber) return null
    set({ loading: true, error: null })
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }
      const timestamp = new Date().toISOString()

      // Normalize credit purchases: default pendingAmount to total amount if not specified
      const normalizedTxData: typeof txData = {
        ...txData,
        paymentMode: txData.paymentMode || 'cash',
        pendingAmount: txData.paymentMode === 'credit' 
          ? (txData.pendingAmount !== undefined ? txData.pendingAmount : txData.amount)
          : 0,
        payments: txData.payments || []
      }

      if (isMock) {
        const txId = `tx-${Math.random().toString(36).substring(7)}`
        const newTx: Transaction = {
          id: txId,
          ...normalizedTxData,
          status: 'synced',
          timestamp
        }
        const currentTxs = get().transactions
        const updatedTxs = [newTx, ...currentTxs]
        set({ transactions: updatedTxs, loading: false })
        localStorage.setItem(`farmer_ledger_${cleanMobile}`, JSON.stringify(updatedTxs))
        logger.info('Mock transaction created locally', newTx)
        return txId
      } else {
        const txsRef = collection(db as any, 'users', cleanMobile, 'ledger')
        const docRef = await addDoc(txsRef, {
          ...normalizedTxData,
          timestamp
        })
        const newTx: Transaction = {
          id: docRef.id,
          ...normalizedTxData,
          status: 'synced',
          timestamp
        }
        const currentTxs = get().transactions
        set({ transactions: [newTx, ...currentTxs], loading: false })
        logger.info('Firestore transaction document written', newTx)
        return docRef.id
      }
    } catch (err: any) {
      logger.error('Failed to create transaction', err)
      set({ error: err.message || 'Failed to save transaction', loading: false })
      return null
    }
  },

  /**
   * Module 6A: Double-Entry Income Posting Engine
   * One Entry -> Multiple Automatic Ledger Updates
   */
  postIncomeTransaction: async (mobileNumber: string, incomeData) => {
    if (!mobileNumber) return null
    set({ loading: true, error: null })
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }
      const timestamp = new Date().toISOString()
      const primaryId = `tx-${Math.random().toString(36).substring(7)}`

      const allNewEntries: Transaction[] = []

      // 1. Prepare Primary Transaction
      const primaryTx: Transaction = {
        id: primaryId,
        ...incomeData,
        type: 'income',
        status: 'synced',
        timestamp
      }
      allNewEntries.push(primaryTx)

      // 2. Double Entry Engine Rules:
      // Scenario 1: Crop Sale with Deductions (Hamali, Transport, Other)
      if (incomeData.incomeCategory === 'crop_sale' && incomeData.cropSaleDetails) {
        const { hamali, transport, otherDeductions, plotId, plotName, cropId, cropName, buyerName } = incomeData.cropSaleDetails

        // Auto-posting: Hamali Expense
        if (hamali && hamali > 0) {
          allNewEntries.push({
            id: `tx-hamali-${Math.random().toString(36).substring(7)}`,
            type: 'expense',
            ledgerType: 'agriculture',
            category: 'labor',
            amount: hamali,
            date: incomeData.date,
            paymentMode: 'cash',
            plotId,
            plotName,
            cropId,
            cropName,
            partyName: buyerName,
            notes: `[स्वयंचलित नोंद / Auto-posted] शेतीमाल विक्री हमाली खर्च`,
            isAutoGenerated: true,
            parentTransactionId: primaryId,
            autoEntryType: 'hamali_expense',
            status: 'synced',
            timestamp
          })
        }

        // Auto-posting: Transport Expense
        if (transport && transport > 0) {
          allNewEntries.push({
            id: `tx-trans-${Math.random().toString(36).substring(7)}`,
            type: 'expense',
            ledgerType: 'agriculture',
            category: 'transport',
            amount: transport,
            date: incomeData.date,
            paymentMode: 'cash',
            plotId,
            plotName,
            cropId,
            cropName,
            partyName: buyerName,
            notes: `[स्वयंचलित नोंद / Auto-posted] शेतीमाल विक्री वाहतूक खर्च`,
            isAutoGenerated: true,
            parentTransactionId: primaryId,
            autoEntryType: 'transport_expense',
            status: 'synced',
            timestamp
          })
        }

        // Auto-posting: Other Deductions Expense
        if (otherDeductions && otherDeductions > 0) {
          allNewEntries.push({
            id: `tx-deduct-${Math.random().toString(36).substring(7)}`,
            type: 'expense',
            ledgerType: 'agriculture',
            category: 'other_agri_expense',
            amount: otherDeductions,
            date: incomeData.date,
            paymentMode: 'cash',
            plotId,
            plotName,
            cropId,
            cropName,
            partyName: buyerName,
            notes: `[स्वयंचलित नोंद / Auto-posted] शेतीमाल विक्री इतर कपात खर्च`,
            isAutoGenerated: true,
            parentTransactionId: primaryId,
            autoEntryType: 'other_deduction_expense',
            status: 'synced',
            timestamp
          })
        }
      }

      // Scenario 2: Loan Received with Liability & Processing Fee
      if (incomeData.incomeCategory === 'loan' && incomeData.loanDetails) {
        const { sanctionAmount, processingFee, loanProvider, dueDate } = incomeData.loanDetails

        // Auto-posting 1: Loan Outstanding Liability in Party/Loan Ledger
        allNewEntries.push({
          id: `tx-loan-liab-${Math.random().toString(36).substring(7)}`,
          type: 'expense',
          ledgerType: 'party',
          category: 'कर्ज दायित्व (Loan Outstanding)',
          partyName: loanProvider,
          amount: sanctionAmount,
          date: incomeData.date,
          paymentMode: 'credit',
          pendingAmount: sanctionAmount,
          dueDate,
          notes: `[स्वयंचलित नोंद / Auto-posted] मंजूर कर्ज देयता (${loanProvider})`,
          isAutoGenerated: true,
          parentTransactionId: primaryId,
          autoEntryType: 'loan_outstanding',
          status: 'synced',
          timestamp
        })

        // Auto-posting 2: Processing Fee Expense
        if (processingFee && processingFee > 0) {
          allNewEntries.push({
            id: `tx-proc-fee-${Math.random().toString(36).substring(7)}`,
            type: 'expense',
            ledgerType: 'personal',
            category: 'other_expense',
            partyName: loanProvider,
            amount: processingFee,
            date: incomeData.date,
            paymentMode: 'bank',
            notes: `[स्वयंचलित नोंद / Auto-posted] कर्ज प्रोसेसिंग फी खर्च (${loanProvider})`,
            isAutoGenerated: true,
            parentTransactionId: primaryId,
            autoEntryType: 'processing_fee_expense',
            status: 'synced',
            timestamp
          })
        }
      }

      // 3. Save to Store & Persistence
      if (isMock) {
        const currentTxs = get().transactions
        const updatedTxs = [...allNewEntries, ...currentTxs]
        set({ transactions: updatedTxs, loading: false })
        localStorage.setItem(`farmer_ledger_${cleanMobile}`, JSON.stringify(updatedTxs))
        logger.info('Double-entry income transactions posted locally', allNewEntries)
        return primaryId
      } else {
        const txsRef = collection(db as any, 'users', cleanMobile, 'ledger')
        for (const entry of allNewEntries) {
          const { id, ...dataToSave } = entry
          await addDoc(txsRef, dataToSave)
        }
        const currentTxs = get().transactions
        set({ transactions: [...allNewEntries, ...currentTxs], loading: false })
        logger.info('Double-entry income transactions posted to Firestore', allNewEntries)
        return primaryId
      }
    } catch (err: any) {
      logger.error('Failed to post income transaction', err)
      set({ error: err.message || 'Failed to post income transaction', loading: false })
      return null
    }
  },

  postExpenseTransaction: async (mobileNumber: string, expenseData) => {
    if (!mobileNumber) return null
    set({ loading: true, error: null })
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }
      const timestamp = new Date().toISOString()
      const txId = `tx-exp-${Date.now()}-${Math.random().toString(36).substring(7)}`

      const isCredit = expenseData.paymentMode === 'credit'
      const newEntry: Transaction = {
        ...expenseData,
        id: txId,
        type: 'expense',
        amount: Number(expenseData.amount) || 0,
        paymentMode: expenseData.paymentMode || 'cash',
        pendingAmount: isCredit ? (Number(expenseData.amount) || 0) : 0,
        payments: [],
        status: 'synced',
        timestamp
      }

      if (isMock) {
        const currentTxs = get().transactions
        const updatedTxs = [newEntry, ...currentTxs]
        set({ transactions: updatedTxs, loading: false })
        localStorage.setItem(`farmer_ledger_${cleanMobile}`, JSON.stringify(updatedTxs))
        logger.info('Expense transaction posted locally', newEntry)
        return txId
      } else {
        const txsRef = collection(db as any, 'users', cleanMobile, 'ledger')
        const { id, ...dataToSave } = newEntry
        const docRef = await addDoc(txsRef, dataToSave)
        const savedEntry: Transaction = { ...newEntry, id: docRef.id }
        const currentTxs = get().transactions
        set({ transactions: [savedEntry, ...currentTxs], loading: false })
        logger.info('Expense transaction posted to Firestore', savedEntry)
        return docRef.id
      }
    } catch (err: any) {
      logger.error('Failed to post expense transaction', err)
      set({ error: err.message || 'Failed to post expense transaction', loading: false })
      return null
    }
  },

  deleteTransaction: async (mobileNumber: string, txId: string) => {
    if (!mobileNumber || !txId) return false
    set({ loading: true, error: null })
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }

      const currentTxs = get().transactions
      const targetTx = currentTxs.find((t) => t.id === txId)
      if (targetTx?.isAutoGenerated) {
        throw new Error('स्वयंचलित नोंद थेट डिलीट करता येत नाही. कृपया मूळ व्यवहार (Parent Transaction) डिलीट करा.')
      }

      // Cascade delete: delete target transaction AND any child auto-generated entries
      const toDeleteIds = new Set<string>([txId])
      currentTxs.forEach((tx) => {
        if (tx.parentTransactionId === txId) {
          toDeleteIds.add(tx.id)
        }
      })

      if (isMock) {
        const updatedTxs = currentTxs.filter((tx) => !toDeleteIds.has(tx.id))
        set({ transactions: updatedTxs, loading: false })
        localStorage.setItem(`farmer_ledger_${cleanMobile}`, JSON.stringify(updatedTxs))
        logger.info('Mock transaction & auto-postings deleted locally', Array.from(toDeleteIds))
        return true
      } else {
        for (const id of toDeleteIds) {
          const txDocRef = doc(db as any, 'users', cleanMobile, 'ledger', id)
          await deleteDoc(txDocRef)
        }
        const updatedTxs = currentTxs.filter((tx) => !toDeleteIds.has(tx.id))
        set({ transactions: updatedTxs, loading: false })
        logger.info('Firestore transactions deleted', Array.from(toDeleteIds))
        return true
      }
    } catch (err: any) {
      logger.error('Failed to delete transaction', err)
      set({ error: err.message || 'Failed to delete transaction', loading: false })
      return false
    }
  },

  updateTransaction: async (mobileNumber: string, txId: string, txData: Partial<Transaction>) => {
    if (!mobileNumber || !txId) return false
    set({ loading: true, error: null })
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }

      const currentTxs = get().transactions
      const targetTx = currentTxs.find((t) => t.id === txId)
      if (targetTx?.isAutoGenerated) {
        throw new Error('स्वयंचलित नोंद थेट एडिट करता येत नाही. कृपया मूळ व्यवहार (Parent Transaction) एडिट करा.')
      }

      // Build Audit Trail record
      const auditRecord = {
        editDate: new Date().toISOString(),
        editedBy: 'Farmer',
        previousAmount: targetTx?.amount,
        previousCategory: targetTx?.category,
        previousPaymentMode: targetTx?.paymentMode,
        previousDate: targetTx?.date,
        previousNotes: targetTx?.notes,
        newAmount: txData.amount !== undefined ? txData.amount : targetTx?.amount,
        newCategory: txData.category !== undefined ? txData.category : targetTx?.category,
        newPaymentMode: txData.paymentMode !== undefined ? txData.paymentMode : targetTx?.paymentMode,
        newDate: txData.date !== undefined ? txData.date : targetTx?.date,
        newNotes: txData.notes !== undefined ? txData.notes : targetTx?.notes
      }

      const updatedAuditHistory = [...(targetTx?.editHistory || []), auditRecord]
      const finalUpdateData: Partial<Transaction> = {
        ...txData,
        isEdited: true,
        editDate: new Date().toISOString(),
        editedBy: 'Farmer',
        editHistory: updatedAuditHistory
      }

      if (isMock) {
        const updatedTxs = currentTxs.map((tx) => 
          tx.id === txId ? { ...tx, ...finalUpdateData } : tx
        )
        set({ transactions: updatedTxs, loading: false })
        localStorage.setItem(`farmer_ledger_${cleanMobile}`, JSON.stringify(updatedTxs))
        logger.info('Mock transaction updated with audit trail', { txId, finalUpdateData })
        return true
      } else {
        const txDocRef = doc(db as any, 'users', cleanMobile, 'ledger', txId)
        await updateDoc(txDocRef, finalUpdateData as any)
        
        const currentTxs = get().transactions
        const updatedTxs = currentTxs.map((tx) => 
          tx.id === txId ? { ...tx, ...finalUpdateData } : tx
        )
        
        set({ transactions: updatedTxs, loading: false })
        logger.info('Firestore transaction updated with audit trail', { txId, finalUpdateData })
        return true
      }
    } catch (err: any) {
      logger.error('Failed to update transaction', err)
      set({ error: err.message || 'Failed to update transaction', loading: false })
      return false
    }
  },

  fetchCustomLedgers: async (mobileNumber: string) => {
    if (!mobileNumber) return
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }

      if (isMock) {
        const localStr = localStorage.getItem(`farmer_custom_ledgers_${cleanMobile}`)
        if (!localStr) {
          // Preload default ledgers
          const initialLedgers: CustomLedger[] = DEFAULT_CUSTOM_LEDGERS.map((item, idx) => ({
            ...item,
            id: `ledger-default-${idx + 1}`,
            createdAt: new Date().toISOString()
          }))
          localStorage.setItem(`farmer_custom_ledgers_${cleanMobile}`, JSON.stringify(initialLedgers))
          set({ customLedgers: initialLedgers })
        } else {
          set({ customLedgers: JSON.parse(localStr) })
        }
      } else {
        const ledgersRef = collection(db as any, 'users', cleanMobile, 'custom_ledgers')
        const snapshot = await getDocs(ledgersRef)
        const fetched: CustomLedger[] = []
        snapshot.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as CustomLedger)
        })
        if (fetched.length === 0) {
          // Seed defaults in firestore
          const initialLedgers: CustomLedger[] = []
          for (const item of DEFAULT_CUSTOM_LEDGERS) {
            const docRef = await addDoc(ledgersRef, {
              ...item,
              createdAt: new Date().toISOString()
            })
            initialLedgers.push({ ...item, id: docRef.id, createdAt: new Date().toISOString() })
          }
          set({ customLedgers: initialLedgers })
        } else {
          set({ customLedgers: fetched })
        }
      }
    } catch (err: any) {
      logger.error('Failed to fetch custom ledgers', err)
    }
  },

  createCustomLedger: async (mobileNumber: string, ledgerData) => {
    if (!mobileNumber) return null
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }
      const createdAt = new Date().toISOString()

      if (isMock) {
        const ledgerId = `ledger-${Math.random().toString(36).substring(7)}`
        const newLedger: CustomLedger = {
          id: ledgerId,
          ...ledgerData,
          createdAt
        }
        const current = get().customLedgers
        const updated = [...current, newLedger]
        set({ customLedgers: updated })
        localStorage.setItem(`farmer_custom_ledgers_${cleanMobile}`, JSON.stringify(updated))
        return ledgerId
      } else {
        const ledgersRef = collection(db as any, 'users', cleanMobile, 'custom_ledgers')
        const docRef = await addDoc(ledgersRef, {
          ...ledgerData,
          createdAt
        })
        const newLedger: CustomLedger = {
          id: docRef.id,
          ...ledgerData,
          createdAt
        }
        set({ customLedgers: [...get().customLedgers, newLedger] })
        return docRef.id
      }
    } catch (err: any) {
      logger.error('Failed to create custom ledger', err)
      return null
    }
  },

  deleteCustomLedger: async (mobileNumber: string, ledgerId: string) => {
    if (!mobileNumber || !ledgerId) return false
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }

      if (isMock) {
        const updated = get().customLedgers.filter((l) => l.id !== ledgerId)
        set({ customLedgers: updated })
        localStorage.setItem(`farmer_custom_ledgers_${cleanMobile}`, JSON.stringify(updated))
        return true
      } else {
        const docRef = doc(db as any, 'users', cleanMobile, 'custom_ledgers', ledgerId)
        await deleteDoc(docRef)
        set({ customLedgers: get().customLedgers.filter((l) => l.id !== ledgerId) })
        return true
      }
    } catch (err: any) {
      logger.error('Failed to delete custom ledger', err)
      return false
    }
  },

  recordCreditPayment: async (mobileNumber: string, txId: string, payment) => {
    if (!mobileNumber || !txId) return false
    try {
      const targetTx = get().transactions.find((t) => t.id === txId)
      if (!targetTx) return false

      const paymentRecord: PaymentRecord = {
        id: `pay-${Math.random().toString(36).substring(7)}`,
        ...payment,
        timestamp: new Date().toISOString()
      }

      const existingPayments = targetTx.payments || []
      const updatedPayments = [...existingPayments, paymentRecord]
      const currentPending = targetTx.pendingAmount !== undefined ? targetTx.pendingAmount : targetTx.amount
      const newPending = Math.max(0, currentPending - payment.amount)

      // Update the original credit transaction
      const success = await get().updateTransaction(mobileNumber, txId, {
        pendingAmount: newPending,
        payments: updatedPayments
      })

      if (success) {
        // Also record a corresponding cash/bank payout transaction in the ledger for full double-entry integrity
        await get().createTransaction(mobileNumber, {
          type: 'expense',
          ledgerType: targetTx.ledgerType,
          category: targetTx.category,
          amount: payment.amount,
          date: payment.date,
          paymentMode: payment.paymentMode,
          partyName: targetTx.partyName,
          cropId: targetTx.cropId,
          cropName: targetTx.cropName,
          notes: `उधारी हप्ता भरणा (Payment for Bill #${targetTx.billNumber || txId.slice(0, 6)}): ${payment.notes || ''}`.trim()
        })
      }

      return success
    } catch (err: any) {
      logger.error('Failed to record credit payment', err)
      return false
    }
  },

  recordLoanEmiPayment: async (mobileNumber: string, loanTxId: string, payment) => {
    if (!mobileNumber || !loanTxId) return false
    try {
      const loanLiabilityTx = get().transactions.find((t) => 
        (t.id === loanTxId || t.parentTransactionId === loanTxId) && t.autoEntryType === 'loan_outstanding'
      ) || get().transactions.find((t) => t.id === loanTxId)

      if (!loanLiabilityTx) return false

      const currentPending = loanLiabilityTx.pendingAmount !== undefined ? loanLiabilityTx.pendingAmount : loanLiabilityTx.amount
      const newPending = Math.max(0, currentPending - payment.amount)

      await get().updateTransaction(mobileNumber, loanLiabilityTx.id, {
        pendingAmount: newPending
      })

      // Record EMI payment expense in ledger
      const paymentTxId = await get().createTransaction(mobileNumber, {
        type: 'expense',
        ledgerType: 'party',
        category: 'कर्ज हप्ता (EMI Payment)',
        amount: payment.amount,
        date: payment.date,
        paymentMode: payment.paymentMode || 'bank',
        partyName: loanLiabilityTx.partyName,
        notes: `कर्ज हप्ता भरणा (EMI for ${loanLiabilityTx.partyName || 'Loan'}): ${payment.notes || ''}`.trim()
      })

      return !!paymentTxId
    } catch (err: any) {
      logger.error('Failed to record loan EMI payment', err)
      return false
    }
  }
}))
