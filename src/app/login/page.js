'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getSideLabel, getSideMeta, normalizeSide } from '@/lib/sides'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const { login, isAdmin, loading, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const side = normalizeSide(searchParams.get('side'))
  const sideMeta = side ? getSideMeta(side) : null

  const [form, setForm] = useState({ password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && isAdmin && user?.side) {
      router.replace(`/admin?side=${user.side}`)
    }
  }, [isAdmin, loading, router, user])

  const handleSubmit = async event => {
    event.preventDefault()
    if (!side) {
      setError('Choose a side first')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      const data = await login(form.password, side)
      router.push(`/admin?side=${data.side}`)
    } catch (loginError) {
      setError(loginError.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  if (!side) {
    return (
      <div className="fade-in space-y-4">
        <div className="mobile-card p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--accent)' }}>
          <div className="font-condensed font-black text-2xl tracking-[0.18em] uppercase" style={{ color: 'var(--accent)' }}>
            Captain Login
          </div>
          <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
            Choose Abdul or Saidul first, then sign in with that side&apos;s captain ID.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/login?side=abdul" className="mobile-card text-center font-condensed font-black text-sm tracking-widest uppercase px-4 py-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            Abdul
          </Link>
          <Link href="/login?side=saidul" className="mobile-card text-center font-condensed font-black text-sm tracking-widest uppercase px-4 py-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            Saidul
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] fade-in">
      <div className="w-full">
        <div className="mobile-card overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${sideMeta.accent}` }}>
          <div className="px-5 pt-6 pb-5 relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-24 opacity-15" style={{ background: `linear-gradient(180deg, ${sideMeta.accent}, transparent)` }} />
            <div className="relative z-10">
              <div className="font-condensed font-black text-xs tracking-[0.28em] uppercase" style={{ color: 'var(--muted)' }}>
                {getSideLabel(side)}
              </div>
              <h1 className="font-condensed font-black text-3xl tracking-[0.14em] uppercase mt-2" style={{ color: sideMeta.accent }}>
                Captain
              </h1>
              <p className="text-xs tracking-[0.22em] uppercase mt-2" style={{ color: 'var(--muted)' }}>
                Username is fixed for this side
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
            <div className="mobile-card px-4 py-3 text-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
              Username: <span style={{ color: 'var(--text)' }}>{side}-admin</span>
            </div>

            <div>
              <label className="block font-condensed font-bold text-xs tracking-[0.24em] uppercase mb-2" style={{ color: 'var(--muted)' }}>
                Password
              </label>
              <input
                type="password"
                value={form.password}
                placeholder="Password"
                onChange={event => setForm({ password: event.target.value })}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 font-condensed text-base outline-none transition-all rounded-2xl"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', letterSpacing: '0.1em' }}
              />
            </div>

            {error && (
              <div className="mobile-card px-3 py-3 text-xs font-medium tracking-wide" style={{ background: 'rgba(224,60,60,0.1)', border: '1px solid rgba(224,60,60,0.3)', color: 'var(--accent2)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mobile-card w-full py-3 font-condensed font-black text-sm tracking-[0.24em] uppercase transition-all"
              style={{ background: sideMeta.accent, color: '#000', border: 'none', opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center mt-4 text-xs tracking-[0.22em] uppercase px-4" style={{ color: 'var(--muted)' }}>
          Use `abdul-admin` or `saidul-admin` with the matching password
        </p>
      </div>
    </div>
  )
}
