'use client'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getSideLabel, normalizeSide, SIDE_OPTIONS } from '@/lib/sides'

function withSide(path, side) {
  return side ? `${path}?side=${side}` : path
}

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const side = normalizeSide(searchParams.get('side')) || normalizeSide(user?.side)

  const navLinks = side
    ? [
        { href: withSide('/', side), label: 'Today', active: pathname === '/' },
        { href: withSide('/history', side), label: 'History', active: pathname === '/history' },
        { href: withSide('/checkup-today', side), label: 'Checkup Today', active: pathname === '/checkup-today' },
      ]
    : []

  const handleLogout = () => {
    const homeSide = normalizeSide(user?.side) || side
    logout()
    router.push(withSide('/', homeSide))
  }

  const handleSwitch = () => {
    if (user) logout()
    router.push('/')
  }

  const canOpenCaptain = isAdmin && user?.side && (!side || user.side === side)

  return (
    <nav className="mobile-nav" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', borderTop: '3px solid var(--accent)' }}>
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link href={withSide('/', side)} className="min-w-0">
          <div className="font-condensed font-black text-lg tracking-[0.22em] uppercase truncate" style={{ color: 'var(--accent)' }}>
            Drive Academy
          </div>
          <div className="text-[11px] uppercase tracking-[0.28em]" style={{ color: 'var(--muted)' }}>
            {side ? getSideLabel(side) : 'Select Side'}
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {side && (
            <button
              onClick={handleSwitch}
              className="font-condensed font-bold text-[11px] tracking-widest uppercase px-3 py-2"
              style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent' }}
            >
              Switch
            </button>
          )}
          {user ? (
            <button
              onClick={handleLogout}
              className="font-condensed font-bold text-[11px] tracking-widest uppercase px-3 py-2"
              style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent' }}
            >
              Logout
            </button>
          ) : side ? (
            <Link
              href={withSide('/login', side)}
              className="font-condensed font-bold text-[11px] tracking-widest uppercase px-3 py-2"
              style={{ border: '1px solid var(--accent)', color: 'var(--accent)', background: 'rgba(245,166,35,0.08)' }}
            >
              Captain
            </Link>
          ) : null}
        </div>
      </div>

      {side && (
        <div className="max-w-md mx-auto px-4 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-2 whitespace-nowrap"
              style={{
                border: `1px solid ${link.active ? 'var(--accent)' : 'var(--border)'}`,
                color: link.active ? 'var(--accent)' : 'var(--muted)',
                background: link.active ? 'rgba(245,166,35,0.08)' : 'transparent',
              }}
            >
              {link.label}
            </Link>
          ))}

          {canOpenCaptain && (
            <Link
              href={withSide('/admin', user.side)}
              className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-2 whitespace-nowrap"
              style={{
                border: `1px solid ${pathname.startsWith('/admin') ? 'var(--accent)' : 'var(--border)'}`,
                color: pathname.startsWith('/admin') ? 'var(--accent)' : 'var(--muted)',
                background: pathname.startsWith('/admin') ? 'rgba(245,166,35,0.08)' : 'transparent',
              }}
            >
              Control
            </Link>
          )}
        </div>
      )}

      {/* {!side && (
        <div className="max-w-md mx-auto px-4 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {SIDE_OPTIONS.map(option => (
            <Link
              key={option.key}
              href={`/?side=${option.key}`}
              className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-2 whitespace-nowrap"
              style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
            >
              {option.label}
            </Link>
          ))}
        </div>
      )} */}
    </nav>
  )
}
