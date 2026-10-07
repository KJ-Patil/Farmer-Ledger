import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Package, Settings, Sun, Moon, Cloud, CloudOff, LogOut, Map } from 'lucide-react'
import { useThemeStore } from '@/shared/hooks/useTheme'
import { useAppStore } from '@/shared/hooks/useAppStore'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()
  const { isOnline, syncQueueCount } = useAppStore()
  const { user, signOut } = useAuthStore()
  const { t } = useTranslation()

  const navItems = [
    { label: 'Dashboard', translationKey: 'dashboardTitle', path: '/', icon: LayoutDashboard },
    { label: 'Plots', translationKey: 'plots', path: '/plots', icon: Map },
    { label: 'Ledger', translationKey: 'recentLedger', path: '/ledger', icon: BookOpen },
    { label: 'Inventory', translationKey: 'inventoryValue', path: '/inventory', icon: Package },
    { label: 'Settings', translationKey: 'settings', path: '/settings', icon: Settings },
  ]


  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const displayName = user?.fullName || "Farmer"
  const membershipLabel = user?.membershipType === 'gold' ? 'Gold Account' : 'Free Account'

  const getInitials = (name: string) => {
    if (!name) return 'F'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border/40 bg-background/80 backdrop-blur-md h-screen sticky top-0 px-4 py-6 justify-between select-none">
      <div className="flex flex-col gap-8">
        {/* Branding header */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md shadow-primary/20">
            F
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-none tracking-tight">FarmerLedger</h1>
            <span className="text-[10px] text-muted-foreground font-medium">ERP Suite</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                }`}
              >
                <Icon className={`h-[18px] w-[18px] transition-transform duration-200 ${isActive ? 'scale-105' : ''}`} />
                <span className="flex-1">{t(item.translationKey)}</span>
                {item.translationKey === 'dashboardTitle' && syncQueueCount > 0 && (
                  <span className="bg-primary/25 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                    {syncQueueCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-4">
        {/* Sync and Connection Banner */}
        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border border-border/20 rounded-xl">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Cloud className="h-4 w-4 text-emerald-500" />
                <span className="text-[11px] font-medium text-emerald-500">Connected</span>
              </>
            ) : (
              <>
                <CloudOff className="h-4 w-4 text-amber-500" />
                <span className="text-[11px] font-medium text-amber-500">Offline Mode</span>
              </>
            )}
          </div>
          {syncQueueCount > 0 && (
            <span className="text-[10px] font-semibold text-primary">
              {syncQueueCount} pending
            </span>
          )}
        </div>

        {/* Quick actions (Theme and Profile) */}
        <div className="flex items-center justify-between border-t border-border/40 pt-4">
          <Link to="/settings" className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-85 transition-all">
            {user?.profilePhoto ? (
              <img 
                src={user.profilePhoto} 
                alt="Profile" 
                className="w-9 h-9 rounded-full border border-border/40 object-cover shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0 select-none">
                {getInitials(displayName)}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">{displayName}</span>
              <span className="text-[10px] text-muted-foreground font-medium truncate">{membershipLabel}</span>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme} 
              className="rounded-lg h-8 w-8 hover:bg-accent/40 text-muted-foreground hover:text-foreground shrink-0"
            >
              {theme === 'light' ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleSignOut} 
              className="rounded-lg h-8 w-8 hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}
