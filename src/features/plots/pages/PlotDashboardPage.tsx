import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sprout, Plus, Loader2, ArrowLeft, Layers, Droplets, MapPin, Calendar, Activity, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePlotStore } from '@/shared/hooks/usePlotStore'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import { AddCropModal } from '@/features/crops/components/AddCropModal'

export function PlotDashboardPage() {
  const { plotId } = useParams<{ plotId: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const { plots, crops, fetchPlots, fetchCrops, loading } = usePlotStore()
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (user) {
      if (plots.length === 0) {
        fetchPlots(user.mobileNumber)
      }
      if (plotId) {
        fetchCrops(user.mobileNumber, plotId)
      }
    }
  }, [user, plotId, plots.length, fetchPlots, fetchCrops])

  const activePlot = plots.find((p) => p.id === plotId)
  const plotCrops = plotId ? crops[plotId] || [] : []

  const activeCrops = plotCrops.filter((c) => c.status !== 'harvested')
  const occupiedArea = activeCrops.reduce((sum, c) => sum + (c.area || 0), 0)
  const remainingArea = activePlot ? activePlot.area - occupiedArea : 0

  const handleSuccess = () => {
    if (user && plotId) {
      fetchCrops(user.mobileNumber, plotId)
    }
  }

  if (loading && !activePlot) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!activePlot) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-center select-none">
        <p className="text-sm font-semibold text-muted-foreground">
          {i18n.language === 'mr' ? 'शेत गट सापडला नाही.' : 'Plot not found.'}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/plots')} className="rounded-xl">
          ← {i18n.language === 'mr' ? 'मागे जा' : 'Go Back'}
        </Button>
      </div>
    )
  }

  // Helper to color-code crop status badges
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'harvested':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15'
      case 'flowering':
        return 'bg-pink-500/10 text-pink-600 border-pink-500/15'
      case 'vegetative':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/15'
      case 'sown':
      default:
        return 'bg-amber-500/10 text-amber-600 border-amber-500/15'
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto select-none">
      {/* Top Navigation Back / Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate('/plots')}
            className="h-9 w-9 rounded-xl shrink-0"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>{activePlot.name || t('plotDashboard')}</span>
              <span className="text-primary font-extrabold text-xs bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                Gat #{activePlot.gatNumber}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {i18n.language === 'mr' ? 'या शेत गटाचे कल, पिके आणि नोंदी व्यवस्थापित करा.' : 'Track registered crop cycles and configure logs.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {remainingArea <= 0 && (
            <span className="text-xs text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl shrink-0 animate-pulse">
              ⚠️ {i18n.language === 'mr' ? 'जागा पूर्ण व्यापलेली आहे' : 'Area Fully Occupied'}
            </span>
          )}
          <Button 
            disabled={remainingArea <= 0}
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl shadow-md shadow-primary/10 gap-1.5 h-11 px-5 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Plus className="h-5 w-5" />
            <span className="font-semibold text-sm">{t('addCrop')}</span>
          </Button>
        </div>
      </div>

      {/* Plot Specifications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="md:col-span-1 rounded-2xl border-border/40 bg-card shadow-sm p-5 flex flex-col gap-4">
          <h3 className="text-xs font-bold text-foreground tracking-wider uppercase border-b border-border/20 pb-2">
            {t('plotDetails')}
          </h3>
          
          <div className="flex flex-col gap-3.5 text-xs font-semibold">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-500 shrink-0" />
                <span>{t('soilType')}</span>
              </span>
              <span className="text-foreground">{t(`soil${activePlot.soilType}`)}</span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-500 shrink-0" />
                <span>{t('irrigationType')}</span>
              </span>
              <span className="text-foreground">
                {t(`irrigation${activePlot.irrigationType}`)}
              </span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{t('waterAvailability')}</span>
              </span>
              <span className="text-foreground">
                {t(activePlot.waterAvailability || 'perennial')}
              </span>
            </div>

            <div className="flex flex-col gap-2 border-t border-border/20 pt-3">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary shrink-0" />
                  <span>{i18n.language === 'mr' ? 'एकूण क्षेत्रफळ' : 'Total Area'}</span>
                </span>
                <span className="text-foreground font-bold">
                  {activePlot.area} {t(activePlot.areaUnit || 'acre')}
                </span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground text-[11px] pl-6 font-medium">
                <span>{i18n.language === 'mr' ? 'वापरलेले क्षेत्र' : 'Occupied Area'}</span>
                <span className="text-amber-500 font-bold">
                  {occupiedArea.toFixed(2)} {t(activePlot.areaUnit || 'acre')}
                </span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground text-[11px] pl-6 font-medium">
                <span>{i18n.language === 'mr' ? 'शिल्लक क्षेत्र' : 'Available Area'}</span>
                <span className="text-primary font-extrabold">
                  {remainingArea.toFixed(2)} {t(activePlot.areaUnit || 'acre')}
                </span>
              </div>
            </div>

            {activePlot.location && (
              <div className="border-t border-border/20 pt-3 flex flex-col gap-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Coordinates</span>
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
                  {activePlot.location.latitude.toFixed(6)}, {activePlot.location.longitude.toFixed(6)}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Crops Cycle List */}
        <Card className="md:col-span-2 rounded-2xl border-border/40 bg-card shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-border/20">
            <CardTitle className="text-base font-bold text-foreground">
              {t('crops')}
            </CardTitle>
            <CardDescription className="text-xs font-semibold">
              {i18n.language === 'mr' ? 'सक्रिय आणि मागील पिकांचे चक्र व्यवस्थापित करा.' : 'List of crop cycles registered under this plot.'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1 p-4 overflow-y-auto max-h-[300px]">
            {plotCrops.length > 0 ? (
              <div className="flex flex-col gap-3">
                {plotCrops.map((crop) => (
                  <Link key={crop.id} to={`/plots/${plotId}/crops/${crop.id}`}>
                    <div className="flex justify-between items-center p-3.5 border border-border/40 rounded-xl hover:border-primary/20 active:scale-[0.99] transition-all bg-background/50 hover:bg-background/80 cursor-pointer">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Sprout className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-foreground truncate">
                            {t(crop.cropType.toLowerCase()) !== crop.cropType.toLowerCase() 
                              ? t(crop.cropType.toLowerCase()) 
                              : crop.cropType} ({crop.variety})
                          </span>
                          <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
                            <Activity className="h-3 w-3" />
                            <span>{t(`season${crop.season}`)}</span>
                            <span>•</span>
                            <span>{new Date(crop.sowingDate).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold py-1 px-2.5 rounded-full border shrink-0 ${getStatusColor(crop.status)}`}>
                        {t(crop.status)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 min-h-[180px]">
                <p className="text-xs text-muted-foreground font-semibold max-w-sm leading-relaxed">
                  {t('noCrops')}
                </p>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  size="sm"
                  className="mt-4 rounded-xl text-xs font-bold px-4 h-9"
                >
                  {t('addCrop')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddCropModal 
        isOpen={isModalOpen}
        plotId={plotId || ''}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
