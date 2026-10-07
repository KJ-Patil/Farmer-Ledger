import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Package, Settings, Map } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function BottomNav() {
  const location = useLocation()
  const { t } = useTranslation()

  const navItems = [
    { label: 'Dashboard', translationKey: 'dashboardTitle', path: '/', icon: LayoutDashboard },
    { label: 'Plots', translationKey: 'plots', path: '/plots', icon: Map },
    { label: 'Ledger', translationKey: 'recentLedger', path: '/ledger', icon: BookOpen },
    { label: 'Inventory', translationKey: 'inventoryValue', path: '/inventory', icon: Package },
    { label: 'Settings', translationKey: 'settings', path: '/settings', icon: Settings },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/80 pb-[env(safe-area-inset-bottom,16px)] pt-2 backdrop-blur-md md:hidden">
      <div className="flex h-12 justify-around items-center px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={t(item.translationKey)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-medium mt-1 tracking-wide">{t(item.translationKey)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
