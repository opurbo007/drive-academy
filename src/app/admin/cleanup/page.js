'use client'
import { Suspense, useEffect, useState } from 'react'
import { Card, CaptainShell, LoadingScreen, Notice, useCaptainPageAccess } from '@/components/captain/CaptainUi'

export default function CleanupPage() {
  return (
    <Suspense fallback={null}>
      <CleanupPageContent />
    </Suspense>
  )
}

function CleanupPageContent() {
  const { isAdmin, loading, authFetch, user, side, sideMeta } = useCaptainPageAccess()
  const [students, setStudents] = useState([])
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
    fetch(`/api/students?date=${today}&side=${side}`)
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load students')
        setStudents(data.students || [])
      })
      .catch(requestError => {
        flash(setErr, requestError.message || 'Failed to load students')
      })
      .finally(() => setPageLoading(false))
  }, [isAdmin, loading, side, user])

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
      flash(setMsg, `${data.name} cleanup updated`)
    } catch (requestError) {
      flash(setErr, requestError.message || 'Failed to update cleanup count')
    } finally {
      setSavingCleanupId(null)
    }
  }

  if (loading || pageLoading || !sideMeta) {
    return <LoadingScreen />
  }

  return (
    <CaptainShell side={side} sideMeta={sideMeta} title="Clean Up" subtitle="Track how many times each student cleaned the car.">
      {msg && <Notice type="success" text={msg} />}
      {err && <Notice type="error" text={err} />}

      <Card title="Clean Up" sub="Captain can set the total clean up count for every student.">
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
