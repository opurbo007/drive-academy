'use client'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getSideLabel, getSideMeta, normalizeSide } from '@/lib/sides'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function CleanupListPage() {
  return (
    <Suspense fallback={null}>
      <CleanupListPageContent />
    </Suspense>
  )
}

function CleanupListPageContent() {
  const searchParams = useSearchParams()
  const side = normalizeSide(searchParams.get('side'))
  const sideMeta = side ? getSideMeta(side) : null
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!side) {
      setLoading(false)
      return
    }

    const date = todayStr()
    setLoading(true)
    fetch(`/api/students?date=${date}&side=${side}`)
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load clean up list')
        setStudents(data.students || [])
      })
      .catch(requestError => {
        setError(requestError.message || 'Failed to load clean up list')
      })
      .finally(() => setLoading(false))
  }, [side])

  if (!sideMeta) {
    return (
      <div className="fade-in space-y-4">
        <div className="mobile-card px-5 py-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--accent)' }}>
          <div className="font-condensed font-black text-2xl tracking-[0.18em] uppercase" style={{ color: 'var(--accent)' }}>
            Clean Up
          </div>
          <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
            Open Abdul or Saidul first to view the full clean up list.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/cleanup?side=abdul" className="mobile-card text-center font-condensed font-black text-sm tracking-widest uppercase px-4 py-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            Abdul
          </Link>
          <Link href="/cleanup?side=saidul" className="mobile-card text-center font-condensed font-black text-sm tracking-widest uppercase px-4 py-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            Saidul
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in space-y-4">
      <div className="mobile-card px-5 py-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${sideMeta.accent}` }}>
        <div className="font-condensed font-black text-xs tracking-[0.28em] uppercase" style={{ color: 'var(--muted)' }}>
          {getSideLabel(side)}
        </div>
        <h1 className="font-condensed font-black text-3xl tracking-[0.14em] uppercase mt-2" style={{ color: sideMeta.accent }}>
          Clean Up
        </h1>
        <p className="text-xs tracking-[0.22em] uppercase mt-2" style={{ color: 'var(--muted)' }}>
          Full clean up list for all students
        </p>
      </div>

      {loading ? (
        <div className="mobile-card flex items-center justify-center h-40" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="font-condensed text-sm tracking-widest uppercase animate-pulse" style={{ color: 'var(--muted)' }}>
            Loading...
          </div>
        </div>
      ) : error ? (
        <div className="mobile-card px-4 py-4 text-sm" style={{ background: 'rgba(224,60,60,0.1)', border: '1px solid rgba(224,60,60,0.3)', color: 'var(--accent2)' }}>
          {error}
        </div>
      ) : (
        <div className="mobile-card px-4 py-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${sideMeta.accent}` }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-condensed font-black text-xl tracking-[0.14em] uppercase" style={{ color: sideMeta.accent }}>
                {getSideLabel(side)}
              </div>
              <div className="text-[11px] mt-1 uppercase tracking-[0.2em]" style={{ color: 'var(--muted)' }}>
                {students.length} students
              </div>
            </div>
            <div className="font-condensed font-bold text-xs tracking-[0.22em] uppercase px-3 py-2 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
              {todayStr()}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {students.length > 0 ? (
              students.map(student => (
                <div key={student.studentId} className="mobile-card px-3 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm" style={{ color: 'var(--text)' }}>{student.name}</div>
                      <div className="text-[11px] mt-1 uppercase tracking-[0.2em]" style={{ color: 'var(--muted)' }}>
                        {student.studentId}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-condensed font-bold text-[11px] tracking-[0.22em] uppercase" style={{ color: 'var(--muted)' }}>
                        Cleaned
                      </div>
                      <div className="font-condensed font-black text-xl" style={{ color: sideMeta.accent }}>
                        {Math.max(Number(student.cleanupCount) || 0, 0)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                No students found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
