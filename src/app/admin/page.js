'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function AdminPage() {
  const { isAdmin, loading, authFetch } = useAuth()
  const router = useRouter()

  const [offDays, setOffDays] = useState([])
  const [students, setStudents] = useState([])
  const [settings, setSettings] = useState({})
  const [pageLoading, setPageLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [addForm, setAddForm] = useState({ studentId: '', name: '' })
  const [addErr, setAddErr] = useState('')
  const [reversing, setReversing] = useState(false)
  const [showOffDays, setShowOffDays] = useState(false)
  const [confirmingStudent, setConfirmingStudent] = useState(null)

  const flash = (setter, text, ms = 3000) => {
    setter(text)
    setTimeout(() => setter(''), ms)
  }

  const loadAdminData = async () => {
    const today = new Date().toISOString().slice(0, 10)
    const [settingsRes, studentsRes] = await Promise.all([
      fetch('/api/settings').then(res => res.json()),
      fetch(`/api/students?date=${today}`).then(res => res.json()),
    ])
    setOffDays(settingsRes.offDays || [])
    setSettings(settingsRes)
    setStudents(studentsRes.students || [])
  }

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/login')
  }, [isAdmin, loading, router])

  useEffect(() => {
    if (loading || !isAdmin) return
    loadAdminData().finally(() => setPageLoading(false))
  }, [isAdmin, loading])

  const toggleOffDay = async (day) => {
    const updated = offDays.includes(day) ? offDays.filter(value => value !== day) : [...offDays, day]
    setOffDays(updated)
    const res = await authFetch('/api/settings/off-days', {
      method: 'PUT',
      body: JSON.stringify({ offDays: updated }),
    })
    if (res.ok) flash(setMsg, 'Off days updated')
    else {
      flash(setErr, 'Failed to update')
      setOffDays(offDays)
    }
  }

  const handleManualReverse = async () => {
    setReversing(true)
    setErr('')
    try {
      const res = await authFetch('/api/settings/reverse-order', {
        method: 'POST',
        body: JSON.stringify({ effectiveDate: new Date().toISOString().slice(0, 10) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reverse list')
      await loadAdminData()
      flash(setMsg, 'Student order reversed successfully')
    } catch (e) {
      flash(setErr, e.message || 'Failed to reverse list')
    } finally {
      setReversing(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwErr('')
    setPwMsg('')
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwErr('Passwords do not match')
      return
    }
    if (pwForm.newPassword.length < 6) {
      setPwErr('Password must be at least 6 characters')
      return
    }

    const res = await authFetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
    })
    const data = await res.json()
    if (res.ok) {
      flash(setPwMsg, 'Password changed')
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
    } else {
      setPwErr(data.error || 'Failed')
    }
  }

  const handleAddStudent = async (e) => {
    e.preventDefault()
    setAddErr('')
    const res = await authFetch('/api/students', {
      method: 'POST',
      body: JSON.stringify(addForm),
    })
    const data = await res.json()
    if (res.ok) {
      setStudents(prev => [...prev, data])
      setAddForm({ studentId: '', name: '' })
      flash(setMsg, `${data.name} added`)
    } else {
      setAddErr(data.error || 'Failed to add student')
    }
  }

  const removeStudent = async () => {
    if (!confirmingStudent) return
    const { id, name } = confirmingStudent
    const res = await authFetch(`/api/students/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setStudents(prev => prev.filter(student => student._id !== id))
      flash(setMsg, `${name} deactivated`)
    } else {
      flash(setErr, 'Failed')
    }
    setConfirmingStudent(null)
  }

  if (loading || pageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="font-condensed text-sm tracking-widest uppercase animate-pulse" style={{ color: 'var(--muted)' }}>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fade-in space-y-5 sm:space-y-6">
        <div>
          <h1 className="font-condensed font-black text-3xl uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
            Admin Panel
          </h1>
          <p className="text-xs tracking-widest uppercase mt-1" style={{ color: 'var(--muted)' }}>
            Manage alerts, reverse order, students, and settings
          </p>
        </div>

        {msg && <Notice type="success" text={msg} />}
        {err && <Notice type="error" text={err} />}

        <Card title="Alerts and Rotation" sub="The list reverses every working day. You can also reverse it manually.">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              <div>Next working-day open will reverse the active list automatically.</div>
              {settings.lastRotationDate && <div className="mt-1">Last reverse date: <span style={{ color: 'var(--text)' }}>{settings.lastRotationDate}</span></div>}
            </div>
            <button onClick={handleManualReverse} disabled={reversing} className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-3 transition-all" style={{ background: 'var(--accent)', color: '#000', border: 'none', cursor: reversing ? 'wait' : 'pointer', opacity: reversing ? 0.7 : 1 }}>
              {reversing ? 'Reversing...' : 'Reverse List Now'}
            </button>
          </div>
        </Card>

        <Card title="Off Days" sub="Rotation is paused on selected days">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              {offDays.length > 0 ? `${offDays.length} day${offDays.length === 1 ? '' : 's'} selected` : 'No off days selected'}
            </div>
            <button onClick={() => setShowOffDays(prev => !prev)} className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-2" style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}>
              {showOffDays ? 'Hide' : 'Show'}
            </button>
          </div>
          {showOffDays && (
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pt-4">
              {DAY_LABELS.map((label, idx) => {
                const active = offDays.includes(idx)
                return (
                  <button key={idx} onClick={() => toggleOffDay(idx)} className="font-condensed font-bold text-sm tracking-widest uppercase px-4 py-3 transition-all" style={{ border: `1px solid ${active ? 'var(--accent2)' : 'var(--border)'}`, color: active ? 'var(--accent2)' : 'var(--muted)', background: active ? 'rgba(224,60,60,0.08)' : 'transparent', cursor: 'pointer' }}>
                    {label}
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        <Card title="Student List" sub={`${students.length} active students`}>
          <form onSubmit={handleAddStudent} className="grid grid-cols-1 sm:grid-cols-[110px_minmax(0,1fr)_auto] gap-2 mb-4">
            <FInput placeholder="DA-021" value={addForm.studentId} onChange={v => setAddForm(prev => ({ ...prev, studentId: v }))} />
            <FInput placeholder="Student name" value={addForm.name} onChange={v => setAddForm(prev => ({ ...prev, name: v }))} />
            <FBtn label="Add Student" />
          </form>
          {addErr && <Notice type="error" text={addErr} />}

          <div style={{ border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div className="hidden sm:grid px-4 py-2 font-condensed font-bold text-xs tracking-widest uppercase" style={{ gridTemplateColumns: '48px 1fr 90px 52px', background: '#0d1014', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
              <div>#</div>
              <div>Name</div>
              <div>ID</div>
              <div />
            </div>

            {students.map((student, i) => (
              <div key={student._id} className="student-row px-4 py-3 sm:grid sm:items-center" style={{ gridTemplateColumns: '48px 1fr 90px 52px', borderBottom: i < students.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="flex items-start justify-between gap-3 sm:contents">
                  <div className="font-condensed font-black text-xl" style={{ color: i === 0 ? 'var(--accent)' : 'var(--muted)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0 flex-1 sm:block">
                    <div style={{ color: 'var(--text)', fontWeight: i === 0 ? 600 : 400 }}>{student.name}</div>
                    <div className="mt-1 sm:hidden font-condensed text-xs tracking-wider uppercase" style={{ color: 'var(--muted)' }}>{student.studentId}</div>
                  </div>
                  <button onClick={() => setConfirmingStudent({ id: student._id, name: student.name })} className="w-10 h-10 sm:hidden text-xs flex items-center justify-center transition-all" style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}>
                    X
                  </button>
                </div>
                <div className="hidden sm:block" style={{ color: 'var(--text)', fontWeight: i === 0 ? 600 : 400 }}>{student.name}</div>
                <div className="hidden sm:block font-condensed text-xs tracking-wider" style={{ color: 'var(--muted)' }}>{student.studentId}</div>
                <button onClick={() => setConfirmingStudent({ id: student._id, name: student.name })} className="hidden sm:flex w-9 h-9 text-xs items-center justify-center transition-all" style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}>
                  X
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Change Password" sub="Update the admin account password">
          <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
            <FInput type="password" placeholder="Current password" value={pwForm.currentPassword} onChange={v => setPwForm(prev => ({ ...prev, currentPassword: v }))} />
            <FInput type="password" placeholder="New password (min 6 chars)" value={pwForm.newPassword} onChange={v => setPwForm(prev => ({ ...prev, newPassword: v }))} />
            <FInput type="password" placeholder="Confirm new password" value={pwForm.confirm} onChange={v => setPwForm(prev => ({ ...prev, confirm: v }))} />
            {pwErr && <Notice type="error" text={pwErr} />}
            {pwMsg && <Notice type="success" text={pwMsg} />}
            <FBtn label="Change Password" />
          </form>
        </Card>
      </div>

      {confirmingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--accent2)' }}>
            <div className="font-condensed font-black text-xl tracking-widest uppercase mb-2" style={{ color: 'var(--accent2)' }}>
              Remove Student
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              Deactivate {confirmingStudent.name} from the active list?
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmingStudent(null)} className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-2" style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={removeStudent} className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-2" style={{ background: 'var(--accent2)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Card({ title, sub, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="px-4 py-3 sm:px-5" style={{ borderBottom: '1px solid var(--border)', background: '#0d1014' }}>
        <div className="font-condensed font-bold text-sm tracking-widest uppercase" style={{ color: 'var(--text)' }}>{title}</div>
        {sub && <div className="text-xs tracking-wide mt-0.5" style={{ color: 'var(--muted)' }}>{sub}</div>}
      </div>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </div>
  )
}

function FInput({ placeholder, value, onChange, type = 'text' }) {
  return (
    <input type={type} placeholder={placeholder} value={value} required onChange={e => onChange(e.target.value)} className="px-3 py-3 text-sm outline-none transition-all w-full" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
  )
}

function FBtn({ label }) {
  return (
    <button type="submit" className="font-condensed font-bold text-xs tracking-widest uppercase px-4 py-3 transition-all" style={{ background: 'var(--accent)', color: '#000', border: 'none', cursor: 'pointer' }}>
      {label}
    </button>
  )
}

function Notice({ type, text }) {
  const isErr = type === 'error'
  return (
    <div className="px-3 py-2 text-xs font-medium tracking-wide" style={{ background: isErr ? 'rgba(224,60,60,0.1)' : 'rgba(34,197,94,0.08)', border: `1px solid ${isErr ? 'rgba(224,60,60,0.3)' : 'rgba(34,197,94,0.3)'}`, color: isErr ? 'var(--accent2)' : 'var(--green)' }}>
      {text}
    </div>
  )
}
