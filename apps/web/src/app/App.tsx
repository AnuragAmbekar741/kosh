import { BrowserRouter, Route, Routes } from "react-router"

import { AuthPage } from "@/pages/auth/AuthPage"
import { HomePage } from "@/pages/home/HomePage"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<HomePage />} path="/" />
        <Route element={<HomePage />} path="/documents/new" />
        <Route element={<AuthPage />}>
          <Route element={<></>} path="/login" />
          <Route element={<></>} path="/signup" />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
