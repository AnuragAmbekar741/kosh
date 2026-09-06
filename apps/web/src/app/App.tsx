import { BrowserRouter, Navigate, Route, Routes } from "react-router"

import { LoginPage } from "@/pages/auth/LoginPage"
import { SignupPage } from "@/pages/auth/SignupPage"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<LoginPage />} path="/login" />
        <Route element={<SignupPage />} path="/signup" />
        <Route element={<Navigate replace to="/login" />} path="/" />
      </Routes>
    </BrowserRouter>
  )
}

export default App
