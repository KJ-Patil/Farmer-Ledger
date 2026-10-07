import { type ReactNode } from 'react'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { guestLanguage, setGuestLanguage, error, clearError } = useAuthStore()
  const { t } = useTranslation()

  const toggleLanguage = () => {
    const nextLang = guestLanguage === 'mr' ? 'en' : 'mr'
    setGuestLanguage(nextLang)
    clearError()
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden px-4 py-8 select-none">
      {/* Premium Background Art with HSL gradients */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-background to-background" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Language Switcher */}
      <div className="absolute top-4 right-4 z-10 pt-[calc(env(safe-area-inset-top,0px))]">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          className="h-9 gap-2 rounded-lg font-medium text-xs border border-border bg-background hover:bg-accent/40 shadow-sm"
        >
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span>{guestLanguage === 'mr' ? 'English' : 'मराठी'}</span>
        </Button>
      </div>

      {/* Main Container Card */}
      <div className="w-full max-w-[440px] z-10 flex flex-col gap-6">
        {/* Branding */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg shadow-primary/20 scale-105 transition-transform">
            F
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{t('appName')}</h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{t('appSubtitle')}</p>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-destructive font-medium animate-shake">
            <AlertCircle className="h-[18px] w-[18px] shrink-0 mt-0.5" />
            <div className="flex-1">
              {t(error)}
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-xl shadow-foreground/[0.02]">
          {children}
        </div>
      </div>
      
    </div>
  )
}
