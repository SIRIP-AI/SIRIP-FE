import { Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/app-shell.jsx'
import { OverviewPage } from '@/features/overview/overview-page.jsx'
import { SetupPage } from '@/features/setup/setup-page.jsx'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<OverviewPage />} />
        <Route path="setup" element={<SetupPage />} />
      </Route>
    </Routes>
  )
}
