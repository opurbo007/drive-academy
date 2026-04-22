'use client'
import { AuthProvider } from '@/hooks/useAuth'
import Navbar from './Navbar'
import { InstallPrompt, OfflineBanner, UpdateToast } from './PWA'

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <OfflineBanner />
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
      </div>
      <InstallPrompt />
      <UpdateToast />
    </AuthProvider>
  )
}
