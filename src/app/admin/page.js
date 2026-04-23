'use client'
import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getSideLabel, getSideMeta, normalizeSide } from '@/lib/sides'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const EMPTY_STUDENT_FORM = { studentId: '', name: '' }

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminPageContent />
    </Suspense>
  )
}

function AdminPageContent() {
  const { isAdmin, loading, authFetch, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const side = normalizeSide(searchParams.get('side'))
  const sideMeta = side ? getSideMeta(side) : null

  const [offDays, setOffDays] = useState([])
  const [students, setStudents] = useState([])
  const [settings, setSettings] = useState({})
  const [pageLoading, setPageLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [addForm, setAddForm] = useState(EMPTY_STUDENT_FORM)
  const [addErr, setAddErr] = useState('')
  const [addingStudent, setAddingStudent] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_STUDENT_FORM)
  const [editErr, setEditErr] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [reversing, setReversing] = useState(false)
  const [confirmingStudent, setConfirmingStudent] = useState(null)

  const flash = (setter, text, ms = 3000) => {
    setter(text)
    setTimeout(() => setter(''), ms)
  }

  const loadAdminData = async activeSide => {
    const today = new Date().toISOString().slice(0, 10)
    const [settingsRes, studentsRes] = await Promise.all([
      fetch(`/api/settings?side=${activeSide}`).then(res => res.json()),
      fetch(`/api/students?date=${today}&side=${activeSide}`).then(res => res.json()),
    ])
    setOffDays(settingsRes.offDays || [])
    setSettings(settingsRes)
    setStudents(studentsRes.students || [])
  }

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

  useEffect(() => {
    if (loading || !isAdmin || !side || user?.side !== side) return
    loadAdminData(side).finally(() => setPageLoading(false))
  }, [isAdmin, loading, side, user])

  const toggleOffDay = async day => {
    const updated = offDays.includes(day) ? offDays.filter(value => value !== day) : [...offDays, day]
    setOffDays(updated)
    const response = await authFetch(`/api/settings/off-days?side=${side}`, {
      method: 'PUT',
      body: JSON.stringify({ offDays: updated }),
    })
    if (response.ok) flash(setMsg, 'Off days updated')
    else {
      flash(setErr, 'Failed to update')
      setOffDays(offDays)
    }
  }

  const handleManualReverse = async () => {
    setReversing(true)
    setErr('')
    try {
      const response = await authFetch(`/api/settings/reverse-order?side=${side}`, {
        method: 'POST',
        body: JSON.stringify({ effectiveDate: new Date().toISOString().slice(0, 10) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to reverse list')
      await loadAdminData(side)
      flash(setMsg, 'Student order reversed')
    } catch (requestError) {
      flash(setErr, requestError.message || 'Failed to reverse list')
    } finally {
      setReversing(false)
    }
  }

  const handleChangePassword = async event => {
    event.preventDefault()
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

    const response = await authFetch(`/api/auth/change-password?side=${side}`, {
      method: 'POST',
      body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
    })
    const data = await response.json()
    if (response.ok) {
      flash(setPwMsg, 'Password changed')
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
    } else {
      setPwErr(data.error || 'Failed')
    }
  }

  const handleAddStudent = async event => {
    event.preventDefault()
    setAddErr('')
    setAddingStudent(true)
    try {
      const response = await authFetch(`/api/students?side=${side}`, {
        method: 'POST',
        body: JSON.stringify(addForm),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to add student')
      setStudents(prev => [...prev, data])
      setAddForm(EMPTY_STUDENT_FORM)
      flash(setMsg, `${data.name} added`)
    } catch (requestError) {
      setAddErr(requestError.message || 'Failed to add student')
    } finally {
      setAddingStudent(false)
    }
  }

  const openEditStudent = student => {
    setEditingStudent(student)
    setEditForm({
      studentId: student.studentId || '',
      name: student.name || '',
    })
    setEditErr('')
  }

  const handleEditStudent = async event => {
    event.preventDefault()
    if (!editingStudent) return
    setSavingEdit(true)
    setEditErr('')
    try {
      const response = await authFetch(`/api/students/${editingStudent._id}?side=${side}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update student')
      setStudents(prev => prev.map(student => (student._id === data._id ? data : student)))
      setEditingStudent(null)
      setEditForm(EMPTY_STUDENT_FORM)
      flash(setMsg, `${data.name} updated`)
    } catch (requestError) {
      setEditErr(requestError.message || 'Failed to update student')
    } finally {
      setSavingEdit(false)
    }
  }

  const removeStudent = async () => {
    if (!confirmingStudent) return
    const { id, name } = confirmingStudent
    const response = await authFetch(`/api/students/${id}?side=${side}`, { method: 'DELETE' })
    if (response.ok) {
      setStudents(prev => prev.filter(student => student._id !== id))
      flash(setMsg, `${name} removed`)
    } else {
      flash(setErr, 'Failed')
    }
    setConfirmingStudent(null)
  }

  if (loading || pageLoading || !sideMeta) {
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
      <div className="fade-in space-y-4">
        <div className="mobile-card p-5 relative overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${sideMeta.accent}` }}>
          <div className="absolute -right-8 top-0 h-24 w-24 rounded-full opacity-15" style={{ background: sideMeta.accent, filter: 'blur(24px)' }} />
          <div className="relative z-10">
            <div className="font-condensed font-black text-xs tracking-[0.28em] uppercase" style={{ color: 'var(--muted)' }}>
              {getSideLabel(side)}
            </div>
            <h1 className="font-condensed font-black text-3xl uppercase tracking-[0.14em] mt-2" style={{ color: sideMeta.accent }}>
              Captain
            </h1>
            <p className="text-xs tracking-[0.22em] uppercase mt-2" style={{ color: 'var(--muted)' }}>
              Separate captain access for this side
            </p>
          </div>
        </div>

        {msg && <Notice type="success" text={msg} />}
        {err && <Notice type="error" text={err} />}

        <Card title="Rotation" sub="The list reverses per side on working days.">
          <div className="space-y-3">
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              {settings.lastRotationDate ? `Last reverse date: ${settings.lastRotationDate}` : 'No reverse recorded yet'}
            </div>
            <button onClick={handleManualReverse} disabled={reversing} className="mobile-card font-condensed font-bold text-xs tracking-[0.24em] uppercase px-4 py-3 w-full" style={{ background: sideMeta.accent, color: '#000', border: 'none', opacity: reversing ? 0.7 : 1 }}>
              {reversing ? 'Reversing...' : 'Reverse List'}
            </button>
          </div>
        </Card>

        <Card title="Off Days" sub="These days pause marking and rotation.">
          <div className="grid grid-cols-4 gap-2">
            {DAY_LABELS.map((label, index) => {
              const active = offDays.includes(index)
              return (
                <button
                  key={index}
                  onClick={() => toggleOffDay(index)}
                  className="mobile-card font-condensed font-bold text-xs tracking-[0.2em] uppercase px-3 py-3"
                  style={{
                    border: `1px solid ${active ? 'var(--accent2)' : 'var(--border)'}`,
                    color: active ? 'var(--accent2)' : 'var(--muted)',
                    background: active ? 'rgba(224,60,60,0.08)' : 'transparent',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </Card>

        <Card title="Add Student" sub={side === 'abdul' ? 'Current data belongs to Abdul.' : 'Saidul can add their own students here.'}>
          <form onSubmit={handleAddStudent} className="space-y-3">
            <FInput placeholder="Enter roll" value={addForm.studentId} disabled={addingStudent} onChange={value => setAddForm(prev => ({ ...prev, studentId: value }))} />
            <FInput placeholder="Student name" value={addForm.name} disabled={addingStudent} onChange={value => setAddForm(prev => ({ ...prev, name: value }))} />
            {addErr && <Notice type="error" text={addErr} />}
            <FBtn label={addingStudent ? 'Adding...' : 'Add Student'} disabled={addingStudent} color={sideMeta.accent} />
          </form>
        </Card>

        <Card title="Students" sub={`${students.length} active students in ${getSideLabel(side)}.`}>
          <div className="space-y-2">
            {students.map((student, index) => (
              <div key={student._id} className="mobile-card px-4 py-4" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border)' }}>
                <div className="flex items-start gap-3">
                  <div className="font-condensed font-black text-lg" style={{ color: index === 0 ? sideMeta.accent : 'var(--muted)' }}>
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div style={{ color: 'var(--text)', fontWeight: index === 0 ? 700 : 500 }}>{student.name}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.2em] flex flex-wrap gap-2" style={{ color: 'var(--muted)' }}>
                      <span>{student.studentId}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button onClick={() => openEditStudent(student)} className="mobile-card font-condensed font-bold text-xs tracking-[0.22em] uppercase px-3 py-3" style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'transparent' }}>
                    Edit
                  </button>
                  <button onClick={() => setConfirmingStudent({ id: student._id, name: student.name })} className="mobile-card font-condensed font-bold text-xs tracking-[0.22em] uppercase px-3 py-3" style={{ border: '1px solid rgba(224,60,60,0.35)', color: 'var(--accent2)', background: 'transparent' }}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Password" sub="Update only this side&apos;s captain account.">
          <form onSubmit={handleChangePassword} className="space-y-3">
            <FInput type="password" placeholder="Current password" value={pwForm.currentPassword} onChange={value => setPwForm(prev => ({ ...prev, currentPassword: value }))} />
            <FInput type="password" placeholder="New password" value={pwForm.newPassword} onChange={value => setPwForm(prev => ({ ...prev, newPassword: value }))} />
            <FInput type="password" placeholder="Confirm new password" value={pwForm.confirm} onChange={value => setPwForm(prev => ({ ...prev, confirm: value }))} />
            {pwErr && <Notice type="error" text={pwErr} />}
            {pwMsg && <Notice type="success" text={pwMsg} />}
            <FBtn label="Change Password" color={sideMeta.accent} />
          </form>
        </Card>
      </div>

      {editingStudent && (
        <ModalFrame title="Edit Student" accent={sideMeta.accent}>
          <form onSubmit={handleEditStudent} className="space-y-3">
            <FInput placeholder="Student ID" value={editForm.studentId} disabled={savingEdit} onChange={value => setEditForm(prev => ({ ...prev, studentId: value }))} />
            <FInput placeholder="Student name" value={editForm.name} disabled={savingEdit} onChange={value => setEditForm(prev => ({ ...prev, name: value }))} />
            {editErr && <Notice type="error" text={editErr} />}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setEditingStudent(null)} className="mobile-card font-condensed font-bold text-xs tracking-[0.22em] uppercase px-4 py-3" style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent' }}>
                Cancel
              </button>
              <FBtn label={savingEdit ? 'Saving...' : 'Save'} disabled={savingEdit} color={sideMeta.accent} />
            </div>
          </form>
        </ModalFrame>
      )}

      {confirmingStudent && (
        <ModalFrame title="Remove Student" accent="var(--accent2)">
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            Remove {confirmingStudent.name} from {getSideLabel(side)}?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setConfirmingStudent(null)} className="mobile-card font-condensed font-bold text-xs tracking-[0.22em] uppercase px-4 py-3" style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent' }}>
              Cancel
            </button>
            <button onClick={removeStudent} className="mobile-card font-condensed font-bold text-xs tracking-[0.22em] uppercase px-4 py-3" style={{ background: 'var(--accent2)', color: '#fff', border: 'none' }}>
              Confirm
            </button>
          </div>
        </ModalFrame>
      )}
    </>
  )
}

function Card({ title, sub, children }) {
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

function ModalFrame({ title, accent, children }) {
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

function FInput({ placeholder, value, onChange, type = 'text', disabled = false }) {
  return (
    <input type={type} placeholder={placeholder} value={value} required disabled={disabled} onChange={event => onChange(event.target.value)} className="px-4 py-3 text-sm outline-none transition-all w-full rounded-2xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', opacity: disabled ? 0.65 : 1 }} />
  )
}

function FBtn({ label, disabled = false, color = 'var(--accent)' }) {
  return (
    <button type="submit" disabled={disabled} className="mobile-card font-condensed font-bold text-xs tracking-[0.24em] uppercase px-4 py-3 transition-all w-full" style={{ background: color, color: '#000', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1 }}>
      {label}
    </button>
  )
}

function Notice({ type, text }) {
  const isErr = type === 'error'
  return (
    <div className="mobile-card px-3 py-3 text-xs font-medium tracking-wide" style={{ background: isErr ? 'rgba(224,60,60,0.1)' : 'rgba(34,197,94,0.08)', border: `1px solid ${isErr ? 'rgba(224,60,60,0.3)' : 'rgba(34,197,94,0.3)'}`, color: isErr ? 'var(--accent2)' : 'var(--green)' }}>
      {text}
    </div>
  )
}
