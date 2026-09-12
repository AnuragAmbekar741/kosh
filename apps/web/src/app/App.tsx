import { lazy, Suspense } from "react"
import { BrowserRouter, Route, Routes } from "react-router"

import { ApplicationShell } from "@/components/layout/ApplicationShell"
import { AuthPage } from "@/pages/auth/AuthPage"

const HomePage = lazy(() =>
  import("@/pages/home/HomePage").then((module) => ({
    default: module.HomePage,
  }))
)
const PaymentsPage = lazy(() =>
  import("@/pages/payments/PaymentsPage").then((module) => ({
    default: module.PaymentsPage,
  }))
)
const SettingsPage = lazy(() =>
  import("@/pages/settings/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  }))
)

export function App() {
  return (
    <Suspense fallback={<div className="min-h-svh bg-document-canvas" />}>
      <BrowserRouter>
        <Routes>
          <Route element={<ApplicationShell />}>
            <Route element={<HomePage />} path="/" />
            <Route element={<HomePage />} path="/documents/new" />
            <Route element={<PaymentsPage />} path="/payments" />
            <Route element={<SettingsPage />} path="/settings" />
          </Route>
          <Route element={<AuthPage />}>
            <Route element={<></>} path="/login" />
            <Route element={<></>} path="/signup" />
          </Route>
        </Routes>
      </BrowserRouter>
    </Suspense>
  )
}

export default App
