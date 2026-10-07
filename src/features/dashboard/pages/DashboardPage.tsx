import { useState, useEffect, useMemo } from 'react'
import { 
  TrendingUp, 
  Users, 
  Package, 
  RefreshCw, 
  Plus, 
  Loader2
} from 'lucide-react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/shared/hooks/useAppStore'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import { logger } from '@/shared/services/logger'
import { db, isMock } from '@/shared/services/firebase'
import { useTranslation } from 'react-i18next'
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc 
} from 'firebase/firestore'
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts'

interface LocalTransaction {
  id: string
  farmer: string
  crop: string
  amount: number
  status: 'pending' | 'synced'
  timestamp: string
}

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const selectedLanguage = i18n.language
  
  const { 
    isOnline, 
    syncQueueCount, 
    setSyncQueueCount 
  } = useAppStore()

  const { user } = useAuthStore()

  const [transactions, setTransactions] = useState<LocalTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [inventoryValue, setInventoryValue] = useState(0)
  const [inventoryCount, setInventoryCount] = useState(0)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalFarmer, setModalFarmer] = useState('')
  const [modalCrop, setModalCrop] = useState('Wheat')
  const [modalAmount, setModalAmount] = useState('')
  const [addingTx, setAddingTx] = useState(false)



  // Fetch transactions and inventory data
  useEffect(() => {
    if (!user) return

    setLoading(true)
    if (isMock) {
      // Mock Mode: read from localStorage
      const localTxs = localStorage.getItem(`farmer_txs_${user.mobileNumber}`)
      const txsList = localTxs ? JSON.parse(localTxs) : []
      setTransactions(txsList)
      setSyncQueueCount(txsList.filter((tx: any) => tx.status === 'pending').length)
      
      setInventoryValue(75000)
      setInventoryCount(5)
      setLoading(false)
    } else {
      // Real Mode: stream from Firestore users/{mobileNumber}/transactions
      const txsRef = collection(db as any, 'users', user.mobileNumber, 'transactions')
      const q = query(txsRef, orderBy('timestamp', 'desc'))
      
      const unsubscribeTxs = onSnapshot(q, { includeMetadataChanges: true },
        (snapshot) => {
          const txsList: LocalTransaction[] = []
          let pendingCount = 0
          snapshot.forEach((docSnap) => {
            const data = docSnap.data()
            const isPending = docSnap.metadata.hasPendingWrites
            if (isPending) pendingCount++
            txsList.push({
              id: docSnap.id,
              farmer: data.farmer || '',
              crop: data.crop || '',
              amount: Number(data.amount) || 0,
              status: isPending ? 'pending' : 'synced',
              timestamp: data.timestamp || new Date().toISOString()
            })
          })
          setTransactions(txsList)
          setSyncQueueCount(pendingCount)
          setLoading(false)
        },
        (err) => {
          logger.error('Failed to stream transactions', err)
          setLoading(false)
        }
      )

      // Stream inventory users/{mobileNumber}/inventory
      const invRef = collection(db as any, 'users', user.mobileNumber, 'inventory')
      const unsubscribeInv = onSnapshot(invRef, 
        (snapshot) => {
          let totalValue = 0
          snapshot.forEach((docSnap) => {
            const data = docSnap.data()
            const price = Number(data.price) || 0
            const quantity = Number(data.quantity) || 0
            totalValue += price * quantity
          })
          setInventoryValue(totalValue)
          setInventoryCount(snapshot.size)
        },
        (err) => {
          logger.error('Failed to stream inventory', err)
        }
      )

      return () => {
        unsubscribeTxs()
        unsubscribeInv()
      }
    }
  }, [user])



  // Create Transaction Submit
  const handleCreateTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !modalFarmer || !modalAmount) return

    setAddingTx(true)
    const amountNum = Number(modalAmount)
    const newTxData = {
      farmer: modalFarmer,
      crop: modalCrop,
      amount: amountNum,
      timestamp: new Date().toISOString()
    }

    if (isMock) {
      const newTx: LocalTransaction = {
        id: Math.random().toString(36).substring(7),
        ...newTxData,
        status: isOnline ? 'synced' : 'pending'
      }
      const updated = [newTx, ...transactions]
      setTransactions(updated)
      localStorage.setItem(`farmer_txs_${user.mobileNumber}`, JSON.stringify(updated))
      if (!isOnline) {
        setSyncQueueCount(syncQueueCount + 1)
      }
      logger.info('Mock transaction created locally', newTx)
      setAddingTx(false)
      setIsModalOpen(false)
      setModalFarmer('')
      setModalAmount('')
    } else {
      try {
        const txsRef = collection(db as any, 'users', user.mobileNumber, 'transactions')
        await addDoc(txsRef, newTxData)
        logger.info('Firestore transaction document written successfully')
        setAddingTx(false)
        setIsModalOpen(false)
        setModalFarmer('')
        setModalAmount('')
      } catch (err) {
        logger.error('Failed to create Firestore transaction', err)
        setAddingTx(false)
      }
    }
  }

  // Aggregate monthly trend data from transactions list for the chart
  const getChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const last6Months: Array<{ month: string; monthKey: string; revenue: number; transactions: number }> = []
    
    // Build list of last 6 months
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      last6Months.push({
        month: selectedLanguage === 'mr' ? t(months[d.getMonth()].toLowerCase()) : months[d.getMonth()],
        monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        revenue: 0,
        transactions: 0
      })
    }

    // Bin transactions into corresponding months
    transactions.forEach(tx => {
      const txDate = new Date(tx.timestamp)
      const txMonthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`
      
      const monthObj = last6Months.find(m => m.monthKey === txMonthKey)
      if (monthObj) {
        monthObj.revenue += tx.amount
        monthObj.transactions += 1
      }
    })

    return last6Months
  }

  const chartData = useMemo(() => getChartData(), [transactions, selectedLanguage])
  const totalRevenue = useMemo(() => transactions.reduce((acc, tx) => acc + tx.amount, 0), [transactions])
  const uniqueFarmers = useMemo(() => new Set(transactions.map(tx => tx.farmer)).size, [transactions])

  return (
    <div className="flex flex-col gap-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('dashboardTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('dashboardSubtitle')}</p>
        </div>


      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-2xl border-border/40 bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">{t('totalRevenue')}</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">₹{totalRevenue.toLocaleString()}</div>
                <p className="text-[10px] text-muted-foreground font-medium mt-1">
                  {transactions.length > 0 ? (
                    <>
                      <span className="text-emerald-500 font-bold">{transactions.length}</span> {t('recentLedger')}
                    </>
                  ) : (
                    <span>No transactions recorded</span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/40 bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">{t('activeFarmers')}</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">{uniqueFarmers}</div>
                <p className="text-[10px] text-muted-foreground font-medium mt-1">
                  <span>Unique farmer records</span>
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/40 bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">{t('inventoryValue')}</CardTitle>
                <Package className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">₹{inventoryValue.toLocaleString()}</div>
                <p className="text-[10px] text-muted-foreground font-medium mt-1">
                  <span className="text-indigo-500 font-bold">{inventoryCount}</span> {t('itemsInStock')}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/40 bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">{t('offlineQueue')}</CardTitle>
                <RefreshCw className={`h-4 w-4 ${syncQueueCount > 0 ? 'text-amber-500 animate-spin-slow' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">{syncQueueCount}</div>
                <p className="text-[10px] text-muted-foreground font-medium mt-1">
                  {syncQueueCount > 0 ? (
                    <span className="text-amber-500 font-bold">{t('awaitingInternet')}</span>
                  ) : (
                    <span className="text-emerald-500 font-bold">{t('allDataSynced')}</span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Charts & Recent Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Trend Chart */}
            <Card className="lg:col-span-2 rounded-2xl border-border/40 bg-card shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold text-foreground">{t('revenueTrend')}</CardTitle>
                <CardDescription className="text-xs">{t('revenueTrendDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="h-64 pl-0">
                {totalRevenue > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 55, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.2} />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                        tickFormatter={(val) => `₹${val.toLocaleString()}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--card)', 
                          borderColor: 'var(--border)', 
                          borderRadius: '12px',
                          fontSize: '11px',
                          color: 'var(--foreground)'
                        }}
                        formatter={(value) => [`₹${(value as number).toLocaleString()}`, 'Revenue']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="var(--primary)" 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    {t('noTransactions')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transactions ledger feed */}
            <Card className="rounded-2xl border-border/40 bg-card shadow-sm flex flex-col">
              <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">{t('recentLedger')}</CardTitle>
                  <CardDescription className="text-xs">{t('realTimeJournal')}</CardDescription>
                </div>
                {/* Add Transaction FAB */}
                <Button 
                  size="icon" 
                  onClick={() => setIsModalOpen(true)} 
                  className="h-8 w-8 rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-transform duration-200 bg-primary"
                  aria-label={t('addTransactionTitle')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto max-h-64 px-6 scrollbar-thin">
                {transactions.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center border-b border-border/20 last:border-0 pb-3 last:pb-0">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-foreground">{tx.farmer}</span>
                          <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                            {t(tx.crop.toLowerCase())} • {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-bold text-foreground">₹{tx.amount.toLocaleString()}</span>
                          {tx.status === 'pending' ? (
                            <span className="text-[9px] px-1.5 py-0.5 font-bold rounded bg-amber-500/10 text-amber-500 animate-pulse border border-amber-500/20">
                              {t('queued')}
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 font-bold rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              {t('synced')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">{t('noTransactions')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Add New Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-[380px] bg-card border border-border rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-foreground mb-4">
              {t('addTransactionTitle')}
            </h3>
            
            <form onSubmit={handleCreateTransactionSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t('farmerName')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={selectedLanguage === 'mr' ? 'उदा. संजय पाटील' : 'e.g. Ramesh Patel'}
                  value={modalFarmer}
                  onChange={e => setModalFarmer(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t('crop')}
                </label>
                <select
                  value={modalCrop}
                  onChange={e => setModalCrop(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                >
                  <option value="Wheat">{t('wheat')}</option>
                  <option value="Cotton">{t('cotton')}</option>
                  <option value="Soybean">{t('soybean')}</option>
                  <option value="Rice">{t('rice')}</option>
                  <option value="Sugarcane">{t('sugarcane')}</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t('amount')}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 15000"
                  value={modalAmount}
                  onChange={e => setModalAmount(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={addingTx}
                  onClick={() => setIsModalOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-semibold"
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={addingTx}
                  className="h-10 px-4 rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
                >
                  {addingTx ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>{t('save')}</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
