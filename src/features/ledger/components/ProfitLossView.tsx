import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  Sprout, 
  Milk, 
  Calendar, 
  PieChart, 
  BarChart3, 
  MapPin, 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight, 
  Percent, 
  DollarSign, 
  Printer, 
  Share2, 
  CheckCircle2, 
  AlertTriangle,
  ChevronDown,
  Building2,
  Briefcase
} from 'lucide-react'
import type { Transaction, ProfitLossPeriodType } from '@/shared/types/ledger'
import { usePlotStore } from '@/shared/hooks/usePlotStore'

interface ProfitLossViewProps {
  transactions: Transaction[]
  onOpenMoneyInModal?: () => void
  onOpenMoneyOutModal?: () => void
}

export function ProfitLossView({
  transactions,
  onOpenMoneyInModal,
  onOpenMoneyOutModal
}: ProfitLossViewProps) {
  const { i18n } = useTranslation()
  const isMr = i18n.language === 'mr'
  const { plots, crops } = usePlotStore()

  // Active Period View
  const [periodType, setPeriodType] = useState<ProfitLossPeriodType>('monthly')

  // Selected filters for dimension views
  const [selectedPlotId, setSelectedPlotId] = useState<string>('all')
  const [selectedCropId, setSelectedCropId] = useState<string>('all')

  // Date constants
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const currentMonthPrefix = todayStr.substring(0, 7) // 'YYYY-MM'
  const currentYearPrefix = todayStr.substring(0, 4) // 'YYYY'

  // Indian Financial Year calculation (1 April - 31 March)
  const currentMonthNum = now.getMonth() + 1 // 1-12
  const currentYearNum = now.getFullYear()
  const fyStartYear = currentMonthNum >= 4 ? currentYearNum : currentYearNum - 1
  const fyEndYear = fyStartYear + 1
  const fyStartDate = `${fyStartYear}-04-01`
  const fyEndDate = `${fyEndYear}-03-31`
  const fyLabel = `FY ${fyStartYear}-${fyEndYear.toString().slice(-2)}`

  // Direct operating expense categories
  const directAgriCategories = new Set([
    'seeds', 'fertilizers', 'pesticides', 'labor', 'weeding', 'tractor',
    'irrigation', 'transport', 'packing', 'market_cost', 'hamali', 'harvesting_cost'
  ])
  const directDairyCategories = new Set([
    'dairy_fodder', 'dairy_medicines', 'veterinary_doctor', 'milk_collection', 'dairy_labor'
  ])

  // Filtered Transactions according to selected period / dimension
  const filteredTxs = useMemo(() => {
    return transactions.filter((tx) => {
      const txDate = tx.date || tx.timestamp?.split('T')[0] || ''

      switch (periodType) {
        case 'daily':
          return txDate === todayStr
        case 'monthly':
          return txDate.startsWith(currentMonthPrefix)
        case 'yearly':
          return txDate.startsWith(currentYearPrefix)
        case 'financial_year':
          return txDate >= fyStartDate && txDate <= fyEndDate
        case 'plot_wise':
          if (selectedPlotId === 'all') return !!tx.plotId
          return tx.plotId === selectedPlotId
        case 'crop_wise':
          if (selectedCropId === 'all') return !!tx.cropId
          return tx.cropId === selectedCropId
        case 'dairy':
          return (
            tx.ledgerType === 'dairy' || 
            tx.incomeCategory === 'dairy' || 
            tx.category.startsWith('dairy_') || 
            tx.autoEntryType === 'dairy_income'
          )
        case 'overall':
        default:
          return true
      }
    })
  }, [transactions, periodType, todayStr, currentMonthPrefix, currentYearPrefix, fyStartDate, fyEndDate, selectedPlotId, selectedCropId])

  // Comprehensive Double-Entry P&L Calculations
  const pnlData = useMemo(() => {
    let grossCropIncome = 0
    let dairyIncome = 0
    let otherIncome = 0

    let directExpenses = 0
    let indirectExpenses = 0

    const incomeCategoriesMap: Record<string, number> = {}
    const directExpensesMap: Record<string, number> = {}
    const indirectExpensesMap: Record<string, number> = {}

    filteredTxs.forEach((tx) => {
      const amt = Number(tx.amount) || 0

      if (tx.type === 'income') {
        if (tx.incomeCategory === 'crop_sale' || tx.autoEntryType === 'crop_gross_income' || tx.category === 'crop_sale') {
          grossCropIncome += amt
          incomeCategoriesMap['crop_sale'] = (incomeCategoriesMap['crop_sale'] || 0) + amt
        } else if (tx.incomeCategory === 'dairy' || tx.autoEntryType === 'dairy_income') {
          dairyIncome += amt
          incomeCategoriesMap['dairy'] = (incomeCategoriesMap['dairy'] || 0) + amt
        } else {
          otherIncome += amt
          const catKey = tx.category || 'other_income'
          incomeCategoriesMap[catKey] = (incomeCategoriesMap[catKey] || 0) + amt
        }
      } else if (tx.type === 'expense') {
        const isDirect = 
          directAgriCategories.has(tx.category) || 
          directDairyCategories.has(tx.category) ||
          tx.autoEntryType === 'hamali_expense' ||
          tx.autoEntryType === 'transport_expense'

        if (isDirect) {
          directExpenses += amt
          directExpensesMap[tx.category] = (directExpensesMap[tx.category] || 0) + amt
        } else {
          indirectExpenses += amt
          indirectExpensesMap[tx.category] = (indirectExpensesMap[tx.category] || 0) + amt
        }
      }
    })

    const totalIncome = grossCropIncome + dairyIncome + otherIncome
    const totalExpenses = directExpenses + indirectExpenses
    const grossProfit = totalIncome - directExpenses
    const netProfit = grossProfit - indirectExpenses
    const netMarginPercent = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0
    const grossMarginPercent = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0

    return {
      totalIncome,
      grossCropIncome,
      dairyIncome,
      otherIncome,
      directExpenses,
      indirectExpenses,
      totalExpenses,
      grossProfit,
      netProfit,
      grossMarginPercent,
      netMarginPercent,
      incomeCategoriesMap,
      directExpensesMap,
      indirectExpensesMap
    }
  }, [filteredTxs])

  const periodButtons: { id: ProfitLossPeriodType; labelMr: string; labelEn: string; icon: any }[] = [
    { id: 'daily', labelMr: 'दैनिक (Daily)', labelEn: 'Daily', icon: Calendar },
    { id: 'monthly', labelMr: 'मासिक (Monthly)', labelEn: 'Monthly', icon: Calendar },
    { id: 'yearly', labelMr: 'वार्षिक (Yearly)', labelEn: 'Yearly', icon: Calendar },
    { id: 'financial_year', labelMr: 'आर्थिक वर्ष (FY)', labelEn: 'Financial Year', icon: Building2 },
    { id: 'plot_wise', labelMr: 'प्लॉटनिहाय (Plot)', labelEn: 'Plot Wise', icon: MapPin },
    { id: 'crop_wise', labelMr: 'पिकनिहाय (Crop)', labelEn: 'Crop Wise', icon: Sprout },
    { id: 'dairy', labelMr: 'डेअरी (Dairy)', labelEn: 'Dairy', icon: Milk },
    { id: 'overall', labelMr: 'एकूण (Overall)', labelEn: 'Overall', icon: Layers },
  ]

  // Print P&L Statement Handler
  const handlePrintPnl = () => {
    window.print()
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Dimension Switcher Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            <span>{isMr ? 'नफा आणि तोटा पत्रक (Profit & Loss Engine)' : 'Profit & Loss Engine'}</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            {isMr 
              ? 'प्रमाणित दुहेरी नोंदीनुसार ढोबळ व निव्वळ नफा हिशोब' 
              : 'Certified Double-Entry Revenue, Gross & Net Farm Profit Statement'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrintPnl}
            className="rounded-xl h-9 text-xs font-bold gap-1.5 border-border/50 hover:bg-muted/60"
          >
            <Printer className="h-4 w-4 text-primary" />
            <span>{isMr ? 'प्रिंट / PDF' : 'Print / PDF'}</span>
          </Button>

          {onOpenMoneyInModal && (
            <Button
              type="button"
              size="sm"
              onClick={onOpenMoneyInModal}
              className="rounded-xl h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-sm"
            >
              <TrendingUp className="h-4 w-4" />
              <span>{isMr ? '+ उत्पन्न' : '+ Income'}</span>
            </Button>
          )}

          {onOpenMoneyOutModal && (
            <Button
              type="button"
              size="sm"
              onClick={onOpenMoneyOutModal}
              className="rounded-xl h-9 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1 shadow-sm"
            >
              <TrendingDown className="h-4 w-4" />
              <span>{isMr ? '+ खर्च' : '+ Expense'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* 8 Period Tabs Pill Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-2xl border border-border/40 overflow-x-auto">
        {periodButtons.map((btn) => {
          const Icon = btn.icon
          const isActive = periodType === btn.id
          return (
            <button
              key={btn.id}
              type="button"
              onClick={() => setPeriodType(btn.id)}
              className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                isActive
                  ? 'bg-card text-primary shadow-sm ring-1 ring-primary/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{isMr ? btn.labelMr : btn.labelEn}</span>
            </button>
          )
        })}
      </div>

      {/* Dimension Sub-Filters (Plot or Crop selector) */}
      {periodType === 'plot_wise' && (
        <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/40 flex items-center gap-3">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">{isMr ? 'शेत गट निवडा :' : 'Select Plot :'}</span>
          <select
            value={selectedPlotId}
            onChange={(e) => setSelectedPlotId(e.target.value)}
            className="h-8 px-3 rounded-lg border border-border bg-background text-foreground text-xs font-semibold outline-none"
          >
            <option value="all">{isMr ? 'सर्व शेत गट (All Plots)' : 'All Plots'}</option>
            {plots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.plotName} ({p.area} {p.areaUnit})
              </option>
            ))}
          </select>
        </div>
      )}

      {periodType === 'crop_wise' && (
        <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/40 flex items-center gap-3">
          <Sprout className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">{isMr ? 'पीक निवडा :' : 'Select Crop :'}</span>
          <select
            value={selectedCropId}
            onChange={(e) => setSelectedCropId(e.target.value)}
            className="h-8 px-3 rounded-lg border border-border bg-background text-foreground text-xs font-semibold outline-none"
          >
            <option value="all">{isMr ? 'सर्व पिके (All Crops)' : 'All Crops'}</option>
            {crops.map((c) => (
              <option key={c.id} value={c.id}>
                {c.cropName} {c.cropVariety ? `(${c.cropVariety})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* P&L Statement Header Badge */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/5 border border-primary/15">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-xs font-black text-primary uppercase tracking-wide">
            {periodType === 'daily' && (isMr ? `आजचा नफा-तोटा (${todayStr})` : `Today's P&L (${todayStr})`)}
            {periodType === 'monthly' && (isMr ? `चालू महिना (${currentMonthPrefix})` : `This Month (${currentMonthPrefix})`)}
            {periodType === 'yearly' && (isMr ? `कॅलेंडर वर्ष (${currentYearPrefix})` : `Calendar Year (${currentYearPrefix})`)}
            {periodType === 'financial_year' && (isMr ? `आर्थिक वर्ष (${fyLabel})` : `Financial Year (${fyLabel})`)}
            {periodType === 'plot_wise' && (isMr ? `शेत गटनिहाय हिशोब` : `Plot-wise P&L`)}
            {periodType === 'crop_wise' && (isMr ? `पिकानिहाय हिशोब` : `Crop-wise P&L`)}
            {periodType === 'dairy' && (isMr ? `दूध व्यवसाय नफा-तोटा` : `Dairy Business P&L`)}
            {periodType === 'overall' && (isMr ? `संपूर्ण शेती व्यवसाय एकत्रित` : `Overall Business Combined`)}
          </span>
        </div>
        <span className="text-[11px] font-bold text-muted-foreground">
          {filteredTxs.length} {isMr ? 'व्यवहार समाविष्ट' : 'transactions included'}
        </span>
      </div>

      {/* Key Financial KPIs 4-Card Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total Revenue */}
        <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
              {isMr ? 'एकूण उत्पन्न (Revenue)' : 'Total Revenue'}
            </span>
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">
              ₹{pnlData.totalIncome.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {isMr ? 'शेतीमाल + डेअरी + इतर' : 'Crops + Dairy + Other'}
            </span>
          </div>
        </Card>

        {/* Operating Direct Expenses */}
        <Card className="rounded-2xl border-amber-500/20 bg-amber-500/5 p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
              {isMr ? 'प्रत्यक्ष खर्च (Direct)' : 'Direct Expenses'}
            </span>
            <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
              <TrendingDown className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-amber-600">
              ₹{pnlData.directExpenses.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {isMr ? 'बियाणे, खते, मजुरी, चारा' : 'Seeds, Fert, Labor, Fodder'}
            </span>
          </div>
        </Card>

        {/* Gross Profit */}
        <Card className={`rounded-2xl p-4 flex flex-col justify-between shadow-xs border ${
          pnlData.grossProfit >= 0 ? 'border-primary/20 bg-primary/5' : 'border-destructive/20 bg-destructive/5'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              pnlData.grossProfit >= 0 ? 'text-primary' : 'text-destructive'
            }`}>
              {isMr ? 'ढोबळ नफा (Gross Profit)' : 'Gross Profit'}
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-background border border-border/40">
              {pnlData.grossMarginPercent.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2">
            <span className={`text-xl sm:text-2xl font-black ${
              pnlData.grossProfit >= 0 ? 'text-primary' : 'text-destructive'
            }`}>
              {pnlData.grossProfit < 0 ? '-' : ''}₹{Math.abs(pnlData.grossProfit).toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {isMr ? 'उत्पन्न वजा प्रत्यक्ष खर्च' : 'Revenue - Direct Cost'}
            </span>
          </div>
        </Card>

        {/* Net Farm Profit / Loss */}
        <Card className={`rounded-2xl p-4 flex flex-col justify-between shadow-sm border ${
          pnlData.netProfit >= 0 
            ? 'border-emerald-600/30 bg-emerald-600/10 ring-1 ring-emerald-600/20' 
            : 'border-destructive/30 bg-destructive/10 ring-1 ring-destructive/20'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider ${
              pnlData.netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'
            }`}>
              {pnlData.netProfit >= 0 
                ? isMr ? 'निव्वळ नफा (Net Profit)' : 'Net Profit' 
                : isMr ? 'निव्वळ तोटा (Net Loss)' : 'Net Loss'}
            </span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md text-white ${
              pnlData.netProfit >= 0 ? 'bg-emerald-600' : 'bg-destructive'
            }`}>
              {pnlData.netMarginPercent.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2">
            <span className={`text-2xl sm:text-3xl font-black ${
              pnlData.netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'
            }`}>
              {pnlData.netProfit < 0 ? '-' : ''}₹{Math.abs(pnlData.netProfit).toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {isMr ? 'अंतिम शुद्ध शेती नफा' : 'Final Clean Profit'}
            </span>
          </div>
        </Card>
      </div>

      {/* Certified Profit & Loss Statement Table */}
      <Card className="rounded-2xl border-border/40 bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/30 bg-muted/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
              {isMr ? 'प्रमाणित नफा-तोटा विवरण (Accounting Statement)' : 'Certified P&L Statement'}
            </h4>
          </div>
          <span className="text-[11px] font-bold text-muted-foreground">
            {isMr ? 'रक्कम (₹ INR)' : 'Amount (₹ INR)'}
          </span>
        </div>

        <div className="divide-y divide-border/20 text-xs">
          {/* 1. Revenue Section */}
          <div className="p-3.5 bg-muted/5">
            <div className="flex items-center justify-between font-black text-emerald-700 dark:text-emerald-400 mb-2">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                <span>{isMr ? 'अ. एकूण महसूल / उत्पन्न (Revenue)' : 'A. Total Farm Revenue'}</span>
              </span>
              <span className="text-sm">₹{pnlData.totalIncome.toLocaleString()}</span>
            </div>

            <div className="pl-6 space-y-1 text-muted-foreground font-medium">
              <div className="flex items-center justify-between">
                <span>{isMr ? '१. शेतीमाल विक्री (Crop Sales)' : '1. Crop Sales'}</span>
                <span className="font-semibold text-foreground">₹{pnlData.grossCropIncome.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{isMr ? '२. दूध व्यवसाय (Dairy Sales)' : '2. Dairy Sales'}</span>
                <span className="font-semibold text-foreground">₹{pnlData.dairyIncome.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{isMr ? '३. इतर उत्पन्न, मजुरी व अनुदान (Other & Subsidy)' : '3. Other & Subsidies'}</span>
                <span className="font-semibold text-foreground">₹{pnlData.otherIncome.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 2. Direct Costs Section */}
          <div className="p-3.5 bg-muted/5">
            <div className="flex items-center justify-between font-black text-amber-600 mb-2">
              <span className="flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4" />
                <span>{isMr ? 'ब. प्रत्यक्ष उत्पादन खर्च (Cost of Production - Direct)' : 'B. Direct Operating Costs'}</span>
              </span>
              <span className="text-sm">₹{pnlData.directExpenses.toLocaleString()}</span>
            </div>

            <div className="pl-6 space-y-1 text-muted-foreground font-medium">
              {Object.keys(pnlData.directExpensesMap).length === 0 ? (
                <span className="italic text-[11px] text-muted-foreground">
                  {isMr ? 'या कालावधीत कोणताही प्रत्यक्ष खर्च नाही.' : 'No direct expenses in this period.'}
                </span>
              ) : (
                Object.entries(pnlData.directExpensesMap).map(([catKey, val]) => (
                  <div key={catKey} className="flex items-center justify-between">
                    <span className="capitalize">{catKey.replace(/_/g, ' ')}</span>
                    <span className="font-semibold text-foreground">₹{val.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Gross Profit Subtotal Line */}
          <div className="p-3.5 bg-primary/5 flex items-center justify-between font-black text-primary">
            <span className="text-xs uppercase tracking-wider">
              {isMr ? 'क. ढोबळ नफा / Gross Profit (अ - ब)' : 'C. Gross Profit (A - B)'}
            </span>
            <span className="text-sm">
              {pnlData.grossProfit < 0 ? '-' : ''}₹{Math.abs(pnlData.grossProfit).toLocaleString()}
            </span>
          </div>

          {/* 3. Indirect Expenses Section */}
          <div className="p-3.5 bg-muted/5">
            <div className="flex items-center justify-between font-black text-muted-foreground mb-2">
              <span className="flex items-center gap-1.5">
                <Layers className="h-4 w-4" />
                <span>{isMr ? 'ड. अप्रत्यक्ष व इतर खर्च (Overhead / Indirect Expenses)' : 'D. Indirect & Overheads'}</span>
              </span>
              <span className="text-sm font-bold text-foreground">₹{pnlData.indirectExpenses.toLocaleString()}</span>
            </div>

            <div className="pl-6 space-y-1 text-muted-foreground font-medium">
              {Object.keys(pnlData.indirectExpensesMap).length === 0 ? (
                <span className="italic text-[11px] text-muted-foreground">
                  {isMr ? 'या कालावधीत कोणताही अप्रत्यक्ष खर्च नाही.' : 'No indirect expenses in this period.'}
                </span>
              ) : (
                Object.entries(pnlData.indirectExpensesMap).map(([catKey, val]) => (
                  <div key={catKey} className="flex items-center justify-between">
                    <span className="capitalize">{catKey.replace(/_/g, ' ')}</span>
                    <span className="font-semibold text-foreground">₹{val.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Net Profit Final Line */}
          <div className={`p-4 flex items-center justify-between font-black text-sm ${
            pnlData.netProfit >= 0 
              ? 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-300' 
              : 'bg-destructive/15 text-destructive'
          }`}>
            <div className="flex items-center gap-2">
              {pnlData.netProfit >= 0 ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              <span className="uppercase tracking-wider">
                {isMr ? 'ई. निव्वळ शेती नफा / तोटा (Net Farm Profit/Loss) (क - ड)' : 'E. Net Farm Profit / Loss (C - D)'}
              </span>
            </div>
            <span className="text-base sm:text-lg">
              {pnlData.netProfit < 0 ? '-' : ''}₹{Math.abs(pnlData.netProfit).toLocaleString()}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
