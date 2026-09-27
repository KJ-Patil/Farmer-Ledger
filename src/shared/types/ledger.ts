export type TransactionType = 'income' | 'expense'
export type LedgerType = 'personal' | 'agriculture' | 'party' | 'custom' | 'dairy'
export type PaymentMode = 'cash' | 'bank' | 'upi' | 'credit' | 'cheque'
export type IncomeCategory = 'crop_sale' | 'dairy' | 'loan' | 'other' | 'custom'

// Module 7 Expense Categories
export type PersonalExpenseCategory = 
  | 'home_expenses'
  | 'groceries'
  | 'medical'
  | 'education'
  | 'travel'
  | 'petrol'
  | 'diesel'
  | 'electricity_bill'
  | 'mobile_recharge'
  | 'marriage_function'
  | 'emergency_expense'
  | 'other_expense'

export type AgriExpenseCategory =
  | 'seeds'
  | 'fertilizers'
  | 'pesticides'
  | 'labor'
  | 'weeding'
  | 'tractor'
  | 'irrigation'
  | 'agri_electricity'
  | 'transport'
  | 'packing'
  | 'market_cost'
  | 'hamali'
  | 'other_agri_expense'

export type DairyExpenseCategory =
  | 'dairy_fodder'
  | 'dairy_medicines'
  | 'veterinary_doctor'
  | 'milk_collection'
  | 'dairy_electricity'
  | 'dairy_labor'
  | 'other_dairy_expense'

// Module 7 & 8 Reports & P&L Types
export type ReportType = 
  | 'ledger'
  | 'cash_book'
  | 'bank_book'
  | 'profit_loss'
  | 'plot_report'
  | 'crop_report'
  | 'dairy_report'
  | 'income_report'
  | 'expense_report'
  | 'party_loan_report'
  | 'input_consumption'
  | 'input_stock'
  | 'season_report'

export type ProfitLossPeriodType = 
  | 'daily'
  | 'monthly'
  | 'yearly'
  | 'financial_year'
  | 'plot_wise'
  | 'crop_wise'
  | 'dairy'
  | 'overall'

export interface EditHistoryRecord {
  editDate: string
  editedBy: string
  previousAmount?: number
  previousCategory?: string
  previousPaymentMode?: PaymentMode
  previousDate?: string
  previousNotes?: string
  newAmount?: number
  newCategory?: string
  newPaymentMode?: PaymentMode
  newDate?: string
  newNotes?: string
}

export interface ProfitLossStatement {
  periodType: ProfitLossPeriodType
  periodLabel: string
  startDate?: string
  endDate?: string
  totalIncome: number
  grossCropIncome: number
  dairyIncome: number
  otherIncome: number
  directExpenses: number
  grossProfit: number
  indirectExpenses: number
  netProfit: number
  netMarginPercent: number
  incomeBreakdown: { label: string; amount: number }[]
  expenseBreakdown: { label: string; amount: number; isDirect: boolean }[]
}

export interface BillAttachment {
  name: string
  type: 'image' | 'pdf'
  dataUrl: string
  size?: number
}

export interface PaymentRecord {
  id: string
  date: string
  amount: number
  paymentMode: PaymentMode
  notes?: string
  timestamp: string
}

export interface CustomLedger {
  id: string
  name: string
  type: LedgerType
  partyType?: 'merchant' | 'labor_gang' | 'transporter' | 'dairy' | 'farmer' | 'other'
  phone?: string
  address?: string
  notes?: string
  createdAt: string
}

export interface OCRScanResult {
  shopName: string
  billNumber: string
  date: string
  items: string
  amount: number
  gstAmount: number
  rawText?: string
  confidence?: number
}

export interface CropSaleDetails {
  plotId?: string
  plotName?: string
  cropId?: string
  cropName?: string
  buyerName: string
  quantity: number
  unit: string // 'quintal' | 'kg' | 'bag' | 'ton' | 'box' | 'crate'
  rate: number
  grossAmount: number
  hamali?: number // deduction
  transport?: number // deduction
  otherDeductions?: number // deduction
  netAmount: number
}

export interface DairyIncomeDetails {
  product: 'milk' | 'ghee' | 'paneer' | 'curd' | 'buttermilk' | 'khava' | 'animal_sale' | 'dung' | 'other'
  customProductName?: string
  quantity: number
  unit: string
  rate: number
  totalAmount: number
  customerName: string
}

export interface LoanDetails {
  loanProvider: string // e.g. 'SBI', 'निफाड पतसंस्था'
  institution: string
  loanType: string // 'crop_loan' | 'term_loan' | 'gold_loan' | 'personal' | 'tractor_loan'
  sanctionAmount: number
  processingFee: number
  netReceived: number
  interestRate?: number // e.g. 8.5%
  loanPeriodYears?: number // e.g. 3
  emiFrequency: 'monthly' | 'yearly' | 'half_yearly'
  emiAmount?: number
  firstInstallmentDate: string
  dueDate: string
  totalPaidEMIs?: number
  remainingAmount?: number
}

export interface OtherIncomeDetails {
  incomeSubtype: 'wage' | 'subsidy' | 'insurance_claim' | 'interest' | 'commission' | 'tractor_rent' | 'implements_rent' | 'water_sale' | 'saplings_sale' | 'seeds_sale' | 'organic_manure_sale' | 'other'
  customCategoryName?: string
  sourceParty?: string
  description?: string
}

export interface Transaction {
  id: string
  type: TransactionType
  ledgerType: LedgerType
  category: string
  amount: number
  date: string
  paymentMode?: PaymentMode
  billNumber?: string
  dueDate?: string
  pendingAmount?: number
  payments?: PaymentRecord[]
  cropId?: string
  cropName?: string
  cropSeason?: string
  cropYear?: string
  plotId?: string
  plotName?: string
  partyName?: string
  partyId?: string
  notes?: string
  items?: string
  gstAmount?: number
  attachment?: BillAttachment
  voiceNoteUrl?: string
  
  // Module 6 & 6A additions
  incomeCategory?: IncomeCategory
  cropSaleDetails?: CropSaleDetails
  dairyDetails?: DairyIncomeDetails
  loanDetails?: LoanDetails
  otherIncomeDetails?: OtherIncomeDetails
  isAutoGenerated?: boolean
  parentTransactionId?: string
  autoEntryType?: 'crop_gross_income' | 'hamali_expense' | 'transport_expense' | 'other_deduction_expense' | 'loan_outstanding' | 'processing_fee_expense' | 'dairy_income' | 'other_income'
  grossAmount?: number
  totalDeductions?: number

  // Module 8 Additions: Audit Trail & Locking
  isEdited?: boolean
  editDate?: string
  editedBy?: string
  editHistory?: EditHistoryRecord[]
  isLocked?: boolean // If from completed crop cycle

  status: 'pending' | 'synced'
  timestamp: string
}


