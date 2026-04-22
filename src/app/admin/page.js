'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function AdminPage() {
  const { isAdmin, loading, authFetch } = useAuth()
  const router = useRouter()

  const [offDays, setOffDays]     = useState([])
  const [students, setStudents]   = useState([])
  const [settings, setSettings]   = useState({})
  const [pageLoading, setPageLoading] = useState(true)
  const [msg, setMsg]             = useState('')
  const [err, setErr]             = useState('')
  const [pwForm, setPwForm]       = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pwMsg, setPwMsg]         = useState('')
  const [pwErr, setPwErr]         = useState('')
  const [addForm, setAddForm]     = useState({ studentId: '', name: '' })
  const [addErr, setAddErr]       = useState('')

  const flash = (set, text, ms = 3000) => { set(text); setTimeout(() => set(''), ms) }

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/login')
  }, [isAdmin, loading, router])

  useEffect(() => {
    if (loading || !isAdmin) return
    const today = new Date().toISOString().slice(0, 10)
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch(`/api/students?date=${today}`).then(r => r.json()),
    ]).then(([sData, stData]) => {
      setOffDays(sData.offDays || [])
      setSettings(sData)
      setStudents(stData.students || [])
    }).finally(() => setPageLoading(false))
  }, [isAdmin, loading])

  const toggleOffDay = async (day) => {
    const updated = offDays.includes(day) ? offDays.filter(d => d !== day) : [...offDays, day]
    setOffDays(updated)
    const res = await authFetch('/api/settings/off-days', { method: 'PUT', body: JSON.stringify({ offDays: updated }) })
    if (res.ok) flash(setMsg, 'Off days updated')
    else { flash(setErr, 'Failed to update'); setOffDays(offDays) }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault(); setPwErr(''); setPwMsg('')
    if (pwForm.newPassword !== pwForm.confirm) { setPwErr('Passwords do not match'); return }
    if (pwForm.newPassword.length < 6) { setPwErr('Password must be at least 6 characters'); return }
    const res = await authFetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
    })
    const data = await res.json()
    if (res.ok) { flash(setPwMsg, 'Password changed!'); setPwForm({ currentPassword: '', newPassword: '', confirm: '' }) }
    else setPwErr(data.error || 'Failed')
  }

  const handleAddStudent = async (e) => {
    e.preventDefault(); setAddErr('')
    const res = await authFetch('/api/students', { method: 'POST', body: JSON.stringify(addForm) })
    const data = await res.json()
    if (res.ok) { setStudents(p => [...p, data]); setAddForm({ studentId: '', name: '' }); flash(setMsg, `${data.name} added`) }
    else setAddErr(data.error || 'Failed to add student')
  }

  const removeStudent = async (id, name) => {
    if (!window.confirm(`Deactivate ${name}?`)) return
    const res = await authFetch(`/api/students/${id}`, { method: 'DELETE' })
    if (res.ok) { setStudents(p => p.filter(s => s._id !== id)); flash(setMsg, `${name} deactivated`) }
    else flash(setErr, 'Failed')
  }

  if (loading || pageLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="font-condensed text-sm tracking-widest uppercase animate-pulse" style={{ color: 'var(--muted)' }}>Loading...</div>
    </div>
  )

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="font-condensed font-black text-3xl uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Admin Panel</h1>
        <p className="text-xs tracking-widest uppercase mt-1" style={{ color: 'var(--muted)' }}>Drive Academy — Manage Settings</p>
      </div>

      {msg && <Notice type="success" text={msg} />}
      {err && <Notice type="error"   text={err} />}

      {/* Off Days */}
      <Card title="Off Days" sub="List will not rotate on these days">
        <div className="flex flex-wrap gap-2 pt-2">
          {DAY_LABELS.map((label, idx) => (
            <button key={idx} onClick={() => toggleOffDay(idx)}
              className="font-condensed font-bold text-sm tracking-widest uppercase px-4 py-2 transition-all"
              style={{
                border: `1px solid ${offDays.includes(idx) ? 'var(--accent2)' : 'var(--border)'}`,
                color: offDays.includes(idx) ? 'var(--accent2)' : 'var(--muted)',
                background: offDays.includes(idx) ? 'rgba(224,60,60,0.08)' : 'transparent',
                cursor: 'pointer',
              }}>
              {label}{offDays.includes(idx) && ' ✕'}
            </button>
          ))}
        </div>
        {settings.lastRotationDate && (
          <p className="mt-3 text-xs tracking-wide" style={{ color: 'var(--muted)' }}>
            Last rotation: <span style={{ color: 'var(--text)' }}>{settings.lastRotationDate}</span>
          </p>
        )}
      </Card>

      {/* Students */}
      <Card title="Student List" sub={`${students.length} active students`}>
        <form onSubmit={handleAddStudent} className="flex gap-2 mb-4 flex-wrap">
          <FInput placeholder="DA-021" value={addForm.studentId} onChange={v => setAddForm(p => ({ ...p, studentId: v }))} style={{ width: 110 }} />
          <FInput placeholder="Student name" value={addForm.name} onChange={v => setAddForm(p => ({ ...p, name: v }))} style={{ flex: 1, minWidth: 180 }} />
          <FBtn label="+ Add" />
        </form>
        {addErr && <Notice type="error" text={addErr} />}

        <div style={{ border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div className="grid px-4 py-2 font-condensed font-bold text-xs tracking-widest uppercase"
            style={{ gridTemplateColumns: '48px 1fr 90px 44px', background: '#0d1014', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
            <div>#</div><div>Name</div><div>ID</div><div />
          </div>
          {students.map((s, i) => (
            <div key={s._id} className="student-row grid px-4 py-2.5 items-center text-sm"
              style={{ gridTemplateColumns: '48px 1fr 90px 44px', borderBottom: i < students.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="font-condensed font-black text-xl" style={{ color: i === 0 ? 'var(--accent)' : 'var(--muted)' }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <div style={{ color: 'var(--text)', fontWeight: i === 0 ? 600 : 400 }}>{s.name}</div>
              <div className="font-condensed text-xs tracking-wider" style={{ color: 'var(--muted)' }}>{s.studentId}</div>
              <button onClick={() => removeStudent(s._id, s.name)}
                className="w-7 h-7 text-xs flex items-center justify-center transition-all"
                style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent2)'; e.currentTarget.style.color = 'var(--accent2)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}>
                ✕
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Change password */}
      <Card title="Change Password" sub="Update admin account password">
        <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
          <FInput type="password" placeholder="Current password" value={pwForm.currentPassword} onChange={v => setPwForm(p => ({ ...p, currentPassword: v }))} />
          <FInput type="password" placeholder="New password (min 6 chars)" value={pwForm.newPassword} onChange={v => setPwForm(p => ({ ...p, newPassword: v }))} />
          <FInput type="password" placeholder="Confirm new password" value={pwForm.confirm} onChange={v => setPwForm(p => ({ ...p, confirm: v }))} />
          {pwErr && <Notice type="error"   text={pwErr} />}
          {pwMsg && <Notice type="success" text={pwMsg} />}
          <FBtn label="Change Password" />
        </form>
      </Card>
    </div>
  )
}

function Card({ title, sub, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: '#0d1014' }}>
        <div className="font-condensed font-bold text-sm tracking-widest uppercase" style={{ color: 'var(--text)' }}>{title}</div>
        {sub && <div className="text-xs tracking-wide mt-0.5" style={{ color: 'var(--muted)' }}>{sub}</div>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function FInput({ placeholder, value, onChange, type = 'text', style }) {
  return (
    <input type={type} placeholder={placeholder} value={value} required
      onChange={e => onChange(e.target.value)}
      className="px-3 py-2 text-sm outline-none transition-all w-full"
      style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', ...style }}
      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'} />
  )
}

function FBtn({ label }) {
  return (
    <button type="submit"
      className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-2 transition-all"
      style={{ background: 'var(--accent)', color: '#000', border: 'none', cursor: 'pointer' }}
      onMouseEnter={e => { e.target.style.background = '#ffc04d' }}
      onMouseLeave={e => { e.target.style.background = 'var(--accent)' }}>
      {label}
    </button>
  )
}

function Notice({ type, text }) {
  const isErr = type === 'error'
  return (
    <div className="px-3 py-2 text-xs font-medium tracking-wide mb-2"
      style={{
        background: isErr ? 'rgba(224,60,60,0.1)' : 'rgba(34,197,94,0.08)',
        border: `1px solid ${isErr ? 'rgba(224,60,60,0.3)' : 'rgba(34,197,94,0.3)'}`,
        color: isErr ? 'var(--accent2)' : 'var(--green)',
      }}>
      {text}
    </div>
  )
}
