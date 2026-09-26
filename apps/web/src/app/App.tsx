import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router"

import { AppShell } from "@/components/layout/AppShell"
import { AuthPage } from "@/pages/auth/AuthPage"
import { OverviewPage } from "@/pages/overview/OverviewPage"
import { SpendingPage } from "@/pages/spending/SpendingPage"

function SpendingRedirect({
  view: requestedView,
}: {
  view?: "bills" | "items"
}) {
  const { search } = useLocation()
  const searchParams = new URLSearchParams(search)
  const view =
    requestedView ?? (searchParams.get("view") === "items" ? "items" : "bills")

  searchParams.delete("view")
  const nextSearch = searchParams.toString()

  return (
    <Navigate
      replace
      to={{
        pathname: `/spending/${view}`,
        search: nextSearch ? `?${nextSearch}` : "",
      }}
    />
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route element={<Navigate replace to="/overview" />} path="/" />
          <Route element={<OverviewPage />} path="/overview" />
          <Route path="/spending">
            <Route element={<SpendingRedirect />} index />
            <Route
              element={<SpendingRedirect view="bills" />}
              path="analytics"
            />
            <Route element={<SpendingPage />} path="bills" />
            <Route element={<SpendingPage />} path="items" />
          </Route>
        </Route>
        <Route element={<AuthPage />}>
          <Route path="/login" />
          <Route path="/signup" />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
