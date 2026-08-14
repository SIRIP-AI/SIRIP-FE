import { Route, Routes } from 'react-router-dom'

import { OverviewPage } from '@/features/overview/overview-page.jsx'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<OverviewPage />} />
    </Routes>
  )
}
