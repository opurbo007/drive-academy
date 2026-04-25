'use client'
import { Suspense, useEffect, useState } from 'react'
import {
  Card,
  CaptainShell,
  FBtn,
  FInput,
  LoadingScreen,
  ModalFrame,
  Notice,
  useCaptainPageAccess,
} from '@/components/captain/CaptainUi'

const EMPTY_STUDENT_FORM = { studentId: '', name: '' }

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminPageContent />
    </Suspense>
  )
}

function AdminPageContent() {
  const { isAdmin, loading, authFetch, user, side, sideMeta } = useCaptainPageAccess()
  const [students, setStudents] = useState([])
  const [pageLoading, setPageLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [addForm, setAddForm] = useState(EMPTY_STUDENT_FORM)
  const [addErr, setAddErr] = useState('')
  const [addingStudent, setAddingStudent] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_STUDENT_FORM)
  const [editErr, setEditErr] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [confirmingStudent, setConfirmingStudent] = useState(null)

  const flash = (setter, text, ms = 3000) => {
    setter(text)
    setTimeout(() => setter(''), ms)
  }

  const loadStudents = async activeSide => {
    const today = new Date().toISOString().slice(0, 10)
    const response = await fetch(`/api/students?date=${today}&side=${activeSide}`)
    const data = await response.json()
    setStudents(data.students || [])
  }

  useEffect(() => {
    if (loading || !isAdmin || !side || user?.side !== side) return
    loadStudents(side).finally(() => setPageLoading(false))
  }, [isAdmin, loading, side, user])

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
    return <LoadingScreen />
  }

  return (
    <>
      <CaptainShell side={side} sideMeta={sideMeta} title="Captain" subtitle="Manage students from here.">
        {msg && <Notice type="success" text={msg} />}
        {err && <Notice type="error" text={err} />}

        <Card title="Add Student" sub={side === 'abdul' ? 'Current data belongs to Abdul.' : 'Saidul can add their own students here.'}>
          <form onSubmit={handleAddStudent} className="space-y-3">
            <FInput placeholder="Enter roll" value={addForm.studentId} disabled={addingStudent} onChange={value => setAddForm(prev => ({ ...prev, studentId: value }))} />
            <FInput placeholder="Student name" value={addForm.name} disabled={addingStudent} onChange={value => setAddForm(prev => ({ ...prev, name: value }))} />
            {addErr && <Notice type="error" text={addErr} />}
            <FBtn label={addingStudent ? 'Adding...' : 'Add Student'} disabled={addingStudent} color={sideMeta.accent} />
          </form>
        </Card>

        <Card title="Students" sub={`${students.length} active students in this side.`}>
          <div className="space-y-2">
            {students.map((student, index) => (
              <div key={student._id} className="mobile-card px-4 py-4" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border)' }}>
                <div className="flex items-start gap-3">
                  <div className="font-condensed font-black text-lg" style={{ color: index === 0 ? sideMeta.accent : 'var(--muted)' }}>
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div style={{ color: 'var(--text)', fontWeight: index === 0 ? 700 : 500 }}>{student.name}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--muted)' }}>
                      {student.studentId}
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
      </CaptainShell>

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
            Remove {confirmingStudent.name} from this side?
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
