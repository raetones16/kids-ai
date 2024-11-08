// src/layouts/RootLayout.tsx
import { Outlet } from "react-router-dom"
import Header from "@/components/layout/Header"

const RootLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-screen-2xl p-4">
        <Outlet />
      </main>
    </div>
  )
}

export default RootLayout