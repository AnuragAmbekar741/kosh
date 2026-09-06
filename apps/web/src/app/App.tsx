import { BrowserRouter, Route, Routes } from "react-router"

import { LoginPage } from "@/pages/auth/LoginPage"
import { SignupPage } from "@/pages/auth/SignupPage"
import { HomePage } from "@/pages/home/HomePage"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<HomePage />} path="/" />
        <Route element={<LoginPage />} path="/login" />
        <Route element={<SignupPage />} path="/signup" />
      </Routes>
    </BrowserRouter>
  )
}

export default App
