'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const { login, isAdmin, loading } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && isAdmin) router.replace('/admin')
  }, [isAdmin, loading, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(form.username, form.password)
      router.push('/admin')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  return (
    <div className="flex items-center justify-center min-h-[60vh] fade-in">
      <div className="w-full max-w-sm">
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--accent)' }}>
          <div className="px-8 pt-8 pb-6 text-center">
            <div className="text-4xl mb-3">🚗</div>
            <h1 className="font-condensed font-black text-2xl tracking-widest uppercase mb-1" style={{ color: 'var(--accent)' }}>
              Admin Login
            </h1>
            <p className="text-xs tracking-wider uppercase" style={{ color: 'var(--muted)' }}>
              Drive Academy — Restricted Access
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
            <div>
              <label className="block font-condensed font-bold text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>
                Username
              </label>
              <input type="text" value={form.username} placeholder="admin"
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                required autoComplete="username"
                className="w-full px-4 py-3 font-condensed text-base outline-none transition-all"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', letterSpacing: '0.05em' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <div>
              <label className="block font-condensed font-bold text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>
                Password
              </label>
              <input type="password" value={form.password} placeholder="••••••••"
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required autoComplete="current-password"
                className="w-full px-4 py-3 font-condensed text-base outline-none transition-all"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', letterSpacing: '0.1em' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>

            {error && (
              <div className="px-3 py-2 text-xs font-medium tracking-wide"
                style={{ background: 'rgba(224,60,60,0.1)', border: '1px solid rgba(224,60,60,0.3)', color: 'var(--accent2)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full py-3 font-condensed font-black text-sm tracking-widest uppercase transition-all"
              style={{ background: 'var(--accent)', color: '#000', border: 'none', opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
              onMouseEnter={e => { if (!submitting) e.target.style.background = '#ffc04d' }}
              onMouseLeave={e => { e.target.style.background = 'var(--accent)' }}>
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
        <p className="text-center mt-4 text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
          Others can view attendance without logging in
        </p>
      </div>
    </div>
  )
}
