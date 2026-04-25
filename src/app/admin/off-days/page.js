'use client'
import { Suspense, useEffect, useState } from 'react'
import { Card, CaptainShell, LoadingScreen, Notice, useCaptainPageAccess } from '@/components/captain/CaptainUi'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function OffDaysPage() {
  return (
    <Suspense fallback={null}>
      <OffDaysPageContent />
    </Suspense>
  )
}

function OffDaysPageContent() {
  const { isAdmin, loading, authFetch, user, side, sideMeta } = useCaptainPageAccess()
  const [offDays, setOffDays] = useState([])
  const [pageLoading, setPageLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const flash = (setter, text, ms = 3000) => {
    setter(text)
    setTimeout(() => setter(''), ms)
  }

  useEffect(() => {
    if (loading || !isAdmin || !side || user?.side !== side) return
    fetch(`/api/settings?side=${side}`)
      .then(res => res.json())
      .then(data => setOffDays(data.offDays || []))
      .finally(() => setPageLoading(false))
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

  if (loading || pageLoading || !sideMeta) {
    return <LoadingScreen />
  }

  return (
    <CaptainShell side={side} sideMeta={sideMeta} title="Off Day" subtitle="Choose which days pause marking and rotation.">
      {msg && <Notice type="success" text={msg} />}
      {err && <Notice type="error" text={err} />}
      <Card title="Off Days" sub="Tap a day to turn it on or off.">
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
    </CaptainShell>
  )
}
