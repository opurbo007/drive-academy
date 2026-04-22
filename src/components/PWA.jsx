'use client'
import { useEffect, useState } from 'react'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => setShow(true), 3000)
    }

    const installedHandler = () => {
      setInstalled(true)
      setShow(false)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setShow(false)
    setDeferredPrompt(null)
  }

  if (!show || installed) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 px-4 py-3 fade-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', maxWidth: 460, margin: '0 auto', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
      <span className="font-condensed font-black text-lg" style={{ color: 'var(--accent)' }}>APP</span>
      <div style={{ flex: 1 }}>
        <div className="font-condensed font-bold text-sm tracking-wide" style={{ color: 'var(--text)' }}>Install Drive Academy</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Add it to the home screen for faster access.</div>
      </div>
      <button onClick={() => setShow(false)} className="font-condensed text-xs px-2 py-1" style={{ color: 'var(--muted)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
        X
      </button>
      <button onClick={handleInstall} className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-2" style={{ background: 'var(--accent)', color: '#000', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        Install
      </button>
    </div>
  )
}

export function UpdateToast() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
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
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex items-center gap-3 px-4 py-3 fade-in" style={{ background: 'var(--surface)', border: '1px solid rgba(245,166,35,0.4)', borderLeft: '3px solid var(--accent)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', maxWidth: 420 }}>
      <div style={{ flex: 1 }}>
        <div className="font-condensed font-bold text-sm tracking-wide" style={{ color: 'var(--text)' }}>Update available</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Reload to get the latest version.</div>
      </div>
      <button onClick={() => window.location.reload()} className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-2" style={{ background: 'var(--accent)', color: '#000', border: 'none', cursor: 'pointer' }}>
        Reload
      </button>
    </div>
  )
}
