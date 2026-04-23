'use client'
import { Suspense } from 'react'
import { AuthProvider } from '@/hooks/useAuth'
import Navbar from './Navbar'
import { InstallPrompt, UpdateToast } from './PWA'

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <div className="min-h-screen app-shell">
        <Suspense fallback={null}>
          <Navbar />
        </Suspense>
        <main className="max-w-md mx-auto w-full px-4 py-4 sm:px-5 sm:py-6">
          {children}
        </main>
      </div>
      <InstallPrompt />
      <UpdateToast />
    </AuthProvider>
  )
}
