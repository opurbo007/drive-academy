'use client'
import { useState, useEffect } from 'react'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) { setInstalled(true); return }
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); setTimeout(() => setShow(true), 3000) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => { setInstalled(true); setShow(false) })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setShow(false); setDeferredPrompt(null)
  }

  if (!show || installed) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 px-4 py-3 fade-in"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', maxWidth: 440, margin: '0 auto', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
      <span style={{ fontSize: 22 }}>🚗</span>
      <div style={{ flex: 1 }}>
        <div className="font-condensed font-bold text-sm tracking-wide" style={{ color: 'var(--text)' }}>Install Drive Academy</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Add to home screen for quick access</div>
      </div>
      <button onClick={() => setShow(false)} className="font-condensed text-xs px-2 py-1"
        style={{ color: 'var(--muted)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>✕</button>
      <button onClick={handleInstall} className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-2"
        style={{ background: 'var(--accent)', color: '#000', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
        onMouseEnter={e => { e.target.style.background = '#ffc04d' }}
        onMouseLeave={e => { e.target.style.background = 'var(--accent)' }}>Install</button>
    </div>
  )
}

export function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    setOffline(!navigator.onLine)
    const off = () => setOffline(true)
    const on  = () => setOffline(false)
    window.addEventListener('offline', off)
    window.addEventListener('online', on)
    return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on) }
  }, [])

  if (!offline) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-50 text-center font-condensed font-bold text-xs tracking-widest uppercase py-2"
      style={{ background: 'rgba(224,60,60,0.92)', color: '#fff', backdropFilter: 'blur(4px)' }}>
      ⚡ Offline — showing cached data
    </div>
  )
}

export function UpdateToast() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // next-pwa / workbox fires this when a new SW is waiting
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setShow(true)
            }
          })
        })
      })
    }
  }, [])

  if (!show) return null
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 fade-in"
      style={{ background: 'var(--surface)', border: '1px solid rgba(245,166,35,0.4)', borderLeft: '3px solid var(--accent)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
      <div style={{ flex: 1 }}>
        <div className="font-condensed font-bold text-sm tracking-wide" style={{ color: 'var(--text)' }}>Update available</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Reload to get the latest version</div>
      </div>
      <button onClick={() => window.location.reload()}
        className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-2"
        style={{ background: 'var(--accent)', color: '#000', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => { e.target.style.background = '#ffc04d' }}
        onMouseLeave={e => { e.target.style.background = 'var(--accent)' }}>Reload</button>
    </div>
  )
}
