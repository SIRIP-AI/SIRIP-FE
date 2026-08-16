import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthenticatedApp, LoginPage, SignupPage } from '@/features/auth/auth.jsx'
import { BatchesPage } from '@/features/batches/batches-page.jsx'
import { FishingTripsPage } from '@/features/batches/fishing-trips-page.jsx'
import { OverviewPage } from '@/features/overview/overview-page.jsx'
import { PlansPage } from '@/features/plans/plans-page.jsx'
import { ResourcesPage } from '@/features/resources/resources-page.jsx'

export function AppRouter() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="signup" element={<SignupPage />} />
      <Route element={<AuthenticatedApp />}>
        <Route index element={<OverviewPage />} />
        <Route path="setup" element={<Navigate replace to="/resources" />} />
        <Route path="batches" element={<BatchesPage />} />
        <Route path="fishing-trips" element={<FishingTripsPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="resources" element={<ResourcesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
