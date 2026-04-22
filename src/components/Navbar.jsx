'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

const NAV_LINKS = [
  { href: '/',        label: 'Today' },
  { href: '/history', label: 'History' },
]

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth()
  const pathname = usePathname()
  const router   = useRouter()

  const handleLogout = () => { logout(); router.push('/') }

  return (
    <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', borderTop: '3px solid var(--accent)' }}>
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand + nav links */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span style={{ fontSize: 20 }}>🚗</span>
            <span className="font-condensed font-black tracking-widest text-lg uppercase" style={{ color: 'var(--accent)' }}>
              Drive Academy
            </span>
          </Link>
          <div className="flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href
              return (
                <Link key={href} href={href}
                  className="font-condensed font-bold text-xs tracking-widest uppercase px-3 py-1.5 transition-all"
                  style={{
                    color: active ? 'var(--accent)' : 'var(--muted)',
                    borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  }}>
                  {label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Auth controls */}
        <div className="flex items-center gap-3">
          {isAdmin && pathname !== '/admin' && (
            <Link href="/admin"
              className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-1.5 transition-all"
              style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
              onMouseEnter={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--muted)' }}>
              Admin Panel
            </Link>
          )}
          {isAdmin && pathname === '/admin' && (
            <Link href="/"
              className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-1.5 transition-all"
              style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
              onMouseEnter={e => { e.target.style.borderColor = 'var(--text)'; e.target.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--muted)' }}>
              ← Attendance
            </Link>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="font-condensed text-xs tracking-wider uppercase" style={{ color: 'var(--accent)' }}>
                ● {user.username}
              </span>
              <button onClick={handleLogout}
                className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-1.5 transition-all"
                style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent2)'; e.currentTarget.style.color = 'var(--accent2)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}>
                Logout
              </button>
            </div>
          ) : (
            <Link href="/login"
              className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-1.5"
              style={{ border: '1px solid var(--accent)', color: 'var(--accent)', background: 'rgba(245,166,35,0.08)' }}>
              Admin Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
