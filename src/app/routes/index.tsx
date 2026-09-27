import { Routes, Route, Navigate } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { LedgerPage } from '@/features/ledger/pages/LedgerPage'
import { InventoryPage } from '@/features/inventory/pages/InventoryPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { PlotListPage } from '@/features/plots/pages/PlotListPage'
import { PlotDashboardPage } from '@/features/plots/pages/PlotDashboardPage'
import { CropDashboardPage } from '@/features/crops/pages/CropDashboardPage'


export function AppRoutes() {
  return (
    <Routes>
      {/* Public Guest Pages (only accessible when not logged in) */}
      <Route
        path="/login"
        element={
          <ProtectedRoute reverse>
            <LoginPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/register"
        element={
          <ProtectedRoute reverse>
            <RegisterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <ProtectedRoute reverse>
            <ForgotPasswordPage />
          </ProtectedRoute>
        }
      />

      {/* Protected App Pages (requires authentication) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <PageLayout>
              <DashboardPage />
            </PageLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ledger"
        element={
          <ProtectedRoute>
            <PageLayout>
              <LedgerPage />
            </PageLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <PageLayout>
              <InventoryPage />
            </PageLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <PageLayout>
              <SettingsPage />
            </PageLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/plots"
        element={
          <ProtectedRoute>
            <PageLayout>
              <PlotListPage />
            </PageLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/plots/:plotId"
        element={
          <ProtectedRoute>
            <PageLayout>
              <PlotDashboardPage />
            </PageLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/plots/:plotId/crops/:cropId"
        element={
          <ProtectedRoute>
            <PageLayout>
              <CropDashboardPage />
            </PageLayout>
          </ProtectedRoute>
        }
      />

      {/* Redirect all other routes back to Dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

