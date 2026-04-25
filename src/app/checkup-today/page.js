'use client'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getSideLabel, getSideMeta, normalizeSide } from '@/lib/sides'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function CheckupTodayPage() {
  return (
    <Suspense fallback={null}>
      <CheckupTodayPageContent />
    </Suspense>
  )
}

function CheckupTodayPageContent() {
  const searchParams = useSearchParams()
  const side = normalizeSide(searchParams.get('side'))
  const sideMeta = side ? getSideMeta(side) : null
  const [data, setData] = useState({ currentGroup: [], currentIndex: 0, date: todayStr(), groups: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!side) {
      setLoading(false)
      return
    }

    const date = todayStr()
    setLoading(true)
    fetch(`/api/checkup?date=${date}&side=${side}`)
      .then(async response => {
        const nextData = await response.json()
        if (!response.ok) throw new Error(nextData.error || 'Failed to load today checkup')
        setData(nextData)
      })
      .catch(requestError => {
        setError(requestError.message || 'Failed to load today checkup')
      })
      .finally(() => setLoading(false))
  }, [side])

  if (!sideMeta) {
    return (
      <div className="fade-in space-y-4">
        <div className="mobile-card px-5 py-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--accent)' }}>
          <div className="font-condensed font-black text-2xl tracking-[0.18em] uppercase" style={{ color: 'var(--accent)' }}>
            Today Checkup
          </div>
          <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
            Open Abdul or Saidul first to view that teacher&apos;s checkup today.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/checkup-today?side=abdul" className="mobile-card text-center font-condensed font-black text-sm tracking-widest uppercase px-4 py-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            Abdul
          </Link>
          <Link href="/checkup-today?side=saidul" className="mobile-card text-center font-condensed font-black text-sm tracking-widest uppercase px-4 py-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
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
          Today Checkup
        </h1>
        <p className="text-xs tracking-[0.22em] uppercase mt-2" style={{ color: 'var(--muted)' }}>
          Who has checkup today for this teacher
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
                {data.groups?.length > 0 ? `Group ${data.currentIndex + 1} today` : 'No checkup group'}
              </div>
            </div>
            <div className="font-condensed font-bold text-xs tracking-[0.22em] uppercase px-3 py-2 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
              {data.date}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {data.currentGroup?.length > 0 ? (
              data.currentGroup.map(student => (
                <div key={student.studentId} className="mobile-card px-3 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                  <div className="text-sm" style={{ color: 'var(--text)' }}>{student.name}</div>
                  <div className="text-[11px] mt-1 uppercase tracking-[0.2em]" style={{ color: 'var(--muted)' }}>
                    {student.studentId}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                No students selected for today.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
