import React, { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Download, 
  Printer, 
  Share2, 
  Sparkles, 
  Crown, 
  CheckCircle2, 
  Calendar, 
  BookOpen, 
  TrendingUp, 
  TrendingDown, 
  Sprout, 
  Milk, 
  Users, 
  Landmark, 
  Filter, 
  ChevronRight, 
  ShieldCheck, 
  ExternalLink,
  Table,
  Check,
  Package,
  Boxes,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Archive
} from 'lucide-react'
import type { Transaction, ReportType, CustomLedger } from '@/shared/types/ledger'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import { usePlotStore } from '@/shared/hooks/usePlotStore'
import { useInventoryStore } from '@/shared/hooks/useInventoryStore'

interface ReportsHubViewProps {
  transactions: Transaction[]
  customLedgers: CustomLedger[]
}

export function ReportsHubView({
  transactions,
  customLedgers
}: ReportsHubViewProps) {
  const { i18n } = useTranslation()
  const isMr = i18n.language === 'mr'
  const { user, updateProfile } = useAuthStore()
  const { plots, crops } = usePlotStore()
  const { items: inventoryItems, consumptions: inventoryConsumptions, fetchInventory } = useInventoryStore()

  useEffect(() => {
    if (user?.mobileNumber) {
      fetchInventory(user.mobileNumber)
    }
  }, [user?.mobileNumber])

  // Selected Report Tab
  const [selectedReport, setSelectedReport] = useState<ReportType>('ledger')

  // Date Range Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1) // first of current month
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  // Membership status
  const isGold = user?.membershipType === 'gold'
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [shareFeedback, setShareFeedback] = useState<string | null>(null)

  // Report definitions
  const reportList: { id: ReportType; titleMr: string; titleEn: string; descMr: string; descEn: string; icon: any }[] = [
    {
      id: 'ledger',
      titleMr: 'सर्व खाती अहवाल (General Ledger)',
      titleEn: 'General Ledger Report',
      descMr: 'सर्व वैयक्तिक, शेती, पार्टी व सानुकूल खात्यांचा संपूर्ण हिशोब',
      descEn: 'Complete ledger of personal, agriculture, party & custom accounts',
      icon: BookOpen
    },
    {
      id: 'cash_book',
      titleMr: 'दैनिक रोख नोंदवही (Cash Book)',
      titleEn: 'Daily Cash Book',
      descMr: 'केवळ रोखीने (Cash) झालेले दैनंदिन जमा व खर्च व्यवहार',
      descEn: 'Daily cash income and expense transactions only',
      icon: Landmark
    },
    {
      id: 'bank_book',
      titleMr: 'बँक / UPI वही (Bank Book)',
      titleEn: 'Bank & UPI Book',
      descMr: 'बँक ट्रान्सफर, UPI आणि धनादेशाचे (Cheque) सर्व व्यवहार',
      descEn: 'All bank transfers, UPI and cheque transactions',
      icon: ExternalLink
    },
    {
      id: 'profit_loss',
      titleMr: 'नफा-तोटा पत्रक (P&L Statement)',
      titleEn: 'Profit & Loss Statement',
      descMr: 'उत्पन्न, प्रत्यक्ष व अप्रत्यक्ष खर्च व निव्वळ नफा अहवाल',
      descEn: 'Income, direct & indirect expenses, and net profit report',
      icon: Sparkles
    },
    {
      id: 'plot_report',
      titleMr: 'प्लॉटनिहाय अहवाल (Plot Report)',
      titleEn: 'Plot-Wise Report',
      descMr: 'प्रत्येक शेत गटातील खर्च, उत्पादन व नफ्याचा सविस्तर ताळेबंद',
      descEn: 'Detailed expenses, yield and profit per farm plot',
      icon: Sprout
    },
    {
      id: 'crop_report',
      titleMr: 'पिकनिहाय अहवाल (Crop Report)',
      titleEn: 'Crop-Wise Report',
      descMr: 'कांदा, सोयाबीन, ऊस, गहू इत्यादी पिकांचा स्वतंत्र ताळेबंद',
      descEn: 'Individual balance sheet per crop type',
      icon: Sprout
    },
    {
      id: 'dairy_report',
      titleMr: 'दूध व्यवसाय अहवाल (Dairy Report)',
      titleEn: 'Dairy Business Report',
      descMr: 'दूध विक्री, जनावरांचा चारा, औषधे व निव्वळ डेअरी नफा',
      descEn: 'Milk sales, cattle feed, medicines & net dairy profit',
      icon: Milk
    },
    {
      id: 'income_report',
      titleMr: 'उत्पन्न नोंदवही (Income Report)',
      titleEn: 'Income Only Report',
      descMr: 'शेतीमाल विक्री, अनुदान, मजुरी व इतर उत्पन्नाच्या नोंदी',
      descEn: 'Crop sales, subsidies, labor & other income records',
      icon: TrendingUp
    },
    {
      id: 'expense_report',
      titleMr: 'खर्च नोंदवही (Expense Report)',
      titleEn: 'Expense Only Report',
      descMr: 'शेती, डेअरी व वैयक्तिक खर्चांचे सविस्तर वर्गीकरण',
      descEn: 'Detailed categorization of farm, dairy & personal expenses',
      icon: TrendingDown
    },
    {
      id: 'party_loan_report',
      titleMr: 'पार्टी व कर्ज अहवाल (Party & Loans)',
      titleEn: 'Party & Loan Ledger',
      descMr: 'कृषी केंद्र, बँक कर्जे, सावकारी व इतर बाकीदारांचे खाते',
      descEn: 'Agri centers, bank loans, moneylenders & creditor accounts',
      icon: Users
    },
    {
      id: 'input_consumption',
      titleMr: 'साठा वापर अहवाल (Input Consumption)',
      titleEn: 'Input Consumption Report',
      descMr: 'प्लॉट व पिकांसाठी वापरलेली खते, बियाणे व औषधे आणि वास्तव खर्च',
      descEn: 'Fertilizers, seeds & pesticides used per plot and actual cost',
      icon: Boxes
    },
    {
      id: 'input_stock',
      titleMr: 'शिल्लक इनपुट साठा (Input Stock Report)',
      titleEn: 'Input Stock Report',
      descMr: 'शिल्लक खते, बियाणे, औषधे साठा आणि एकूण गोदाम मूल्यांकन',
      descEn: 'Remaining fertilizers, seeds, pesticide stock & warehouse valuation',
      icon: Package
    },
    {
      id: 'season_report',
      titleMr: 'हंगामनिहाय अहवाल (Season Wise Report)',
      titleEn: 'Season-Wise Agri Report',
      descMr: 'खरीप, रब्बी व उन्हाळी हंगामांनुसार शेतीचे उत्पन्न, खर्च व नफा',
      descEn: 'Kharif, Rabi & summer season income, expenses & profit',
      icon: Calendar
    },
  ]

  // Filtered transactions for the selected report & date range
  const filteredData = useMemo(() => {
    return transactions.filter((tx) => {
      const txDate = tx.date || tx.timestamp?.split('T')[0] || ''
      if (startDate && txDate < startDate) return false
      if (endDate && txDate > endDate) return false

      switch (selectedReport) {
        case 'cash_book':
          return tx.paymentMode === 'cash'
        case 'bank_book':
          return tx.paymentMode === 'bank' || tx.paymentMode === 'upi' || tx.paymentMode === 'cheque'
        case 'profit_loss':
          return true
        case 'plot_report':
          return !!tx.plotId || !!tx.plotName
        case 'crop_report':
          return !!tx.cropId || !!tx.cropName
        case 'dairy_report':
          return (
            tx.ledgerType === 'dairy' || 
            tx.incomeCategory === 'dairy' || 
            tx.category?.startsWith('dairy_')
          )
        case 'income_report':
          return tx.type === 'income'
        case 'expense_report':
          return tx.type === 'expense'
        case 'party_loan_report':
          return tx.ledgerType === 'party' || !!tx.partyName || tx.incomeCategory === 'loan'
        case 'ledger':
        default:
          return true
      }
    })
  }, [transactions, selectedReport, startDate, endDate])

  // Summary Metrics of filtered data
  const summary = useMemo(() => {
    let totalIn = 0
    let totalOut = 0
    filteredData.forEach((tx) => {
      const amt = Number(tx.amount) || 0
      if (tx.type === 'income') totalIn += amt
      else totalOut += amt
    })
    return {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      count: filteredData.length
    }
  }, [filteredData])

  // Filtered Inventory Consumptions
  const filteredConsumptions = useMemo(() => {
    return inventoryConsumptions.filter(c => {
      const cDate = c.issueDate || c.timestamp?.split('T')[0] || ''
      if (startDate && cDate < startDate) return false
      if (endDate && cDate > endDate) return false
      return true
    })
  }, [inventoryConsumptions, startDate, endDate])

  const totalConsumptionCost = useMemo(() => {
    return filteredConsumptions.reduce((sum, c) => sum + (c.totalCost || 0), 0)
  }, [filteredConsumptions])

  const totalStockValuation = useMemo(() => {
    return inventoryItems.reduce((sum, item) => sum + ((item.currentStock || 0) * (item.purchaseRate || 0)), 0)
  }, [inventoryItems])

  // Seasonal Agri Breakdown (Kharif, Rabi, Summer)
  const seasonBreakdown = useMemo(() => {
    const seasons = {
      kharif: { nameMr: 'खरीप हंगाम (Kharif)', nameEn: 'Kharif Season', period: 'जून ते ऑक्टोबर', income: 0, expense: 0 },
      rabi: { nameMr: 'रब्बी हंगाम (Rabi)', nameEn: 'Rabi Season', period: 'नोव्हेंबर ते फेब्रुवारी', income: 0, expense: 0 },
      summer: { nameMr: 'उन्हाळी / बारमाही (Summer)', nameEn: 'Summer / Annual', period: 'मार्च ते मे', income: 0, expense: 0 }
    }

    transactions.forEach(tx => {
      if (tx.ledgerType !== 'agriculture' && !tx.cropId) return
      const txDate = tx.date || tx.timestamp?.split('T')[0] || ''
      if (startDate && txDate < startDate) return
      if (endDate && txDate > endDate) return
      
      const month = new Date(txDate).getMonth() + 1
      const amt = Number(tx.amount) || 0

      let sKey: 'kharif' | 'rabi' | 'summer' = 'kharif'
      if (month >= 6 && month <= 10) {
        sKey = 'kharif'
      } else if (month >= 11 || month <= 2) {
        sKey = 'rabi'
      } else {
        sKey = 'summer'
      }

      if (tx.type === 'income') {
        seasons[sKey].income += amt
      } else {
        seasons[sKey].expense += amt
      }
    })

    return seasons
  }, [transactions, startDate, endDate])

  // CSV / Excel Export Handler
  const handleExportCSV = () => {
    if (selectedReport === 'input_consumption') {
      if (filteredConsumptions.length === 0) {
        alert(isMr ? 'या अहवालात कोणतीही माहिती उपलब्ध नाही.' : 'No consumption data to export.')
        return
      }
      const headers = ['ID', 'Date', 'Material Name', 'Plot', 'Crop', 'Quantity', 'Unit', 'Rate', 'Total Cost', 'Purpose']
      const rows = filteredConsumptions.map(c => [
        c.id,
        c.issueDate,
        `"${c.itemName.replace(/"/g, '""')}"`,
        `"${(c.plotName || '').replace(/"/g, '""')}"`,
        `"${(c.cropName || '').replace(/"/g, '""')}"`,
        c.quantity,
        c.unit,
        c.rate,
        c.totalCost,
        `"${(c.purpose || '').replace(/"/g, '""')}"`
      ])
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `FarmerLedger_Input_Consumption_${startDate}_to_${endDate}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    }

    if (selectedReport === 'input_stock') {
      if (inventoryItems.length === 0) {
        alert(isMr ? 'कोणतीही साठा माहिती उपलब्ध नाही.' : 'No stock data to export.')
        return
      }
      const headers = ['ID', 'Item Name (मराठी)', 'Item Name (English)', 'Type', 'Available Stock', 'Unit', 'Purchase Rate', 'Total Valuation']
      const rows = inventoryItems.map(i => [
        i.id,
        `"${(i.nameMr || i.name).replace(/"/g, '""')}"`,
        `"${i.name.replace(/"/g, '""')}"`,
        i.type,
        i.currentStock || 0,
        i.unit,
        i.purchaseRate,
        (i.currentStock || 0) * (i.purchaseRate || 0)
      ])
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `FarmerLedger_Input_Stock_Report.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    }

    if (selectedReport === 'season_report') {
      const headers = ['Season', 'Period', 'Agri Income (₹)', 'Agri Expense (₹)', 'Net Profit (₹)']
      const rows = [
        ['Kharif (खरीप)', seasonBreakdown.kharif.period, seasonBreakdown.kharif.income, seasonBreakdown.kharif.expense, seasonBreakdown.kharif.income - seasonBreakdown.kharif.expense],
        ['Rabi (रब्बी)', seasonBreakdown.rabi.period, seasonBreakdown.rabi.income, seasonBreakdown.rabi.expense, seasonBreakdown.rabi.income - seasonBreakdown.rabi.expense],
        ['Summer (उन्हाळी)', seasonBreakdown.summer.period, seasonBreakdown.summer.income, seasonBreakdown.summer.expense, seasonBreakdown.summer.income - seasonBreakdown.summer.expense]
      ]
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `FarmerLedger_Season_Report_${startDate}_to_${endDate}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    }

    if (filteredData.length === 0) {
      alert(isMr ? 'या अहवालात कोणतीही माहिती उपलब्ध नाही.' : 'No data to export.')
      return
    }

    const headers = [
      'ID',
      'Date (तारीख)',
      'Type (प्रकार)',
      'Ledger Type (खाते प्रकार)',
      'Category (प्रकार)',
      'Amount (रक्कम ₹)',
      'Payment Mode (पेमेंट प्रकार)',
      'Party / Merchant (पार्टी/व्यापारी)',
      'Plot (प्लॉट)',
      'Crop (पीक)',
      'Bill Number (बिल क्र.)',
      'Notes (टीप)'
    ]

    const rows = filteredData.map((tx) => [
      tx.id,
      tx.date || '',
      tx.type === 'income' ? 'Income (जमा)' : 'Expense (खर्च)',
      tx.ledgerType || '',
      tx.category || '',
      tx.amount || 0,
      tx.paymentMode || '',
      `"${(tx.partyName || '').replace(/"/g, '""')}"`,
      `"${(tx.plotName || '').replace(/"/g, '""')}"`,
      `"${(tx.cropName || '').replace(/"/g, '""')}"`,
      `"${(tx.billNumber || '').replace(/"/g, '""')}"`,
      `"${(tx.notes || '').replace(/"/g, '""')}"`
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `FarmerLedger_${selectedReport}_${startDate}_to_${endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Print / PDF Export Handler
  const handlePrintPDF = () => {
    window.print()
  }

  // WhatsApp Share Handler
  const handleShareWhatsApp = () => {
    const reportObj = reportList.find((r) => r.id === selectedReport)
    const reportTitle = isMr ? reportObj?.titleMr : reportObj?.titleEn

    let text = ''
    if (selectedReport === 'input_consumption') {
      text = 
`*🌱 FarmerLedger साठा वापर अहवाल*
━━━━━━━━━━━━━━━━━━
👤 *शेतकरी नाव:* ${user?.fullName || 'शेतकरी'}
📱 *मोबाईल:* ${user?.mobileNumber || ''}
📑 *अहवाल:* ${reportTitle}
🗓️ *कालावधी:* ${startDate} ते ${endDate}
━━━━━━━━━━━━━━━━━━
📦 *एकूण वापरलेला साठा खर्च:* ₹${totalConsumptionCost.toLocaleString()}
📝 *एकूण खत/औषध वापर नोंदी:* ${filteredConsumptions.length}
━━━━━━━━━━━━━━━━━━
_नोंद: Core Rule - शेतात वापर = प्रत्यक्ष शेती खर्च (Issue to Crop = Expense)_`
    } else if (selectedReport === 'input_stock') {
      text = 
`*📦 FarmerLedger शिल्लक इनपुट साठा अहवाल*
━━━━━━━━━━━━━━━━━━
👤 *शेतकरी नाव:* ${user?.fullName || 'शेतकरी'}
📱 *मोबाईल:* ${user?.mobileNumber || ''}
📑 *अहवाल:* ${reportTitle}
━━━━━━━━━━━━━━━━━━
💰 *गोदाम साठा एकूण मूल्यांकन:* ₹${totalStockValuation.toLocaleString()}
📦 *नोंदणीकृत इनपुट आयटम्स:* ${inventoryItems.length}
✅ *शिल्लक साठा उपलब्ध वस्तू:* ${inventoryItems.filter(i => (i.currentStock || 0) > 0).length}
━━━━━━━━━━━━━━━━━━
_नोंद: Core Rule - खरेदी ≠ खर्च (Purchase ≠ Expense, फक्त साठा वाढतो)_`
    } else if (selectedReport === 'season_report') {
      text = 
`*🌦️ FarmerLedger हंगामनिहाय अहवाल*
━━━━━━━━━━━━━━━━━━
👤 *शेतकरी नाव:* ${user?.fullName || 'शेतकरी'}
📱 *मोबाईल:* ${user?.mobileNumber || ''}
📑 *अहवाल:* ${reportTitle}
━━━━━━━━━━━━━━━━━━
🌾 *खरीप हंगाम नफा:* ₹${(seasonBreakdown.kharif.income - seasonBreakdown.kharif.expense).toLocaleString()} (जमा: ₹${seasonBreakdown.kharif.income}, खर्च: ₹${seasonBreakdown.kharif.expense})
🌱 *रब्बी हंगाम नफा:* ₹${(seasonBreakdown.rabi.income - seasonBreakdown.rabi.expense).toLocaleString()} (जमा: ₹${seasonBreakdown.rabi.income}, खर्च: ₹${seasonBreakdown.rabi.expense})
☀️ *उन्हाळी हंगाम नफा:* ₹${(seasonBreakdown.summer.income - seasonBreakdown.summer.expense).toLocaleString()} (जमा: ₹${seasonBreakdown.summer.income}, खर्च: ₹${seasonBreakdown.summer.expense})
━━━━━━━━━━━━━━━━━━`
    } else {
      text = 
`*📊 FarmerLedger आर्थिक अहवाल*
━━━━━━━━━━━━━━━━━━
👤 *शेतकरी नाव:* ${user?.fullName || 'शेतकरी'}
📱 *मोबाईल:* ${user?.mobileNumber || ''}
📑 *अहवाल:* ${reportTitle}
🗓️ *कालावधी:* ${startDate} ते ${endDate}
━━━━━━━━━━━━━━━━━━
💰 *एकूण जमा (Income):* ₹${summary.totalIn.toLocaleString()}
💸 *एकूण खर्च (Expense):* ₹${summary.totalOut.toLocaleString()}
📈 *निव्वळ शिल्लक / नफा:* ₹${summary.net.toLocaleString()}
📝 *एकूण नोंदी:* ${summary.count}
━━━━━━━━━━━━━━━━━━
_नोंद: हा अहवाल FarmerLedger ERP ॲपद्वारे स्वयंचलित तयार केला आहे._`
    }

    const encoded = encodeURIComponent(text)
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank')
  }

  // Native Web Share API Handler
  const handleNativeShare = async () => {
    const reportObj = reportList.find((r) => r.id === selectedReport)
    const reportTitle = isMr ? reportObj?.titleMr : reportObj?.titleEn

    const shareData = {
      title: `FarmerLedger - ${reportTitle}`,
      text: `FarmerLedger अहवाल: ${reportTitle} (${startDate} ते ${endDate}). एकूण जमा: ₹${summary.totalIn}, एकूण खर्च: ₹${summary.totalOut}, नफा: ₹${summary.net}`,
      url: window.location.href
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.log('Share canceled or failed:', err)
      }
    } else {
      handleShareWhatsApp()
    }
  }

  // Membership Toggle / Demo Upgrade Handler
  const handleToggleMembership = async () => {
    if (!user) return
    setIsUpgrading(true)
    try {
      const newType = isGold ? 'free' : 'gold'
      await updateProfile({ membershipType: newType })
      setShareFeedback(
        isMr 
          ? `खाते यशस्वीरित्या ${newType === 'gold' ? 'Gold' : 'Free'} मध्ये बदलले!`
          : `Account successfully switched to ${newType === 'gold' ? 'Gold' : 'Free'}!`
      )
      setTimeout(() => setShareFeedback(null), 3000)
    } catch (err: any) {
      console.error('Membership toggle failed:', err)
    } finally {
      setIsUpgrading(false)
    }
  }

  const activeReportMeta = reportList.find((r) => r.id === selectedReport)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Printable Watermarked Container for PDF Print */}
      <div className="hidden print:block mb-6 p-4 border-b-2 border-primary">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-primary">FarmerLedger ERP</h1>
            <p className="text-xs text-muted-foreground">शेतकरी आर्थिक व व्यवसाय व्यवस्थापन प्रणाली</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">{user?.fullName || 'शेतकरी'}</p>
            <p>{user?.mobileNumber}</p>
            <p className="text-[10px] text-muted-foreground">{new Date().toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-4 p-2 bg-muted/20 rounded-lg flex items-center justify-between text-xs font-bold">
          <span>{isMr ? activeReportMeta?.titleMr : activeReportMeta?.titleEn}</span>
          <span>कालावधी: {startDate} ते {endDate}</span>
        </div>
      </div>

      {/* Header & Membership Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>{isMr ? 'आर्थिक अहवाल व निर्यात (Reports & Export)' : 'Reports & Export'}</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            {isMr ? '१३ प्रमाणित आर्थिक अहवाल, PDF व CSV डाउनलोड आणि WhatsApp शेअरिंग' : '13 Certified financial reports, PDF/CSV download & WhatsApp sharing'}
          </p>
        </div>

        {/* Membership Pill & Switcher */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border ${
            isGold 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300' 
              : 'bg-muted/40 border-border/40 text-muted-foreground'
          }`}>
            <Crown className={`h-3.5 w-3.5 ${isGold ? 'text-amber-500 fill-amber-500' : ''}`} />
            <span>{isGold ? 'Gold Membership (सक्रिय)' : 'Free Membership'}</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleMembership}
            disabled={isUpgrading}
            className="rounded-xl h-8 text-[11px] font-bold border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300"
          >
            {isGold ? (isMr ? 'Free मध्ये बदला' : 'Switch to Free') : (isMr ? 'Gold मध्ये अपग्रेड करा' : 'Upgrade to Gold')}
          </Button>
        </div>
      </div>

      {shareFeedback && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{shareFeedback}</span>
        </div>
      )}

      {/* Gold vs Free Privileges Card */}
      {!isGold && (
        <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
              <Crown className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-amber-900 dark:text-amber-200">
                {isMr ? 'Free Membership चालू आहे' : 'Free Membership Active'}
              </h4>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                {isMr 
                  ? 'अमर्यादित PDF निर्यात, सर्व लेजर शेअरिंग व प्रगत अहवालांसाठी Gold मध्ये अपग्रेड करा.' 
                  : 'Upgrade to Gold for unlimited PDF exports, ledger exports & instant WhatsApp sharing.'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleToggleMembership}
            className="rounded-xl h-8 px-3 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0"
          >
            {isMr ? 'Gold अपग्रेड' : 'Upgrade Gold'}
          </Button>
        </Card>
      )}

      {/* Main 2-Column Grid: Left (13 Report Selector), Right (Preview, Filters & Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: 13 Reports Menu */}
        <div className="lg:col-span-4 space-y-1.5">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block px-1 mb-1">
            {isMr ? 'उपलब्ध अहवाल (13 Reports)' : 'Available Reports (13)'}
          </span>

          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
            {reportList.map((item) => {
              const Icon = item.icon
              const isSelected = selectedReport === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedReport(item.id)}
                  className={`w-full p-2.5 rounded-2xl text-left transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-primary shadow-xs font-bold'
                      : 'bg-card border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground'
                    }`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold truncate">
                        {isMr ? item.titleMr : item.titleEn}
                      </h5>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {isMr ? item.descMr : item.descEn}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Column: Report Parameters, Actions, KPIs & Table Preview */}
        <div className="lg:col-span-8 space-y-4">
          {/* Filter & Action Toolbar */}
          <Card className="rounded-2xl border-border/40 bg-card p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  {isMr ? 'कालावधी निवडा (Date Range) :' : 'Date Range :'}
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-border bg-background text-foreground text-xs font-semibold outline-none"
                />
                <span className="text-xs text-muted-foreground font-bold">{isMr ? 'ते' : 'to'}</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-border bg-background text-foreground text-xs font-semibold outline-none"
                />
              </div>

              {/* Export Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="rounded-xl h-8 px-2.5 text-xs font-bold gap-1 hover:bg-muted/60"
                  title="Download CSV"
                >
                  <Download className="h-3.5 w-3.5 text-primary" />
                  <span>CSV</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrintPDF}
                  className="rounded-xl h-8 px-2.5 text-xs font-bold gap-1 hover:bg-muted/60"
                  title="Print / Save as PDF"
                >
                  <Printer className="h-3.5 w-3.5 text-primary" />
                  <span>PDF</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleShareWhatsApp}
                  className="rounded-xl h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-xs"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>WhatsApp</span>
                </Button>
              </div>
            </div>

            {/* Selected Report Summary KPI Strip */}
            {selectedReport === 'input_consumption' ? (
              <div className="grid grid-cols-3 gap-3 pt-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block uppercase">
                    {isMr ? 'एकूण इनपुट वापर खर्च' : 'Total Material Cost'}
                  </span>
                  <span className="text-base font-black text-amber-700 dark:text-amber-300">
                    ₹{totalConsumptionCost.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/15">
                  <span className="text-[10px] font-bold text-primary block uppercase">
                    {isMr ? 'एकूण वापर नोंदी' : 'Total Issues'}
                  </span>
                  <span className="text-base font-black text-primary">
                    {filteredConsumptions.length}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                  <span className="text-[10px] font-bold text-emerald-600 block uppercase">
                    {isMr ? 'नियम: वापर = खर्च' : 'Issue = Real Cost'}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block truncate">
                    {isMr ? 'पिकाच्या खचात थेट समाविष्ट' : 'Directly Debited to Crop'}
                  </span>
                </div>
              </div>
            ) : selectedReport === 'input_stock' ? (
              <div className="grid grid-cols-3 gap-3 pt-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 block uppercase">
                    {isMr ? 'गोदाम साठा एकूण मूल्य' : 'Total Stock Valuation'}
                  </span>
                  <span className="text-base font-black text-indigo-700 dark:text-indigo-300">
                    ₹{totalStockValuation.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] font-bold text-emerald-600 block uppercase">
                    {isMr ? 'शिल्लक उपलब्ध वस्तू' : 'In Stock Items'}
                  </span>
                  <span className="text-base font-black text-emerald-600">
                    {inventoryItems.filter(i => (i.currentStock || 0) > 0).length} / {inventoryItems.length}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block uppercase">
                    {isMr ? 'नियम: खरेदी ≠ खर्च' : 'Purchase ≠ Expense'}
                  </span>
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block truncate">
                    {isMr ? 'केवळ साठ्यात वाढ' : 'Stock Asset Inward'}
                  </span>
                </div>
              </div>
            ) : selectedReport === 'season_report' ? (
              <div className="grid grid-cols-3 gap-3 pt-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] font-bold text-emerald-600 block uppercase">
                    {isMr ? 'खरीप निव्वळ नफा' : 'Kharif Net'}
                  </span>
                  <span className={`text-base font-black ${seasonBreakdown.kharif.income - seasonBreakdown.kharif.expense >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ₹{(seasonBreakdown.kharif.income - seasonBreakdown.kharif.expense).toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <span className="text-[10px] font-bold text-indigo-600 block uppercase">
                    {isMr ? 'रब्बी निव्वळ नफा' : 'Rabi Net'}
                  </span>
                  <span className={`text-base font-black ${seasonBreakdown.rabi.income - seasonBreakdown.rabi.expense >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                    ₹{(seasonBreakdown.rabi.income - seasonBreakdown.rabi.expense).toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] font-bold text-amber-600 block uppercase">
                    {isMr ? 'उन्हाळी निव्वळ नफा' : 'Summer Net'}
                  </span>
                  <span className={`text-base font-black ${seasonBreakdown.summer.income - seasonBreakdown.summer.expense >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                    ₹{(seasonBreakdown.summer.income - seasonBreakdown.summer.expense).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 pt-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                  <span className="text-[10px] font-bold text-emerald-600 block uppercase">
                    {isMr ? 'एकूण जमा (Income)' : 'Total Income'}
                  </span>
                  <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
                    ₹{summary.totalIn.toLocaleString()}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/15">
                  <span className="text-[10px] font-bold text-rose-600 block uppercase">
                    {isMr ? 'एकूण खर्च (Expense)' : 'Total Expense'}
                  </span>
                  <span className="text-base font-black text-rose-600">
                    ₹{summary.totalOut.toLocaleString()}
                  </span>
                </div>

                <div className={`p-2.5 rounded-xl border ${
                  summary.net >= 0 ? 'bg-primary/5 border-primary/15' : 'bg-destructive/5 border-destructive/15'
                }`}>
                  <span className={`text-[10px] font-bold block uppercase ${
                    summary.net >= 0 ? 'text-primary' : 'text-destructive'
                  }`}>
                    {isMr ? 'शिल्लक / निव्वळ नफा' : 'Net Balance / Profit'}
                  </span>
                  <span className={`text-base font-black ${
                    summary.net >= 0 ? 'text-primary' : 'text-destructive'
                  }`}>
                    {summary.net < 0 ? '-' : ''}₹{Math.abs(summary.net).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* Report Data Table Preview */}
          <Card className="rounded-2xl border-border/40 bg-card overflow-hidden shadow-xs">
            <div className="p-3 bg-muted/20 border-b border-border/30 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                {isMr ? activeReportMeta?.titleMr : activeReportMeta?.titleEn} {
                  selectedReport === 'input_consumption'
                    ? `(${filteredConsumptions.length} नोंदी)`
                    : selectedReport === 'input_stock'
                    ? `(${inventoryItems.length} वस्तू)`
                    : selectedReport === 'season_report'
                    ? `(३ हंगाम)`
                    : `(${filteredData.length} नोंदी)`
                }
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground">
                {isMr ? 'तपशीलवार नोंदवही' : 'Detailed Records'}
              </span>
            </div>

            <div className="overflow-x-auto max-h-[360px]">
              {selectedReport === 'input_consumption' ? (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/40 sticky top-0 z-10 text-[10px] font-black uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2.5 border-b border-border/30">{isMr ? 'दिनांक' : 'Date'}</th>
                      <th className="p-2.5 border-b border-border/30">{isMr ? 'खत / बियाणे / औषध' : 'Item'}</th>
                      <th className="p-2.5 border-b border-border/30">{isMr ? 'प्लॉट व पीक' : 'Plot & Crop'}</th>
                      <th className="p-2.5 border-b border-border/30 text-right">{isMr ? 'वापर मात्रा' : 'Qty'}</th>
                      <th className="p-2.5 border-b border-border/30 text-right">{isMr ? 'दर' : 'Rate'}</th>
                      <th className="p-2.5 border-b border-border/30 text-right">{isMr ? 'एकूण खर्च' : 'Cost'}</th>
                      <th className="p-2.5 border-b border-border/30">{isMr ? 'उद्देश / टीप' : 'Notes'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {filteredConsumptions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground italic">
                          {isMr ? 'या कालावधीत कोणताही साठा वापर नोंदवला गेलेला नाही.' : 'No consumption records found.'}
                        </td>
                      </tr>
                    ) : (
                      filteredConsumptions.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-2.5 whitespace-nowrap font-medium">{c.issueDate}</td>
                          <td className="p-2.5 whitespace-nowrap font-bold text-foreground">
                            {c.itemName}
                          </td>
                          <td className="p-2.5 whitespace-nowrap text-muted-foreground">
                            🌾 {c.cropName || '-'} ({c.plotName || '-'})
                          </td>
                          <td className="p-2.5 whitespace-nowrap text-right font-semibold">
                            {c.quantity} {c.unit}
                          </td>
                          <td className="p-2.5 whitespace-nowrap text-right text-muted-foreground">
                            ₹{c.rate}
                          </td>
                          <td className="p-2.5 whitespace-nowrap text-right font-bold text-rose-600">
                            ₹{c.totalCost.toLocaleString()}
                          </td>
                          <td className="p-2.5 whitespace-nowrap text-muted-foreground text-[11px] italic">
                            {c.purpose || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : selectedReport === 'input_stock' ? (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/40 sticky top-0 z-10 text-[10px] font-black uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2.5 border-b border-border/30">{isMr ? 'कृषी इनपुट वस्तू' : 'Item Name'}</th>
                      <th className="p-2.5 border-b border-border/30">{isMr ? 'प्रकार' : 'Type'}</th>
                      <th className="p-2.5 border-b border-border/30 text-right">{isMr ? 'शिल्लक साठा' : 'Stock'}</th>
                      <th className="p-2.5 border-b border-border/30 text-right">{isMr ? 'खरेदी दर' : 'Rate'}</th>
                      <th className="p-2.5 border-b border-border/30 text-right">{isMr ? 'एकूण मूल्यांकन' : 'Valuation'}</th>
                      <th className="p-2.5 border-b border-border/30 text-center">{isMr ? 'स्थिती' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {inventoryItems.map((i) => {
                      const val = (i.currentStock || 0) * (i.purchaseRate || 0)
                      const inStock = (i.currentStock || 0) > 0
                      return (
                        <tr key={i.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="font-bold block text-foreground">{i.nameMr || i.name}</span>
                            <span className="text-[10px] text-muted-foreground">{i.name}</span>
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-muted">
                              {i.type === 'fertilizer' ? (isMr ? 'खत' : 'Fertilizer') : i.type === 'seed' ? (isMr ? 'बियाणे' : 'Seed') : (isMr ? 'औषध' : 'Pesticide')}
                            </span>
                          </td>
                          <td className="p-2.5 whitespace-nowrap text-right font-black">
                            <span className={inStock ? 'text-foreground' : 'text-muted-foreground'}>
                              {i.currentStock || 0} {i.unit}
                            </span>
                          </td>
                          <td className="p-2.5 whitespace-nowrap text-right text-muted-foreground">
                            ₹{i.purchaseRate} / {i.unit}
                          </td>
                          <td className="p-2.5 whitespace-nowrap text-right font-bold text-emerald-600">
                            ₹{val.toLocaleString()}
                          </td>
                          <td className="p-2.5 whitespace-nowrap text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              inStock ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'
                            }`}>
                              {inStock ? (isMr ? 'उपलब्ध' : 'In Stock') : (isMr ? 'साठा संपला' : 'Out of Stock')}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : selectedReport === 'season_report' ? (
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['kharif', 'rabi', 'summer'] as const).map((sKey) => {
                    const s = seasonBreakdown[sKey]
                    const net = s.income - s.expense
                    const isProfitable = net >= 0
                    return (
                      <div key={sKey} className="rounded-2xl border p-4 bg-muted/20 border-border/40 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-border/30">
                          <div>
                            <h4 className="font-black text-sm text-foreground">{isMr ? s.nameMr : s.nameEn}</h4>
                            <span className="text-[10px] text-muted-foreground">{s.period}</span>
                          </div>
                          <Calendar className="h-4 w-4 text-primary" />
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{isMr ? 'शेती जमा (Income):' : 'Agri Income:'}</span>
                            <span className="font-bold text-emerald-600">₹{s.income.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{isMr ? 'शेती खर्च (Expense):' : 'Agri Expense:'}</span>
                            <span className="font-bold text-rose-600">₹{s.expense.toLocaleString()}</span>
                          </div>
                          <div className="pt-2 border-t border-border/30 flex justify-between items-center">
                            <span className="font-bold text-foreground">{isMr ? 'हंगाम नफा:' : 'Net Margin:'}</span>
                            <span className={`font-black text-sm ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isProfitable ? '+' : ''}₹{net.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/40 sticky top-0 z-10 text-[10px] font-black uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2.5 border-b border-border/30">{isMr ? 'तारीख' : 'Date'}</th>
                      <th className="p-2.5 border-b border-border/30">{isMr ? 'खाते / प्रकार' : 'Ledger / Cat'}</th>
                      <th className="p-2.5 border-b border-border/30">{isMr ? 'पार्टी / शेत' : 'Party / Plot'}</th>
                      <th className="p-2.5 border-b border-border/30">{isMr ? 'पेमेंट' : 'Mode'}</th>
                      <th className="p-2.5 border-b border-border/30 text-right">{isMr ? 'जमा (Income)' : 'Credit'}</th>
                      <th className="p-2.5 border-b border-border/30 text-right">{isMr ? 'खर्च (Expense)' : 'Debit'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                          {isMr ? 'या कालावधीत कोणतीही नोंद आढळली नाही.' : 'No records found for this period.'}
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((tx) => (
                        <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-2.5 whitespace-nowrap font-medium">{tx.date}</td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="font-semibold block capitalize">{tx.category.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{tx.ledgerType}</span>
                          </td>
                          <td className="p-2.5 whitespace-nowrap text-muted-foreground">
                            {tx.partyName || tx.plotName || tx.cropName || '-'}
                          </td>
                          <td className="p-2.5 whitespace-nowrap uppercase text-[10px] font-bold">
                            {tx.paymentMode || 'cash'}
                          </td>
                          <td className="p-2.5 whitespace-nowrap text-right font-bold text-emerald-600">
                            {tx.type === 'income' ? `₹${Number(tx.amount).toLocaleString()}` : '-'}
                          </td>
                          <td className="p-2.5 whitespace-nowrap text-right font-bold text-rose-600">
                            {tx.type === 'expense' ? `₹${Number(tx.amount).toLocaleString()}` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Software Branding Footer (Required by Module 7) */}
            <div className="p-3 bg-muted/10 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                {isMr 
                  ? 'FarmerLedger ERP • कृषी व आर्थिक व्यवस्थापन प्रणाली' 
                  : 'FarmerLedger ERP • Farm & Financial Accounting Suite'}
              </span>
              <span>
                {isGold ? '⭐️ Gold Certified Report' : 'Free Standard Report'}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
