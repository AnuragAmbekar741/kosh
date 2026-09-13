import { BrowserRouter, Navigate, Route, Routes } from "react-router"

import { AppShell } from "@/components/layout/AppShell"
import { AuthPage } from "@/pages/auth/AuthPage"
import { OverviewPage } from "@/pages/overview/OverviewPage"
import { SpendingPage } from "@/pages/spending/SpendingPage"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route element={<Navigate replace to="/overview" />} path="/" />
          <Route element={<OverviewPage />} path="/overview" />
          <Route element={<SpendingPage />} path="/spending" />
        </Route>
        <Route element={<AuthPage />}>
          <Route element={<></>} path="/login" />
          <Route element={<></>} path="/signup" />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
