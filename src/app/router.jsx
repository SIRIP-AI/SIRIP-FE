import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/app-shell.jsx'
import { BatchesPage } from '@/features/batches/batches-page.jsx'
import { FishingTripsPage } from '@/features/batches/fishing-trips-page.jsx'
import { PlansPage } from '@/features/plans/plans-page.jsx'
import { ResourcesPage } from '@/features/resources/resources-page.jsx'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate replace to="/resources" />} />
        <Route path="batches" element={<BatchesPage />} />
        <Route path="fishing-trips" element={<FishingTripsPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="resources" element={<ResourcesPage />} />
      </Route>
    </Routes>
  )
}
