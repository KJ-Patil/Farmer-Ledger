import { type ReactNode, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { Cloud, CloudOff, Sun, Moon } from 'lucide-react'
import { useAppStore } from '@/shared/hooks/useAppStore'
import { useThemeStore } from '@/shared/hooks/useTheme'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import { Button } from '@/components/ui/button'

interface PageLayoutProps {
  children: ReactNode
}

export function PageLayout({ children }: PageLayoutProps) {
  const { isOnline, setOnline } = useAppStore()
  const { theme, toggleTheme } = useThemeStore()
  const { user } = useAuthStore()

  // Track online/offline status reactively
  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline])

  const displayName = user?.fullName || "Farmer"

  const getInitials = (name: string) => {
    if (!name) return 'F'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Sidebar for Desktop/Tablet */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Mobile Only */}
        <header className="flex md:hidden items-center justify-between px-4 py-3 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-40 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
              F
            </div>
            <span className="font-semibold text-sm tracking-tight">FarmerLedger</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Online/Offline Icon */}
            <div className="flex items-center">
              {isOnline ? (
                <Cloud className="h-4.5 w-4.5 text-emerald-500" />
              ) : (
                <CloudOff className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
              )}
            </div>

            {/* Theme Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme} 
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40"
            >
              {theme === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
            </Button>

            {/* User Profile */}
            <Link to="/settings" className="hover:opacity-80 transition-opacity">
              {user?.profilePhoto ? (
                <img 
                  src={user.profilePhoto} 
                  alt="Profile" 
                  className="w-7.5 h-7.5 rounded-full border border-border/40 object-cover"
                />
              ) : (
                <div className="w-7.5 h-7.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-[10px] select-none">
                  {getInitials(displayName)}
                </div>
              )}
            </Link>
          </div>
        </header>

        {/* Dynamic Warning Banner for Offline Mode */}
        {!isOnline && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-500 text-[11px] font-semibold py-1.5 px-4 text-center animate-fade-in">
            Working offline. All changes will be saved locally and synced automatically when back online.
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-x-hidden pb-20 md:pb-6 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNav />
    </div>
  )
}
