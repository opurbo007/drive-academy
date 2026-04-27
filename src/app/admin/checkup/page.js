'use client'
import { Suspense, useEffect, useState } from 'react'
import { Card, CaptainShell, LoadingScreen, Notice, useCaptainPageAccess } from '@/components/captain/CaptainUi'

export default function CheckupPage() {
  return (
    <Suspense fallback={null}>
      <CheckupPageContent />
    </Suspense>
  )
}

function CheckupPageContent() {
  const { isAdmin, loading, authFetch, user, side, sideMeta } = useCaptainPageAccess()
  const [students, setStudents] = useState([])
  const [checkupGroups, setCheckupGroups] = useState([])
  const [checkupCurrentIndex, setCheckupCurrentIndex] = useState(0)
  const [selectedCheckupIds, setSelectedCheckupIds] = useState([])
  const [savingCheckup, setSavingCheckup] = useState(false)
  const [savingCleanupId, setSavingCleanupId] = useState(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const flash = (setter, text, ms = 3000) => {
    setter(text)
    setTimeout(() => setter(''), ms)
  }

  useEffect(() => {
    if (loading || !isAdmin || !side || user?.side !== side) return
    const today = new Date().toISOString().slice(0, 10)
    Promise.all([
      fetch(`/api/students?date=${today}&side=${side}`).then(res => res.json()),
      fetch(`/api/checkup?date=${today}&side=${side}`).then(res => res.json()),
    ]).then(([studentsData, checkupData]) => {
      setStudents(studentsData.students || [])
      setCheckupGroups(checkupData.groups || [])
      setCheckupCurrentIndex(checkupData.currentIndex || 0)
    }).finally(() => setPageLoading(false))
  }, [isAdmin, loading, side, user])

  const toggleCheckupStudent = studentId => {
    setSelectedCheckupIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    )
  }

  const addCheckupGroup = size => {
    if (selectedCheckupIds.length !== size) return
    const studentMap = new Map(students.map(student => [student.studentId, student]))
    const nextGroup = selectedCheckupIds.map(studentId => studentMap.get(studentId)).filter(Boolean)
    if (nextGroup.length !== size) return
    setCheckupGroups(prev => [...prev, nextGroup])
    setSelectedCheckupIds([])
  }

  const removeCheckupGroup = index => {
    setCheckupGroups(prev => prev.filter((_, groupIndex) => groupIndex !== index))
    setCheckupCurrentIndex(prev => {
      if (checkupGroups.length <= 1) return 0
      if (index < prev) return prev - 1
      if (index === prev) return prev >= checkupGroups.length - 1 ? Math.max(prev - 1, 0) : prev
      return prev
    })
  }

  const saveCheckup = async () => {
    setSavingCheckup(true)
    try {
      const response = await authFetch(`/api/checkup?side=${side}`, {
        method: 'PUT',
        body: JSON.stringify({
          groups: checkupGroups.map(group => group.map(student => student.studentId)),
          currentIndex: checkupCurrentIndex,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save checkup groups')
      setCheckupGroups(data.groups || [])
      setCheckupCurrentIndex(data.currentIndex || 0)
      flash(setMsg, 'Checkup groups saved')
    } catch (requestError) {
      flash(setErr, requestError.message || 'Failed to save checkup groups')
    } finally {
      setSavingCheckup(false)
    }
  }

  const setCleanupCount = async (student, nextValue) => {
    const safeCleanupCount = Math.max(Number(nextValue) || 0, 0)
    setSavingCleanupId(student._id)
    try {
      const response = await authFetch(`/api/students/${student._id}?side=${side}`, {
        method: 'PUT',
        body: JSON.stringify({ cleanupCount: safeCleanupCount }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update cleanup count')

      setStudents(prev => prev.map(item => (item._id === data._id ? data : item)))
      setCheckupGroups(prev =>
        prev.map(group => group.map(item => (item._id === data._id ? data : item)))
      )
    } catch (requestError) {
      flash(setErr, requestError.message || 'Failed to update cleanup count')
    } finally {
      setSavingCleanupId(null)
    }
  }

  const assignedCheckupIds = new Set(checkupGroups.flatMap(group => group.map(student => student.studentId)))
  const availableCheckupStudents = students.filter(student => !assignedCheckupIds.has(student.studentId))

  if (loading || pageLoading || !sideMeta) {
    return <LoadingScreen />
  }

  return (
    <CaptainShell side={side} sideMeta={sideMeta} title="Checkup" subtitle="Create daily 2 or 3 student checkup groups.">
      {msg && <Notice type="success" text={msg} />}
      {err && <Notice type="error" text={err} />}
      <Card title="Checkup Groups" sub="The next working day will move to the next saved group automatically. Captain can also choose which group is today.">
        <div className="space-y-4">
          {checkupGroups.length > 0 && (
            <div className="space-y-2">
              {checkupGroups.map((group, index) => (
                <div key={`${group.map(student => student.studentId).join('-')}-${index}`} className="mobile-card px-4 py-4" style={{ background: 'rgba(255,255,255,0.015)', border: `1px solid ${index === checkupCurrentIndex ? sideMeta.accent : 'var(--border)'}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-condensed font-bold text-xs tracking-[0.22em] uppercase" style={{ color: index === checkupCurrentIndex ? sideMeta.accent : 'var(--muted)' }}>
                        Group {index + 1}{index === checkupCurrentIndex ? ' Today' : ''}
                      </div>
                      <div className="mt-2 space-y-1">
                        {group.map(student => (
                          <div key={student.studentId} className="text-sm" style={{ color: 'var(--text)' }}>
                            {student.name} <span style={{ color: 'var(--muted)' }}>({student.studentId})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button onClick={() => setCheckupCurrentIndex(index)} className="mobile-card font-condensed font-bold text-xs tracking-[0.22em] uppercase px-3 py-2" style={{ border: `1px solid ${index === checkupCurrentIndex ? sideMeta.accent : 'var(--border)'}`, color: index === checkupCurrentIndex ? sideMeta.accent : 'var(--muted)', background: 'transparent' }}>
                        {index === checkupCurrentIndex ? 'Selected' : 'Set Today'}
                      </button>
                      <button
                        onClick={() => removeCheckupGroup(index)}
                        className="mobile-card font-condensed font-bold text-xs tracking-[0.22em] uppercase px-3 py-2"
                        style={{ border: '1px solid rgba(224,60,60,0.35)', color: 'var(--accent2)', background: 'transparent' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {availableCheckupStudents.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {availableCheckupStudents.map(student => {
                  const selected = selectedCheckupIds.includes(student.studentId)
                  return (
                    <button
                      key={student.studentId}
                      onClick={() => toggleCheckupStudent(student.studentId)}
                      className="mobile-card px-3 py-3 text-left"
                      style={{
                        border: `1px solid ${selected ? sideMeta.accent : 'var(--border)'}`,
                        background: selected ? 'rgba(245,166,35,0.08)' : 'rgba(255,255,255,0.015)',
                        color: 'var(--text)',
                      }}
                    >
                      <div className="text-sm">{student.name}</div>
                      <div className="text-[11px] mt-1 uppercase tracking-[0.2em]" style={{ color: 'var(--muted)' }}>
                        {student.studentId}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => addCheckupGroup(2)} disabled={selectedCheckupIds.length !== 2} className="mobile-card font-condensed font-bold text-xs tracking-[0.22em] uppercase px-4 py-3" style={{ border: '1px solid var(--accent)', color: 'var(--accent)', background: 'transparent', opacity: selectedCheckupIds.length === 2 ? 1 : 0.5 }}>
                  Make Pair
                </button>
                <button onClick={() => addCheckupGroup(3)} disabled={selectedCheckupIds.length !== 3} className="mobile-card font-condensed font-bold text-xs tracking-[0.22em] uppercase px-4 py-3" style={{ border: '1px solid var(--accent)', color: 'var(--accent)', background: 'transparent', opacity: selectedCheckupIds.length === 3 ? 1 : 0.5 }}>
                  Make 3
                </button>
              </div>
            </>
          ) : (
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              All students are already assigned to a checkup group.
            </div>
          )}

          <button onClick={saveCheckup} disabled={savingCheckup} className="mobile-card font-condensed font-bold text-xs tracking-[0.24em] uppercase px-4 py-3 w-full" style={{ background: sideMeta.accent, color: '#000', border: 'none', opacity: savingCheckup ? 0.7 : 1 }}>
            {savingCheckup ? 'Saving...' : 'Save Checkup'}
          </button>
        </div>
      </Card>

      <Card title="Clean Up" sub="Captain can set how many times each student cleaned the car.">
        <div className="space-y-2">
          {students.map(student => {
            const cleanupCount = Math.max(Number(student.cleanupCount) || 0, 0)
            const isSaving = savingCleanupId === student._id

            return (
              <div key={student._id} className="mobile-card px-4 py-4" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm" style={{ color: 'var(--text)', fontWeight: 600 }}>
                      {student.name}
                    </div>
                    <div className="text-[11px] mt-1 uppercase tracking-[0.2em]" style={{ color: 'var(--muted)' }}>
                      {student.studentId}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-condensed font-bold text-[11px] tracking-[0.22em] uppercase" style={{ color: 'var(--muted)' }}>
                      Total
                    </div>
                    <div className="font-condensed font-black text-2xl" style={{ color: sideMeta.accent }}>
                      {cleanupCount}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-[56px_minmax(0,1fr)_56px] gap-2 mt-3">
                  <button
                    onClick={() => setCleanupCount(student, cleanupCount - 1)}
                    disabled={isSaving || cleanupCount === 0}
                    className="mobile-card font-condensed font-black text-base px-3 py-3"
                    style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'transparent', opacity: isSaving || cleanupCount === 0 ? 0.5 : 1 }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={cleanupCount}
                    disabled={isSaving}
                    onChange={event => {
                      const value = event.target.value
                      setStudents(prev =>
                        prev.map(item => (item._id === student._id ? { ...item, cleanupCount: value } : item))
                      )
                    }}
                    onBlur={event => setCleanupCount(student, event.target.value)}
                    className="px-4 py-3 text-center text-sm outline-none transition-all w-full rounded-2xl"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', opacity: isSaving ? 0.65 : 1 }}
                  />
                  <button
                    onClick={() => setCleanupCount(student, cleanupCount + 1)}
                    disabled={isSaving}
                    className="mobile-card font-condensed font-black text-base px-3 py-3"
                    style={{ border: `1px solid ${sideMeta.accent}`, color: sideMeta.accent, background: 'transparent', opacity: isSaving ? 0.5 : 1 }}
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </CaptainShell>
  )
}
