'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getSideLabel, getSideMeta, normalizeSide } from '@/lib/sides'

function withSide(path, side) {
  return `${path}?side=${side}`
}

export function useCaptainPageAccess() {
  const { isAdmin, loading, authFetch, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const side = normalizeSide(searchParams.get('side'))
  const sideMeta = side ? getSideMeta(side) : null

  useEffect(() => {
    if (!loading && (!isAdmin || !user?.side)) {
      router.replace(side ? `/login?side=${side}` : '/login')
    }
  }, [isAdmin, loading, router, side, user])

  useEffect(() => {
    if (!loading && user?.side && side && user.side !== side) {
      router.replace(`/admin?side=${user.side}`)
    }
  }, [loading, router, side, user])

  return { isAdmin, loading, authFetch, user, side, sideMeta, router }
}

export function CaptainShell({ side, sideMeta, title = 'Captain', subtitle = 'Separate captain access for this side', children }) {
  return (
    <div className="fade-in space-y-4">
      <div className="mobile-card p-5 relative overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${sideMeta.accent}` }}>
        <div className="absolute -right-8 top-0 h-24 w-24 rounded-full opacity-15" style={{ background: sideMeta.accent, filter: 'blur(24px)' }} />
        <div className="relative z-10">
          <div className="font-condensed font-black text-xs tracking-[0.28em] uppercase" style={{ color: 'var(--muted)' }}>
            {getSideLabel(side)}
          </div>
          <h1 className="font-condensed font-black text-3xl uppercase tracking-[0.14em] mt-2" style={{ color: sideMeta.accent }}>
            {title}
          </h1>
          <p className="text-xs tracking-[0.22em] uppercase mt-2" style={{ color: 'var(--muted)' }}>
            {subtitle}
          </p>
        </div>
      </div>

      <CaptainNav side={side} />
      {children}
    </div>
  )
}

export function CaptainNav({ side }) {
  const pathname = usePathname()
  const items = [
    { href: withSide('/admin', side), label: 'Students', path: '/admin' },
    { href: withSide('/admin/off-days', side), label: 'Off Day', path: '/admin/off-days' },
    { href: withSide('/admin/checkup', side), label: 'Checkup', path: '/admin/checkup' },
    { href: withSide('/admin/cleanup', side), label: 'Clean Up', path: '/admin/cleanup' },
    { href: withSide('/admin/password', side), label: 'Password', path: '/admin/password' },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(item => {
        const active = pathname === item.path
        return (
          <Link
            key={item.href}
            href={item.href}
            className="mobile-card font-condensed font-bold text-xs tracking-[0.22em] uppercase px-4 py-3 text-center"
            style={{
              border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
              color: active ? 'var(--accent)' : 'var(--muted)',
              background: active ? 'rgba(245,166,35,0.08)' : 'transparent',
            }}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

export function Card({ title, sub, children }) {
  return (
    <div className="mobile-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: '#0d1014' }}>
        <div className="font-condensed font-bold text-sm tracking-[0.22em] uppercase" style={{ color: 'var(--text)' }}>{title}</div>
        {sub && <div className="text-xs tracking-wide mt-1" style={{ color: 'var(--muted)' }}>{sub}</div>}
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  )
}

export function ModalFrame({ title, accent, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0" style={{ background: 'rgba(0,0,0,0.72)' }}>
      <div className="mobile-card w-full max-w-md p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${accent}` }}>
        <div className="font-condensed font-black text-xl tracking-[0.16em] uppercase mb-4" style={{ color: accent }}>
          {title}
        </div>
        {children}
      </div>
    </div>
  )
}

export function FInput({ placeholder, value, onChange, type = 'text', disabled = false }) {
  return (
    <input type={type} placeholder={placeholder} value={value} required disabled={disabled} onChange={event => onChange(event.target.value)} className="px-4 py-3 text-sm outline-none transition-all w-full rounded-2xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', opacity: disabled ? 0.65 : 1 }} />
  )
}

export function FBtn({ label, disabled = false, color = 'var(--accent)' }) {
  return (
    <button type="submit" disabled={disabled} className="mobile-card font-condensed font-bold text-xs tracking-[0.24em] uppercase px-4 py-3 transition-all w-full" style={{ background: color, color: '#000', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1 }}>
      {label}
    </button>
  )
}

export function Notice({ type, text }) {
  const isErr = type === 'error'
  return (
    <div className="mobile-card px-3 py-3 text-xs font-medium tracking-wide" style={{ background: isErr ? 'rgba(224,60,60,0.1)' : 'rgba(34,197,94,0.08)', border: `1px solid ${isErr ? 'rgba(224,60,60,0.3)' : 'rgba(34,197,94,0.3)'}`, color: isErr ? 'var(--accent2)' : 'var(--green)' }}>
      {text}
    </div>
  )
}

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="font-condensed text-sm tracking-widest uppercase animate-pulse" style={{ color: 'var(--muted)' }}>
        Loading...
      </div>
    </div>
  )
}
