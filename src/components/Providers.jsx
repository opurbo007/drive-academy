'use client'
import { AuthProvider } from '@/hooks/useAuth'
import Navbar from './Navbar'
import { InstallPrompt, OfflineBanner, SyncToast, UpdateToast } from './PWA'

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <OfflineBanner />
      <div className="min-h-screen app-shell">
        <Navbar />
        <main className="max-w-4xl mx-auto w-full px-4 py-5 sm:px-5 sm:py-8">
          {children}
        </main>
      </div>
      <InstallPrompt />
      <SyncToast />
      <UpdateToast />
    </AuthProvider>
  )
}
