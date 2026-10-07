import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Package, 
  Plus, 
  ShoppingCart, 
  TrendingDown, 
  Sprout, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  DollarSign, 
  Layers, 
  Filter, 
  Search, 
  ArrowRight, 
  Store, 
  ChevronRight, 
  X, 
  Check, 
  Sparkles, 
  Info,
  Beaker,
  FileText
} from 'lucide-react'
import { useInventoryStore } from '@/shared/hooks/useInventoryStore'
import { usePlotStore } from '@/shared/hooks/usePlotStore'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import type { 
  InventoryItem, 
  InventoryItemType, 
  InventoryUnit, 
  InventoryPurchase, 
  InventoryConsumption 
} from '@/shared/types/inventory'
import type { PaymentMode } from '@/shared/types/ledger'

export function InventoryPage() {
  const { i18n } = useTranslation()
  const isMr = i18n.language === 'mr'
  const { user } = useAuthStore()
  const { items, purchases, consumptions, fetchInventory, purchaseStock, issueStockToCrop, addCustomItem, loading } = useInventoryStore()
  const { plots, crops, fetchPlots, fetchCrops } = usePlotStore()

  // Tabs: 'stock' | 'purchases' | 'issues' | 'master'
  const [activeTab, setActiveTab] = useState<'stock' | 'purchases' | 'issues' | 'master'>('stock')

  // Modals state
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false)
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false)

  // Target item for quick actions
  const [selectedItemForAction, setSelectedItemForAction] = useState<InventoryItem | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  // Form States: Purchase
  const [purchaseItemId, setPurchaseItemId] = useState('')
  const [purchaseSupplier, setPurchaseSupplier] = useState('')
  const [purchaseQty, setPurchaseQty] = useState('')
  const [purchaseRate, setPurchaseRate] = useState('')
  const [purchasePaymentMode, setPurchasePaymentMode] = useState<PaymentMode>('credit')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [purchaseBillNumber, setPurchaseBillNumber] = useState('')
  const [purchaseNotes, setPurchaseNotes] = useState('')

  // Form States: Issue to Crop
  const [issueItemId, setIssueItemId] = useState('')
  const [issuePlotId, setIssuePlotId] = useState('')
  const [issueCropId, setIssueCropId] = useState('')
  const [issueQty, setIssueQty] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [issueNotes, setIssueNotes] = useState('')

  // Form States: Add Custom Item
  const [customNameMr, setCustomNameMr] = useState('')
  const [customNameEn, setCustomNameEn] = useState('')
  const [customType, setCustomType] = useState<InventoryItemType>('fertilizer')
  const [customUnit, setCustomUnit] = useState<InventoryUnit>('bag')
  const [customRate, setCustomRate] = useState('')
  const [customNotes, setCustomNotes] = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load Inventory & Plots on Mount
  useEffect(() => {
    if (user?.mobileNumber) {
      fetchInventory(user.mobileNumber)
      fetchPlots(user.mobileNumber)
    }
  }, [user?.mobileNumber, fetchInventory, fetchPlots])

  // Load crops for selected plot in issue modal
  useEffect(() => {
    if (user?.mobileNumber && issuePlotId) {
      fetchCrops(user.mobileNumber, issuePlotId)
    }
  }, [user?.mobileNumber, issuePlotId, fetchCrops])

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let totalStockValue = 0
    let totalItemsCount = items.length
    let inStockCount = 0
    let outOfStockCount = 0

    items.forEach((item) => {
      totalStockValue += item.totalValue || (item.currentStock * item.purchaseRate)
      if (item.currentStock > 0) inStockCount++
      else outOfStockCount++
    })

    let monthPurchasesTotal = 0
    const currentMonthStr = new Date().toISOString().substring(0, 7)
    purchases.forEach((p) => {
      if (p.date?.startsWith(currentMonthStr)) {
        monthPurchasesTotal += Number(p.totalAmount) || 0
      }
    })

    let monthIssuedTotal = 0
    consumptions.forEach((c) => {
      if (c.date?.startsWith(currentMonthStr)) {
        monthIssuedTotal += Number(c.totalExpense) || 0
      }
    })

    return {
      totalStockValue,
      totalItemsCount,
      inStockCount,
      outOfStockCount,
      monthPurchasesTotal,
      monthIssuedTotal
    }
  }, [items, purchases, consumptions])

  // Filtered Items for Live Stock Tab
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchType = filterType === 'all' || item.type === filterType
      const matchSearch = 
        !searchQuery.trim() || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.nameMr && item.nameMr.includes(searchQuery))
      return matchType && matchSearch
    })
  }, [items, filterType, searchQuery])

  // Quick Open Purchase Modal for Item
  const handleOpenPurchase = (item?: InventoryItem) => {
    setFormError(null)
    setFormSuccess(null)
    if (item) {
      setPurchaseItemId(item.id)
      setPurchaseRate(String(item.purchaseRate || ''))
    } else {
      setPurchaseItemId(items[0]?.id || '')
      setPurchaseRate(String(items[0]?.purchaseRate || ''))
    }
    setPurchaseQty('')
    setPurchaseSupplier('पांडुरंग कृषी सेवा केंद्र')
    setIsPurchaseModalOpen(true)
  }

  // Quick Open Issue Modal for Item
  const handleOpenIssue = (item?: InventoryItem) => {
    setFormError(null)
    setFormSuccess(null)
    if (item) {
      setIssueItemId(item.id)
    } else {
      setIssueItemId(items.find((i) => i.currentStock > 0)?.id || items[0]?.id || '')
    }
    setIssueQty('')
    setIssuePlotId(plots[0]?.id || '')
    setIsIssueModalOpen(true)
  }

  // Submit Purchase
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!user?.mobileNumber) return

    const selectedItem = items.find((i) => i.id === purchaseItemId)
    if (!selectedItem) {
      setFormError(isMr ? 'कृपया साठा वस्तू निवडा.' : 'Please select an item.')
      return
    }

    const qty = Number(purchaseQty)
    const rate = Number(purchaseRate)
    if (isNaN(qty) || qty <= 0 || isNaN(rate) || rate <= 0) {
      setFormError(isMr ? 'कृपया वैध प्रमाण आणि दर प्रविष्ट करा.' : 'Please enter valid quantity and rate.')
      return
    }

    setIsSubmitting(true)
    try {
      const totalAmount = qty * rate
      const resId = await purchaseStock(user.mobileNumber, {
        itemId: selectedItem.id,
        itemName: isMr ? selectedItem.nameMr || selectedItem.name : selectedItem.name,
        itemType: selectedItem.type,
        date: purchaseDate,
        supplierName: purchaseSupplier.trim() || 'कृषी सेवा केंद्र',
        quantity: qty,
        unit: selectedItem.unit,
        rate,
        totalAmount,
        paymentMode: purchasePaymentMode,
        billNumber: purchaseBillNumber.trim() || undefined,
        notes: purchaseNotes.trim() || undefined
      })

      if (resId) {
        setFormSuccess(
          isMr 
            ? `खरेदी यशस्वी! साठा +${qty} वाढला आणि पुरवठादार खात्यात नोंद झाली.` 
            : `Purchase recorded! Stock +${qty} added and supplier ledger updated.`
        )
        setTimeout(() => {
          setIsPurchaseModalOpen(false)
        }, 1200)
      }
    } catch (err: any) {
      setFormError(err.message || 'Purchase failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit Issue to Crop
  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!user?.mobileNumber) return

    const selectedItem = items.find((i) => i.id === issueItemId)
    if (!selectedItem) {
      setFormError(isMr ? 'कृपया साठा वस्तू निवडा.' : 'Please select an item.')
      return
    }

    const issueQuantity = Number(issueQty)
    if (isNaN(issueQuantity) || issueQuantity <= 0) {
      setFormError(isMr ? 'कृपया वैध प्रमाण प्रविष्ट करा.' : 'Please enter valid quantity.')
      return
    }

    if (selectedItem.currentStock < issueQuantity) {
      setFormError(
        isMr 
          ? `शिल्लक साठा अपुरा आहे! उपलब्ध: ${selectedItem.currentStock} ${selectedItem.unit}` 
          : `Insufficient stock! Available: ${selectedItem.currentStock} ${selectedItem.unit}`
      )
      return
    }

    const targetPlot = plots.find((p) => p.id === issuePlotId)
    const targetCrop = issuePlotId && crops[issuePlotId] 
      ? crops[issuePlotId].find((c) => c.id === issueCropId) 
      : undefined

    // Rule 2 & 3: Check if completed crop
    if (targetCrop && (targetCrop.status === 'completed' || targetCrop.isLocked)) {
      setFormError(
        isMr 
          ? 'हा पीक प्रकल्प पूर्ण (Completed) झाला असून लॉक आहे. मागील पिकात खत/बियाणे खर्च टाकता येणार नाही!' 
          : 'This crop cycle is completed and locked. Cannot issue materials to closed crops!'
      )
      return
    }

    setIsSubmitting(true)
    try {
      const totalExpense = issueQuantity * selectedItem.purchaseRate
      const resId = await issueStockToCrop(user.mobileNumber, {
        itemId: selectedItem.id,
        itemName: isMr ? selectedItem.nameMr || selectedItem.name : selectedItem.name,
        itemType: selectedItem.type,
        date: issueDate,
        plotId: issuePlotId,
        plotName: targetPlot ? `${targetPlot.plotName} (${targetPlot.area} ${targetPlot.areaUnit})` : 'शेत गट',
        cropId: targetCrop?.id,
        cropName: targetCrop ? `${targetCrop.cropType} (${targetCrop.variety})` : undefined,
        cropSeason: targetCrop?.season,
        quantity: issueQuantity,
        unit: selectedItem.unit,
        rate: selectedItem.purchaseRate,
        totalExpense,
        notes: issueNotes.trim() || undefined
      })

      if (resId) {
        setFormSuccess(
          isMr 
            ? `शेतात वापर यशस्वी! साठ्यातून -${issueQuantity} वजा होऊन पिकाच्या खर्चात ₹${totalExpense} जमा झाले.` 
            : `Stock issued to crop! ₹${totalExpense} posted to crop expense and plot ledger.`
        )
        setTimeout(() => {
          setIsIssueModalOpen(false)
        }, 1200)
      }
    } catch (err: any) {
      setFormError(err.message || 'Issue failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit Add Custom Item
  const handleSubmitCustomItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!user?.mobileNumber) return

    if (!customNameMr.trim()) {
      setFormError(isMr ? 'कृपया वस्तूचे नाव प्रविष्ट करा.' : 'Please enter item name.')
      return
    }

    const rate = Number(customRate)
    if (isNaN(rate) || rate < 0) {
      setFormError(isMr ? 'कृपया वैध खरेदी दर प्रविष्ट करा.' : 'Please enter valid rate.')
      return
    }

    setIsSubmitting(true)
    try {
      const resId = await addCustomItem(user.mobileNumber, {
        name: customNameEn.trim() || customNameMr.trim(),
        nameMr: customNameMr.trim(),
        type: customType,
        unit: customUnit,
        purchaseRate: rate,
        notes: customNotes.trim() || undefined
      })

      if (resId) {
        setFormSuccess(isMr ? 'नवीन वस्तू यशस्वीरित्या तयार केली!' : 'Custom item created!')
        setTimeout(() => {
          setIsAddItemModalOpen(false)
        }, 1000)
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to add item')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header & Principle Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2.5">
            <Package className="h-6 w-6 text-primary" />
            <span>{isMr ? 'कृषी साठा व इन्व्हेंटरी व्यवस्थापन' : 'Agriculture Inventory & Stock'}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isMr 
              ? 'खरेदी ≠ खर्च • प्रत्यक्ष शेतात वापर झाल्यावरच पिकाच्या खर्चात नोंद (Issue to Crop = Real Expense)' 
              : 'Purchase ≠ Expense • Real farm cost booked only when issued to plot & crop'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => handleOpenPurchase()}
            className="rounded-xl h-10 px-4 text-xs font-bold bg-primary text-primary-foreground gap-1.5 shadow-md shadow-primary/20"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>{isMr ? '+ खत / बियाणे खरेदी (Purchase)' : '+ Purchase Stock'}</span>
          </Button>

          <Button
            onClick={() => handleOpenIssue()}
            className="rounded-xl h-10 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-md shadow-emerald-600/20"
          >
            <Sprout className="h-4 w-4" />
            <span>{isMr ? 'शेतात वापर करा (Issue to Crop)' : 'Issue to Crop'}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setFormError(null)
              setFormSuccess(null)
              setCustomNameMr('')
              setCustomNameEn('')
              setCustomRate('')
              setIsAddItemModalOpen(true)
            }}
            className="rounded-xl h-10 px-3 text-xs font-bold gap-1 border-border/50 hover:bg-muted/40"
          >
            <Plus className="h-4 w-4 text-primary" />
            <span>{isMr ? 'नवीन वस्तू' : 'New Item'}</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total Stock Valuation */}
        <Card className="rounded-2xl border-primary/20 bg-primary/5 p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
              {isMr ? 'एकूण साठा मूल्य (Stock Value)' : 'Total Stock Value'}
            </span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-primary">
              ₹{summaryMetrics.totalStockValue.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {summaryMetrics.inStockCount} {isMr ? 'वस्तूंचा साठा उपलब्ध' : 'items currently in stock'}
            </span>
          </div>
        </Card>

        {/* Monthly Purchases (Inflow) */}
        <Card className="rounded-2xl border-blue-500/20 bg-blue-500/5 p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
              {isMr ? 'या महिन्याची खरेदी (Inflow)' : 'Monthly Purchases'}
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-blue-600">
              ₹{summaryMetrics.monthPurchasesTotal.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {isMr ? 'खरेदी साठ्यात जमा (Supplier Payable)' : 'Purchased into stock'}
            </span>
          </div>
        </Card>

        {/* Monthly Issued to Crops (Outflow / Real Expense) */}
        <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
              {isMr ? 'शेतात वापरलेला खर्च (Outflow)' : 'Issued to Crops'}
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Sprout className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-emerald-600">
              ₹{summaryMetrics.monthIssuedTotal.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {isMr ? 'पिकांच्या खचामध्ये थेट जमा' : 'Booked to crop P&L'}
            </span>
          </div>
        </Card>

        {/* Stock Health */}
        <Card className="rounded-2xl border-border/40 bg-card p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {isMr ? 'साठा स्थिती (Stock Status)' : 'Stock Health'}
            </span>
            <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-foreground">
              {summaryMetrics.totalItemsCount}
            </span>
            <span className="text-[10px] text-amber-600 font-bold block mt-0.5">
              {summaryMetrics.outOfStockCount} {isMr ? 'वस्तूंचा साठा संपला आहे' : 'items out of stock'}
            </span>
          </div>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-2xl border border-border/40 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('stock')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'stock'
              ? 'bg-card text-primary shadow-sm ring-1 ring-primary/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>{isMr ? 'शिल्लक साठा (Live Stock)' : 'Live Stock'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('purchases')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'purchases'
              ? 'bg-card text-blue-600 shadow-sm ring-1 ring-blue-600/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShoppingCart className="h-4 w-4 text-blue-600" />
          <span>{isMr ? 'खरेदी नोंदवही (Purchases)' : 'Purchase Register'}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-bold text-muted-foreground">
            {purchases.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('issues')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'issues'
              ? 'bg-card text-emerald-600 shadow-sm ring-1 ring-emerald-600/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sprout className="h-4 w-4 text-emerald-600" />
          <span>{isMr ? 'शेतात वापर नोंद (Issues)' : 'Material Issues'}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-bold text-muted-foreground">
            {consumptions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('master')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'master'
              ? 'bg-card text-amber-600 shadow-sm ring-1 ring-amber-600/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Beaker className="h-4 w-4 text-amber-600" />
          <span>{isMr ? 'इनपुट मास्टर (Catalog)' : 'Input Master'}</span>
        </button>
      </div>

      {/* Tab 1: Live Stock Table & Filter */}
      {activeTab === 'stock' && (
        <Card className="rounded-2xl border-border/40 bg-card overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border/30 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isMr ? 'खत, बियाणे किंवा औषध शोधा...' : 'Search item...'}
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-border bg-background text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold outline-none"
              >
                <option value="all">{isMr ? 'सर्व प्रकार (All Types)' : 'All Types'}</option>
                <option value="fertilizer">{isMr ? 'खते (Fertilizers)' : 'Fertilizers'}</option>
                <option value="seed">{isMr ? 'बियाणे (Seeds)' : 'Seeds'}</option>
                <option value="pesticide">{isMr ? 'औषधे (Pesticides)' : 'Pesticides'}</option>
              </select>
            </div>

            <span className="text-xs font-bold text-muted-foreground">
              {filteredItems.length} {isMr ? 'वस्तूंची यादी' : 'items'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/30 text-[10px] font-black uppercase text-muted-foreground border-b border-border/30">
                <tr>
                  <th className="p-3">{isMr ? 'वस्तूचे नाव' : 'Item Name'}</th>
                  <th className="p-3">{isMr ? 'प्रकार' : 'Type'}</th>
                  <th className="p-3 text-right">{isMr ? 'शिल्लक साठा' : 'Available Stock'}</th>
                  <th className="p-3 text-right">{isMr ? 'खरेदी दर (प्रति एकक)' : 'Rate / Unit'}</th>
                  <th className="p-3 text-right">{isMr ? 'एकूण मूल्य (₹)' : 'Stock Value'}</th>
                  <th className="p-3 text-center">{isMr ? 'कृती (Actions)' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                      {isMr ? 'कोणतीही साठा वस्तू आढळली नाही.' : 'No inventory items match search.'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3 font-bold text-foreground">
                        <span>{isMr ? item.nameMr || item.name : item.name}</span>
                        {item.isCustom && (
                          <span className="ml-2 text-[9px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold">
                            Custom
                          </span>
                        )}
                        {item.notes && (
                          <span className="text-[10px] text-muted-foreground block font-normal mt-0.5">
                            {item.notes}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                          item.type === 'fertilizer'
                            ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
                            : item.type === 'seed'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="p-3 text-right font-black">
                        <span className={item.currentStock > 0 ? 'text-foreground' : 'text-destructive'}>
                          {item.currentStock} {item.unit}
                        </span>
                      </td>
                      <td className="p-3 text-right text-muted-foreground font-semibold">
                        ₹{item.purchaseRate.toLocaleString()} / {item.unit}
                      </td>
                      <td className="p-3 text-right font-black text-primary">
                        ₹{(item.currentStock * item.purchaseRate).toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenPurchase(item)}
                            className="rounded-lg h-7 px-2 text-[11px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                          >
                            + {isMr ? 'खरेदी' : 'Buy'}
                          </Button>

                          <Button
                            size="sm"
                            disabled={item.currentStock <= 0}
                            onClick={() => handleOpenIssue(item)}
                            className="rounded-lg h-7 px-2 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40"
                          >
                            {isMr ? 'शेतात वापरा' : 'Issue'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2: Purchases Register */}
      {activeTab === 'purchases' && (
        <Card className="rounded-2xl border-border/40 bg-card overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border/30 bg-muted/10 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                {isMr ? 'खत व बियाणे खरेदी नोंदवही (Stock Inward Register)' : 'Purchase Register'}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isMr ? 'खरेदी केल्यावर साठा वाढतो व पुरवठादाराचे खाते अपडेट होते (खर्च मानला जात नाही)' : 'Purchases increase stock and update supplier accounts'}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => handleOpenPurchase()}
              className="rounded-xl h-8 px-3 text-xs font-bold bg-primary text-primary-foreground gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isMr ? 'नवीन खरेदी' : 'New Purchase'}</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/30 text-[10px] font-black uppercase text-muted-foreground border-b border-border/30">
                <tr>
                  <th className="p-3">{isMr ? 'तारीख' : 'Date'}</th>
                  <th className="p-3">{isMr ? 'वस्तू' : 'Item'}</th>
                  <th className="p-3">{isMr ? 'पुरवठादार / कृषी केंद्र' : 'Supplier'}</th>
                  <th className="p-3 text-right">{isMr ? 'प्रमाण' : 'Qty'}</th>
                  <th className="p-3 text-right">{isMr ? 'दर' : 'Rate'}</th>
                  <th className="p-3 text-right">{isMr ? 'एकूण रक्कम' : 'Total Amount'}</th>
                  <th className="p-3 text-center">{isMr ? 'पेमेंट प्रकार' : 'Payment'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground italic">
                      {isMr ? 'अद्याप कोणतीही खरेदी नोंद केलेली नाही.' : 'No purchases recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3 font-medium whitespace-nowrap">{p.date}</td>
                      <td className="p-3 font-bold text-foreground">{p.itemName}</td>
                      <td className="p-3 text-muted-foreground">{p.supplierName}</td>
                      <td className="p-3 text-right font-black">{p.quantity} {p.unit}</td>
                      <td className="p-3 text-right text-muted-foreground">₹{p.rate}</td>
                      <td className="p-3 text-right font-black text-foreground">₹{p.totalAmount.toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                          p.paymentMode === 'credit'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {p.paymentMode === 'credit' ? (isMr ? 'उधारी (Payable)' : 'Credit') : p.paymentMode}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Issues / Consumptions Register */}
      {activeTab === 'issues' && (
        <Card className="rounded-2xl border-border/40 bg-card overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border/30 bg-muted/10 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                {isMr ? 'शेतात वापर नोंदवही (Material Issue to Crop)' : 'Material Issue Register'}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isMr ? 'साठ्यातून वापर झाल्यावरच संबंधित प्लॉट व पिकाच्या खचामध्ये रक्कम जमा होते' : 'Materials consumed on plots/crops book actual farm expenses'}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => handleOpenIssue()}
              className="rounded-xl h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isMr ? 'शेतात वापरा' : 'Issue Material'}</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/30 text-[10px] font-black uppercase text-muted-foreground border-b border-border/30">
                <tr>
                  <th className="p-3">{isMr ? 'तारीख' : 'Date'}</th>
                  <th className="p-3">{isMr ? 'वापरलेली वस्तू' : 'Material Item'}</th>
                  <th className="p-3">{isMr ? 'प्लॉट / शेत गट' : 'Plot'}</th>
                  <th className="p-3">{isMr ? 'पीक' : 'Crop'}</th>
                  <th className="p-3 text-right">{isMr ? 'प्रमाण' : 'Issued Qty'}</th>
                  <th className="p-3 text-right">{isMr ? 'पिकाचा प्रत्यक्ष खर्च' : 'Expense Booked'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {consumptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                      {isMr ? 'अद्याप शेतात साठा वापरल्याची कोणतीही नोंद नाही.' : 'No material issues logged yet.'}
                    </td>
                  </tr>
                ) : (
                  consumptions.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3 font-medium whitespace-nowrap">{c.date}</td>
                      <td className="p-3 font-bold text-foreground">{c.itemName}</td>
                      <td className="p-3 text-muted-foreground">{c.plotName}</td>
                      <td className="p-3 text-muted-foreground font-semibold">
                        {c.cropName || '-'} {c.cropSeason ? `(${c.cropSeason})` : ''}
                      </td>
                      <td className="p-3 text-right font-black text-rose-600">
                        -{c.quantity} {c.unit}
                      </td>
                      <td className="p-3 text-right font-black text-primary">
                        ₹{c.totalExpense.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 4: Input Master Catalog & Custom Items */}
      {activeTab === 'master' && (
        <div className="space-y-4">
          <Card className="p-4 rounded-2xl border-border/40 bg-card flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-foreground">
                {isMr ? 'प्रमाणित कृषी इनपुट मास्टर (80% Preloaded Catalog)' : 'Preloaded Input Catalog'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isMr ? 'नेहमी लागणारी खते, बियाणे व औषधे आधीपासून उपलब्ध आहेत.' : 'Standard fertilizers, seeds, and pesticides.'}
              </p>
            </div>
            <Button
              onClick={() => {
                setFormError(null)
                setFormSuccess(null)
                setIsAddItemModalOpen(true)
              }}
              className="rounded-xl h-9 text-xs font-bold gap-1 bg-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              <span>{isMr ? '+ नवीन वस्तू तयार करा' : '+ Add Custom Item'}</span>
            </Button>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => (
              <Card key={item.id} className="rounded-2xl border-border/40 bg-card p-3.5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                      item.type === 'fertilizer'
                        ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                        : item.type === 'seed'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                    }`}>
                      {item.type}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {isMr ? 'एकक' : 'Unit'}: {item.unit}
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-foreground mt-2">
                    {isMr ? item.nameMr || item.name : item.name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {item.notes || '-'}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/30 mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-semibold">
                    दर: ₹{item.purchaseRate} / {item.unit}
                  </span>
                  <span className="font-bold text-primary">
                    शिल्लक: {item.currentStock} {item.unit}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modal 1: Purchase Stock Modal */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-card border border-border/60 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-black text-foreground">
                  {isMr ? 'खत / बियाणे साठा खरेदी' : 'Purchase Stock'}
                </h3>
              </div>
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleSubmitPurchase} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">
                  {isMr ? 'साठा वस्तू निवडा *' : 'Select Item *'}
                </label>
                <select
                  value={purchaseItemId}
                  onChange={(e) => {
                    setPurchaseItemId(e.target.value)
                    const itm = items.find((i) => i.id === e.target.value)
                    if (itm) setPurchaseRate(String(itm.purchaseRate || ''))
                  }}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold outline-none"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {isMr ? i.nameMr || i.name : i.name} ({i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">
                  {isMr ? 'पुरवठादार / कृषी केंद्र नाव *' : 'Supplier / Merchant Name *'}
                </label>
                <input
                  type="text"
                  value={purchaseSupplier}
                  onChange={(e) => setPurchaseSupplier(e.target.value)}
                  placeholder={isMr ? 'उदा. पांडुरंग कृषी सेवा केंद्र' : 'e.g. Pandurang Agro'}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-foreground mb-1 block">
                    {isMr ? 'खरेदी प्रमाण (Qty) *' : 'Quantity *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(e.target.value)}
                    placeholder="10"
                    required
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-foreground mb-1 block">
                    {isMr ? 'दर प्रति एकक (Rate ₹) *' : 'Rate / Unit (₹) *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={purchaseRate}
                    onChange={(e) => setPurchaseRate(e.target.value)}
                    placeholder="400"
                    required
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold outline-none"
                  />
                </div>
              </div>

              {/* Total Calculation Preview */}
              {Number(purchaseQty) > 0 && Number(purchaseRate) > 0 && (
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs font-black text-blue-700 dark:text-blue-300">
                  <span>{isMr ? 'एकूण खरेदी रक्कम :' : 'Total Amount :'}</span>
                  <span>₹{(Number(purchaseQty) * Number(purchaseRate)).toLocaleString()}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-foreground mb-1 block">
                    {isMr ? 'पेमेंट प्रकार *' : 'Payment Mode *'}
                  </label>
                  <select
                    value={purchasePaymentMode}
                    onChange={(e) => setPurchasePaymentMode(e.target.value as PaymentMode)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold outline-none"
                  >
                    <option value="credit">{isMr ? 'उधारी (Payable)' : 'Credit (Due)'}</option>
                    <option value="cash">{isMr ? 'रोख (Cash)' : 'Cash'}</option>
                    <option value="upi">UPI</option>
                    <option value="bank">{isMr ? 'बँक ट्रान्सफर' : 'Bank Transfer'}</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-foreground mb-1 block">
                    {isMr ? 'तारीख *' : 'Date *'}
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl h-9 text-xs font-bold"
                >
                  {isMr ? 'रद्द करा' : 'Cancel'}
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl h-9 px-4 text-xs font-bold bg-primary text-primary-foreground gap-1"
                >
                  <Check className="h-4 w-4" />
                  <span>{isSubmitting ? (isMr ? 'जतन होत आहे...' : 'Saving...') : (isMr ? 'खरेदी जतन करा' : 'Save Purchase')}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Issue Stock to Crop Modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-card border border-border/60 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <Sprout className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-black text-foreground">
                  {isMr ? 'साठ्यातून शेतात वापर (Issue to Crop)' : 'Issue Stock to Crop'}
                </h3>
              </div>
              <button
                onClick={() => setIsIssueModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleSubmitIssue} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">
                  {isMr ? 'वापरायची वस्तू *' : 'Material Item *'}
                </label>
                <select
                  value={issueItemId}
                  onChange={(e) => setIssueItemId(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold outline-none"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id} disabled={i.currentStock <= 0}>
                      {isMr ? i.nameMr || i.name : i.name} — शिल्लक: {i.currentStock} {i.unit} (दर: ₹{i.purchaseRate})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-foreground mb-1 block">
                    {isMr ? 'शेत गट / प्लॉट *' : 'Plot *'}
                  </label>
                  <select
                    value={issuePlotId}
                    onChange={(e) => setIssuePlotId(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold outline-none"
                  >
                    <option value="">{isMr ? '-- प्लॉट निवडा --' : '-- Select Plot --'}</option>
                    {plots.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.plotName} ({p.area} {p.areaUnit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-foreground mb-1 block">
                    {isMr ? 'चालू पीक (Running Crop) *' : 'Running Crop *'}
                  </label>
                  <select
                    value={issueCropId}
                    onChange={(e) => setIssueCropId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold outline-none"
                  >
                    <option value="">{isMr ? '-- पीक निवडा (ऐच्छिक) --' : '-- Select Crop --'}</option>
                    {issuePlotId && crops[issuePlotId]
                      ? crops[issuePlotId].map((c) => (
                          <option 
                            key={c.id} 
                            value={c.id}
                            disabled={c.status === 'completed' || c.isLocked}
                          >
                            {c.cropType} ({c.variety || c.season}) {c.status === 'completed' ? '🔒 Locked' : ''}
                          </option>
                        ))
                      : null}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-foreground mb-1 block">
                    {isMr ? 'वापरलेले प्रमाण *' : 'Issue Quantity *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={issueQty}
                    onChange={(e) => setIssueQty(e.target.value)}
                    placeholder="3"
                    required
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-foreground mb-1 block">
                    {isMr ? 'तारीख *' : 'Date *'}
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              {/* Expense Calculation Preview */}
              {Number(issueQty) > 0 && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center justify-between">
                    <span>{isMr ? 'पिकाच्या खचात जमा होणारी रक्कम :' : 'Crop Expense Booked :'}</span>
                    <span className="text-sm font-black">
                      ₹{((Number(issueQty) * (items.find((i) => i.id === issueItemId)?.purchaseRate || 0))).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground block mt-1">
                    {isMr 
                      ? '✓ साठ्यातून प्रमाण वजा होईल आणि पिकाच्या ताळेबंदात थेट खर्च नोंदवला जाईल.' 
                      : '✓ Auto-posts to plot & crop ledger and reduces available stock.'}
                  </span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsIssueModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl h-9 text-xs font-bold"
                >
                  {isMr ? 'रद्द करा' : 'Cancel'}
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  <Check className="h-4 w-4" />
                  <span>{isSubmitting ? (isMr ? 'नोंद होत आहे...' : 'Processing...') : (isMr ? 'शेतात वापरा (Confirm)' : 'Confirm Issue')}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Add Custom Item Modal */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-card border border-border/60 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-black text-foreground">
                  {isMr ? 'नवीन कृषी इनपुट वस्तू तयार करा' : 'Add Custom Farm Item'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddItemModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleSubmitCustomItem} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">
                  {isMr ? 'वस्तूचे नाव (मराठीत) *' : 'Item Name (Marathi) *'}
                </label>
                <input
                  type="text"
                  value={customNameMr}
                  onChange={(e) => setCustomNameMr(e.target.value)}
                  placeholder={isMr ? 'उदा. महाधन २४:२४:० किंवा सल्फर' : 'e.g. Sulphur 80% WDG'}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">
                  {isMr ? 'वस्तूचे नाव (इंग्रजीत - ऐच्छिक)' : 'Item Name (English - Optional)'}
                </label>
                <input
                  type="text"
                  value={customNameEn}
                  onChange={(e) => setCustomNameEn(e.target.value)}
                  placeholder="e.g. Mahadhan 24:24:0"
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-foreground mb-1 block">
                    {isMr ? 'प्रकार *' : 'Item Type *'}
                  </label>
                  <select
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value as InventoryItemType)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold outline-none"
                  >
                    <option value="fertilizer">{isMr ? 'खत (Fertilizer)' : 'Fertilizer'}</option>
                    <option value="seed">{isMr ? 'बियाणे (Seed)' : 'Seed'}</option>
                    <option value="pesticide">{isMr ? 'औषध (Pesticide)' : 'Pesticide'}</option>
                    <option value="other">{isMr ? 'इतर (Other)' : 'Other'}</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-foreground mb-1 block">
                    {isMr ? 'मोजमाप एकक *' : 'Unit *'}
                  </label>
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value as InventoryUnit)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold outline-none"
                  >
                    <option value="bag">{isMr ? 'गोणी (Bag)' : 'Bag'}</option>
                    <option value="kg">{isMr ? 'किलो (Kg)' : 'Kg'}</option>
                    <option value="liter">{isMr ? 'लिटर (Liter)' : 'Liter'}</option>
                    <option value="bottle">{isMr ? 'बाटली (Bottle)' : 'Bottle'}</option>
                    <option value="packet">{isMr ? 'पाकीट (Packet)' : 'Packet'}</option>
                    <option value="nos">{isMr ? 'नग (Nos)' : 'Nos'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">
                  {isMr ? 'साधारण खरेदी दर प्रति एकक (₹) *' : 'Default Purchase Rate (₹) *'}
                </label>
                <input
                  type="number"
                  step="any"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  placeholder="500"
                  required
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddItemModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl h-9 text-xs font-bold"
                >
                  {isMr ? 'रद्द करा' : 'Cancel'}
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl h-9 px-4 text-xs font-bold bg-primary text-primary-foreground gap-1"
                >
                  <Check className="h-4 w-4" />
                  <span>{isSubmitting ? (isMr ? 'तयार होत आहे...' : 'Saving...') : (isMr ? 'वस्तू जतन करा' : 'Save Item')}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
