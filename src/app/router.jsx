import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthenticatedApp, LoginPage } from '@/features/auth/auth.jsx'
import { OverviewPage } from '@/features/overview/overview-page.jsx'
import { SetupPage } from '@/features/setup/setup-page.jsx'

export function AppRouter() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<AuthenticatedApp />}>
        <Route index element={<OverviewPage />} />
        <Route path="setup" element={<SetupPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
