import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/hooks/useAuthStore'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  reverse?: boolean // If true, only allow UNAUTHENTICATED users (e.g. for login/signup pages)
}

export function ProtectedRoute({ children, reverse = false }: ProtectedRouteProps) {
  const { user, initialized } = useAuthStore()

  // Display a premium loading spinner only during initial session hydration
  if (!initialized) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background gap-4 select-none">
        <div className="relative flex items-center justify-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <div className="absolute w-12 h-12 rounded-full border border-primary/20 animate-ping" />
        </div>
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          माहिती लोड होत आहे... (Loading Ledger Session)
        </p>
      </div>
    )
  }

  // Case 1: Route is protected (requires auth) but user is not logged in
  if (!reverse && !user) {
    return <Navigate to="/login" replace />
  }

  // Case 2: Route is for guests (login/register) but user is already logged in
  if (reverse && user) {
    return <Navigate to="/" replace />
  }

  // Else, allow access
  return <>{children}</>
}
