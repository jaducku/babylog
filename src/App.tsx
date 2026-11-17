import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/app-shell'
import { RecordSheetProvider } from '@/components/record-sheet'
import { Toaster } from '@/components/ui/sonner'
import { useAppState } from '@/data/store'
import { useApplyTheme } from '@/hooks/use-theme'
import { FamilyPage } from '@/pages/family'
import { GrowthPage } from '@/pages/growth'
import { HospitalPage } from '@/pages/hospital'
import { OnboardingPage } from '@/pages/onboarding'
import { TodayPage } from '@/pages/today'

export default function App() {
  useApplyTheme()
  const state = useAppState()
  const ready = state.babies.length > 0 && state.members.length > 0

  return (
    <BrowserRouter>
      <RecordSheetProvider>
        {ready ? (
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<TodayPage />} />
              <Route path="growth" element={<GrowthPage />} />
              <Route path="hospital" element={<HospitalPage />} />
              <Route path="family" element={<FamilyPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        ) : (
          <OnboardingPage />
        )}
        <Toaster />
      </RecordSheetProvider>
    </BrowserRouter>
  )
}
