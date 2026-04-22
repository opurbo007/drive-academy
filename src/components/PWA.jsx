'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { flushAttendanceQueue, getPendingSyncCount, QUEUE_EVENT } from '@/lib/offlineSync'

function usePendingSyncCount() {
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    setPendingCount(getPendingSyncCount())
    const handler = (event) => setPendingCount(event.detail?.count ?? getPendingSyncCount())
    window.addEventListener(QUEUE_EVENT, handler)
    return () => window.removeEventListener(QUEUE_EVENT, handler)
  }, [])

  return pendingCount
}

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
        <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Add it to the home screen for faster access and offline support.</div>
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

export function OfflineBanner() {
  const [offline, setOffline] = useState(false)
  const pendingCount = usePendingSyncCount()

  useEffect(() => {
    setOffline(!navigator.onLine)
    const handleOffline = () => setOffline(true)
    const handleOnline = () => setOffline(false)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 text-center font-condensed font-bold text-xs tracking-widest uppercase py-2 px-3" style={{ background: 'rgba(224,60,60,0.92)', color: '#fff', backdropFilter: 'blur(4px)' }}>
      Offline mode. Showing cached data.
      {pendingCount > 0 ? ` ${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync.` : ''}
    </div>
  )
}

export function SyncToast() {
  const { authFetch, isAdmin, loading } = useAuth()
  const pendingCount = usePendingSyncCount()
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState('info')
  const [syncing, setSyncing] = useState(false)
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine)
    const handleOnlineState = () => setOnline(navigator.onLine)
    window.addEventListener('online', handleOnlineState)
    window.addEventListener('offline', handleOnlineState)
    return () => {
      window.removeEventListener('online', handleOnlineState)
      window.removeEventListener('offline', handleOnlineState)
    }
  }, [])

  const runSync = async () => {
    if (!online || syncing) return
    setSyncing(true)
    try {
      const result = await flushAttendanceQueue(authFetch)
      if (result.flushed > 0) {
        setTone('success')
        setMessage(`Synced ${result.flushed} offline change${result.flushed === 1 ? '' : 's'}.`)
      } else {
        setTone('info')
        setMessage('Everything is already synced.')
      }
      setTimeout(() => setMessage(''), 3500)
    } catch (err) {
      setTone('error')
      setMessage(err.message || 'Failed to sync offline changes.')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    if (loading || !isAdmin) return

    const handleOnline = () => { runSync() }
    runSync()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [authFetch, isAdmin, loading])

  if (!message && pendingCount === 0 && online) return null

  const border = tone === 'error'
    ? 'rgba(224,60,60,0.35)'
    : tone === 'success'
      ? 'rgba(34,197,94,0.35)'
      : 'rgba(245,166,35,0.35)'
  const color = tone === 'error'
    ? 'var(--accent2)'
    : tone === 'success'
      ? 'var(--green)'
      : 'var(--accent)'

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex items-center gap-3 px-4 py-3 fade-in" style={{ background: 'var(--surface)', border: `1px solid ${border}`, borderLeft: `3px solid ${color}`, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', maxWidth: 420 }}>
      <div style={{ flex: 1 }}>
        <div className="font-condensed font-bold text-sm tracking-wide" style={{ color: 'var(--text)' }}>
          {syncing ? 'Syncing now' : pendingCount > 0 && !message ? 'Offline changes saved' : 'Sync status'}
        </div>
        <div className="text-xs mt-0.5" style={{ color: message ? color : 'var(--muted)' }}>
          {message || `${pendingCount} change${pendingCount === 1 ? '' : 's'} will sync automatically when the phone is online.`}
        </div>
      </div>
      <button
        onClick={runSync}
        disabled={!online || syncing || pendingCount === 0}
        className="font-condensed font-bold text-xs tracking-widest uppercase px-3 py-2"
        style={{ background: pendingCount > 0 && online ? 'var(--accent)' : 'var(--border)', color: pendingCount > 0 && online ? '#000' : 'var(--muted)', border: 'none', cursor: !online || syncing || pendingCount === 0 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
      >
        {syncing ? 'Syncing...' : 'Sync Now'}
      </button>
      {message && (
        <button onClick={() => setMessage('')} className="font-condensed text-xs px-2 py-1" style={{ color: 'var(--muted)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
          X
        </button>
      )}
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
