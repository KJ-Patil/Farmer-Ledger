import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { MapPin, Plus, Loader2, Landmark, Layers, Droplets, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePlotStore } from '@/shared/hooks/usePlotStore'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import { AddPlotModal } from '../components/AddPlotModal'

export function PlotListPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const { plots, fetchPlots, loading } = usePlotStore()
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (user) {
      fetchPlots(user.mobileNumber)
    }
  }, [user, fetchPlots])

  const handleSuccess = () => {
    if (user) {
      fetchPlots(user.mobileNumber)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto select-none">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t('plotManagement')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {i18n.language === 'mr' 
              ? 'तुमच्या शेत जमिनींची नोंदणी करा आणि जलसिंचन/मातीचे रेकॉर्ड व्यवस्थापित करा.' 
              : 'Register and manage your farming plots, soil profiles, and water configurations.'}
          </p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl shadow-md shadow-primary/10 gap-1.5 h-11 px-5"
        >
          <Plus className="h-5 w-5" />
          <span className="font-semibold text-sm">{t('addPlot')}</span>
        </Button>
      </div>

      {loading && plots.length === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : plots.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {plots.map((plot) => (
            <Link key={plot.id} to={`/plots/${plot.id}`}>
              <Card className="rounded-2xl border-border/40 bg-card shadow-sm hover:shadow-md hover:border-primary/20 active:scale-[0.99] transition-all duration-200 overflow-hidden cursor-pointer flex flex-col h-full">
                <div className="h-3 bg-gradient-to-r from-emerald-500/10 to-primary/10" />
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        {plot.name || `${t('plots')} #${plot.gatNumber}`}
                      </CardTitle>
                      <CardDescription className="text-xs font-semibold mt-1 text-primary flex items-center gap-1">
                        <span>{plot.name ? `${t('gatNumber')}: ${plot.gatNumber} |` : ''}</span>
                        <span>{plot.area} {t(plot.areaUnit || 'acre')}</span>
                      </CardDescription>
                    </div>
                    {plot.location && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 py-1 px-2.5 rounded-full border border-emerald-500/15 flex items-center gap-1.5 shrink-0">
                        <MapPin className="h-3 w-3" /> GPS
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-2 border-t border-border/20 flex-1 flex flex-col justify-end gap-2.5 text-xs font-semibold">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>{t('soilType')}</span>
                    </span>
                    <span className="text-foreground">{t(`soil${plot.soilType}`)}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Droplets className="h-4 w-4 text-blue-500 shrink-0" />
                      <span>{t('irrigationType')}</span>
                    </span>
                    <span className="text-foreground">
                      {t(`irrigation${plot.irrigationType}`)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{t('waterAvailability')}</span>
                    </span>
                    <span className="text-foreground">
                      {t(plot.waterAvailability || 'perennial')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="rounded-2xl border-border/40 bg-card shadow-sm">
          <CardHeader className="text-center py-16">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 select-none">
              <Landmark className="h-6 w-6" />
            </div>
            <CardTitle>{t('plotManagement')}</CardTitle>
            <CardDescription className="max-w-md mx-auto mt-2 text-xs font-medium leading-relaxed">
              {t('noPlots')}
            </CardDescription>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="mt-6 rounded-xl h-10 px-5 text-xs font-bold"
            >
              {t('addPlot')}
            </Button>
          </CardHeader>
        </Card>
      )}

      <AddPlotModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
