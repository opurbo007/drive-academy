'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

const NAV_LINKS = [
  { href: '/', label: 'Today' },
  { href: '/history', label: 'History' },
]

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => { logout(); router.push('/') }
  const adminLink = isAdmin
    ? pathname === '/admin'
      ? { href: '/', label: 'Back to Attendance' }
      : { href: '/admin', label: 'Admin Panel' }
    : null

  return (
    <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', borderTop: '3px solid var(--accent)' }}>
      <div className="max-w-4xl mx-auto px-4 py-3 sm:h-14 sm:py-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 min-w-0">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <span style={{ fontSize: 20 }}>Drive</span>
            <span className="font-condensed font-black tracking-[0.22em] text-base sm:text-lg uppercase truncate" style={{ color: 'var(--accent)' }}>
              Drive Academy
            </span>
          </Link>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className="font-condensed font-bold text-xs tracking-widest uppercase px-3 py-2 transition-all whitespace-nowrap"
                  style={{
                    color: active ? 'var(--accent)' : 'var(--muted)',
                    borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  }}
                >
                  {label}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {adminLink && (
            <Link
              href={adminLink.href}
              className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-2 transition-all"
              style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
            >
              {adminLink.label}
            </Link>
          )}

          {user ? (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span
                className="font-condensed text-xs tracking-wider uppercase px-2 py-1 rounded-full"
                style={{ color: 'var(--accent)', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.18)' }}
              >
                User {user.username}
              </span>
              <button
                onClick={handleLogout}
                className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-2 transition-all"
                style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent2)'; e.currentTarget.style.color = 'var(--accent2)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-2 whitespace-nowrap"
              style={{ border: '1px solid var(--accent)', color: 'var(--accent)', background: 'rgba(245,166,35,0.08)' }}
            >
              Admin Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
