import { create } from 'zustand'
import { db, isMock } from '@/shared/services/firebase'
import { logger } from '@/shared/services/logger'
import { collection, doc, addDoc, getDocs, updateDoc, query, orderBy } from 'firebase/firestore'
import { 
  type InventoryItem, 
  type InventoryPurchase, 
  type InventoryConsumption, 
  PRELOADED_INVENTORY_MASTER 
} from '../types/inventory'
import { useLedgerStore } from './useLedgerStore'

interface InventoryStoreState {
  items: InventoryItem[]
  purchases: InventoryPurchase[]
  consumptions: InventoryConsumption[]
  loading: boolean
  error: string | null

  fetchInventory: (mobileNumber: string) => Promise<void>
  addCustomItem: (mobileNumber: string, itemData: { name: string; nameMr: string; type: InventoryItem['type']; unit: InventoryItem['unit']; purchaseRate: number; notes?: string }) => Promise<string | null>
  purchaseStock: (mobileNumber: string, purchaseData: Omit<InventoryPurchase, 'id' | 'timestamp'>) => Promise<string | null>
  issueStockToCrop: (mobileNumber: string, consumptionData: Omit<InventoryConsumption, 'id' | 'timestamp' | 'linkedTransactionId'>) => Promise<string | null>
}

export const useInventoryStore = create<InventoryStoreState>((set, get) => ({
  items: [],
  purchases: [],
  consumptions: [],
  loading: false,
  error: null,

  fetchInventory: async (mobileNumber: string) => {
    if (!mobileNumber) return
    set({ loading: true, error: null })
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }

      if (isMock) {
        // LocalStorage Items
        const localItemsStr = localStorage.getItem(`farmer_inventory_items_${cleanMobile}`)
        let items: InventoryItem[] = []
        if (!localItemsStr) {
          // Initialize with 80% Preloaded Master items
          items = PRELOADED_INVENTORY_MASTER.map((m, idx) => ({
            ...m,
            id: `inv-master-${idx + 1}`,
            createdAt: new Date().toISOString()
          }))
          localStorage.setItem(`farmer_inventory_items_${cleanMobile}`, JSON.stringify(items))
        } else {
          items = JSON.parse(localItemsStr)
        }

        // LocalStorage Purchases
        const localPurchasesStr = localStorage.getItem(`farmer_inventory_purchases_${cleanMobile}`)
        const purchases: InventoryPurchase[] = localPurchasesStr ? JSON.parse(localPurchasesStr) : []

        // LocalStorage Consumptions
        const localConsumptionsStr = localStorage.getItem(`farmer_inventory_consumptions_${cleanMobile}`)
        const consumptions: InventoryConsumption[] = localConsumptionsStr ? JSON.parse(localConsumptionsStr) : []

        set({ items, purchases, consumptions, loading: false })
      } else {
        // Firestore Collections
        const itemsRef = collection(db as any, 'users', cleanMobile, 'inventory_items')
        const itemSnap = await getDocs(itemsRef)
        let items: InventoryItem[] = []
        itemSnap.forEach((d) => items.push({ id: d.id, ...d.data() } as InventoryItem))

        if (items.length === 0) {
          // Seed preloaded items in Firestore
          for (const m of PRELOADED_INVENTORY_MASTER) {
            const docRef = await addDoc(itemsRef, { ...m, createdAt: new Date().toISOString() })
            items.push({ ...m, id: docRef.id, createdAt: new Date().toISOString() })
          }
        }

        const purchasesRef = collection(db as any, 'users', cleanMobile, 'inventory_purchases')
        const purSnap = await getDocs(query(purchasesRef, orderBy('timestamp', 'desc')))
        const purchases: InventoryPurchase[] = []
        purSnap.forEach((d) => purchases.push({ id: d.id, ...d.data() } as InventoryPurchase))

        const consumptionsRef = collection(db as any, 'users', cleanMobile, 'inventory_consumptions')
        const conSnap = await getDocs(query(consumptionsRef, orderBy('timestamp', 'desc')))
        const consumptions: InventoryConsumption[] = []
        conSnap.forEach((d) => consumptions.push({ id: d.id, ...d.data() } as InventoryConsumption))

        set({ items, purchases, consumptions, loading: false })
      }
    } catch (err: any) {
      logger.error('Failed to fetch inventory', err)
      set({ error: err.message || 'Failed to load inventory', loading: false })
    }
  },

  addCustomItem: async (mobileNumber: string, itemData) => {
    if (!mobileNumber) return null
    set({ loading: true, error: null })
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }

      const timestamp = new Date().toISOString()
      const newItem: InventoryItem = {
        ...itemData,
        id: `inv-custom-${Date.now()}`,
        currentStock: 0,
        totalPurchased: 0,
        totalConsumed: 0,
        totalValue: 0,
        isCustom: true,
        createdAt: timestamp
      }

      if (isMock) {
        const updatedItems = [newItem, ...get().items]
        set({ items: updatedItems, loading: false })
        localStorage.setItem(`farmer_inventory_items_${cleanMobile}`, JSON.stringify(updatedItems))
        return newItem.id
      } else {
        const itemsRef = collection(db as any, 'users', cleanMobile, 'inventory_items')
        const { id, ...dataToSave } = newItem
        const docRef = await addDoc(itemsRef, dataToSave)
        const savedItem = { ...newItem, id: docRef.id }
        set({ items: [savedItem, ...get().items], loading: false })
        return docRef.id
      }
    } catch (err: any) {
      logger.error('Failed to add custom inventory item', err)
      set({ error: err.message || 'Failed to add item', loading: false })
      return null
    }
  },

  purchaseStock: async (mobileNumber: string, purchaseData) => {
    if (!mobileNumber) return null
    set({ loading: true, error: null })
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }

      const timestamp = new Date().toISOString()
      const purchaseId = `pur-${Date.now()}`
      const newPurchase: InventoryPurchase = {
        ...purchaseData,
        id: purchaseId,
        timestamp
      }

      // 1. Update Inventory Item Stock Count and Total Value
      const currentItems = get().items
      const targetItem = currentItems.find((i) => i.id === purchaseData.itemId)
      if (!targetItem) {
        throw new Error('Target inventory item not found')
      }

      const newStock = targetItem.currentStock + Number(purchaseData.quantity)
      const newTotalPurchased = (targetItem.totalPurchased || 0) + Number(purchaseData.quantity)
      const newRate = Number(purchaseData.rate) || targetItem.purchaseRate
      const newTotalVal = newStock * newRate

      const updatedItem: InventoryItem = {
        ...targetItem,
        currentStock: newStock,
        totalPurchased: newTotalPurchased,
        purchaseRate: newRate,
        totalValue: newTotalVal
      }

      const updatedItems = currentItems.map((i) => (i.id === targetItem.id ? updatedItem : i))

      // 2. Financial Auto-Posting Rule: Purchase ≠ Crop Expense!
      // Instead, if Credit: Supplier Payable in Party Ledger; if Cash: Cash Outflow in Cash Book
      const ledgerStore = useLedgerStore.getState()
      if (purchaseData.paymentMode === 'credit') {
        await ledgerStore.createTransaction(mobileNumber, {
          type: 'expense',
          ledgerType: 'party',
          category: 'कृषी इनपुट खरेदी (Stock In)',
          partyName: purchaseData.supplierName,
          amount: purchaseData.totalAmount,
          date: purchaseData.date,
          paymentMode: 'credit',
          pendingAmount: purchaseData.totalAmount,
          billNumber: purchaseData.billNumber,
          notes: `[साठा खरेदी / Stock Inward] ${purchaseData.itemName} (${purchaseData.quantity} ${purchaseData.unit} @ ₹${purchaseData.rate})`.trim()
        })
      } else {
        await ledgerStore.createTransaction(mobileNumber, {
          type: 'expense',
          ledgerType: 'personal',
          category: 'other_expense',
          amount: purchaseData.totalAmount,
          date: purchaseData.date,
          paymentMode: purchaseData.paymentMode,
          partyName: purchaseData.supplierName,
          notes: `[साठा खरेदी रोख / Stock Purchase] ${purchaseData.itemName} (${purchaseData.quantity} ${purchaseData.unit} @ ₹${purchaseData.rate})`.trim()
        })
      }

      // 3. Save to Store & Persistence
      if (isMock) {
        const updatedPurchases = [newPurchase, ...get().purchases]
        set({ items: updatedItems, purchases: updatedPurchases, loading: false })
        localStorage.setItem(`farmer_inventory_items_${cleanMobile}`, JSON.stringify(updatedItems))
        localStorage.setItem(`farmer_inventory_purchases_${cleanMobile}`, JSON.stringify(updatedPurchases))
        return purchaseId
      } else {
        // Firestore update
        const itemDocRef = doc(db as any, 'users', cleanMobile, 'inventory_items', targetItem.id)
        await updateDoc(itemDocRef, {
          currentStock: newStock,
          totalPurchased: newTotalPurchased,
          purchaseRate: newRate,
          totalValue: newTotalVal
        })

        const purchasesRef = collection(db as any, 'users', cleanMobile, 'inventory_purchases')
        const { id, ...dataToSave } = newPurchase
        const purDoc = await addDoc(purchasesRef, dataToSave)
        const savedPurchase = { ...newPurchase, id: purDoc.id }

        set({ items: updatedItems, purchases: [savedPurchase, ...get().purchases], loading: false })
        return purDoc.id
      }
    } catch (err: any) {
      logger.error('Failed to record stock purchase', err)
      set({ error: err.message || 'Failed to record purchase', loading: false })
      return null
    }
  },

  issueStockToCrop: async (mobileNumber: string, consumptionData) => {
    if (!mobileNumber) return null
    set({ loading: true, error: null })
    try {
      let cleanMobile = mobileNumber.replace(/\D/g, '')
      if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        cleanMobile = cleanMobile.substring(2)
      }

      const timestamp = new Date().toISOString()
      const consumptionId = `con-${Date.now()}`

      // 1. Verify and deduct Stock
      const currentItems = get().items
      const targetItem = currentItems.find((i) => i.id === consumptionData.itemId)
      if (!targetItem) {
        throw new Error('Target inventory item not found')
      }

      const issueQty = Number(consumptionData.quantity)
      if (targetItem.currentStock < issueQty) {
        throw new Error(`पुरेसा साठा उपलब्ध नाही! शिल्लक साठा: ${targetItem.currentStock} ${targetItem.unit}`)
      }

      const newStock = targetItem.currentStock - issueQty
      const newTotalConsumed = (targetItem.totalConsumed || 0) + issueQty
      const newTotalVal = newStock * targetItem.purchaseRate

      const updatedItem: InventoryItem = {
        ...targetItem,
        currentStock: newStock,
        totalConsumed: newTotalConsumed,
        totalValue: newTotalVal
      }

      const updatedItems = currentItems.map((i) => (i.id === targetItem.id ? updatedItem : i))

      // 2. Core Rule: Issue to Crop = Real Farm Expense!
      // Automatically post to Agriculture Expense, Plot Ledger, Crop Ledger & P&L!
      const ledgerStore = useLedgerStore.getState()
      let expenseCategory = 'other_agri_expense'
      if (consumptionData.itemType === 'fertilizer') expenseCategory = 'fertilizers'
      else if (consumptionData.itemType === 'seed') expenseCategory = 'seeds'
      else if (consumptionData.itemType === 'pesticide') expenseCategory = 'pesticides'

      const linkedTxId = await ledgerStore.postExpenseTransaction(mobileNumber, {
        ledgerType: 'agriculture',
        category: expenseCategory,
        amount: consumptionData.totalExpense,
        date: consumptionData.date,
        paymentMode: 'cash',
        plotId: consumptionData.plotId,
        plotName: consumptionData.plotName,
        cropId: consumptionData.cropId,
        cropName: consumptionData.cropName,
        cropSeason: consumptionData.cropSeason,
        notes: `[साठ्यातून वापर / Material Issue] ${consumptionData.itemName} (${consumptionData.quantity} ${consumptionData.unit} @ ₹${consumptionData.rate}). ${consumptionData.notes || ''}`.trim()
      })

      const newConsumption: InventoryConsumption = {
        ...consumptionData,
        id: consumptionId,
        linkedTransactionId: linkedTxId || undefined,
        timestamp
      }

      // 3. Save to Store & Persistence
      if (isMock) {
        const updatedConsumptions = [newConsumption, ...get().consumptions]
        set({ items: updatedItems, consumptions: updatedConsumptions, loading: false })
        localStorage.setItem(`farmer_inventory_items_${cleanMobile}`, JSON.stringify(updatedItems))
        localStorage.setItem(`farmer_inventory_consumptions_${cleanMobile}`, JSON.stringify(updatedConsumptions))
        return consumptionId
      } else {
        const itemDocRef = doc(db as any, 'users', cleanMobile, 'inventory_items', targetItem.id)
        await updateDoc(itemDocRef, {
          currentStock: newStock,
          totalConsumed: newTotalConsumed,
          totalValue: newTotalVal
        })

        const consumptionsRef = collection(db as any, 'users', cleanMobile, 'inventory_consumptions')
        const { id, ...dataToSave } = newConsumption
        const conDoc = await addDoc(consumptionsRef, dataToSave)
        const savedConsumption = { ...newConsumption, id: conDoc.id }

        set({ items: updatedItems, consumptions: [savedConsumption, ...get().consumptions], loading: false })
        return conDoc.id
      }
    } catch (err: any) {
      logger.error('Failed to record stock consumption', err)
      set({ error: err.message || 'Failed to issue stock', loading: false })
      return null
    }
  }
}))
