'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function todayStr() { return new Date().toISOString().slice(0, 10) }
function formatDate(str) {
  const d = new Date(str + 'T00:00:00')
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

export default function HomePage() {
  const { isAdmin, authFetch } = useAuth()
  const [date] = useState(todayStr)
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [isOffDay, setIsOffDay] = useState(false)
  const [loading, setLoading] = useState(true)
  const [markingId, setMarkingId] = useState(null)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const [sRes, aRes] = await Promise.all([
        fetch(`/api/students?date=${date}`),
        fetch(`/api/attendance?date=${date}`),
      ])
      const sData = await sRes.json()
      const aData = await aRes.json()
      setStudents(sData.students || [])
      setIsOffDay(sData.isOffDay || false)
      setAttendance(aData.attendance || {})
      setLastUpdated(new Date())
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const toggleAttendance = async (studentId) => {
    if (!isAdmin || isOffDay) return
    setMarkingId(studentId)
    try {
      const present = !attendance[studentId]
      const res = await authFetch('/api/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({ date, studentId, present }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setAttendance(prev => ({ ...prev, [studentId]: present }))
    } catch (e) {
      setError(e.message || 'Failed to update')
      setTimeout(() => setError(''), 3000)
    } finally {
      setMarkingId(null)
    }
  }

  const markAll = async (present) => {
    if (!isAdmin || isOffDay) return
    try {
      const studentIds = students.map(s => s.studentId)
      const res = await authFetch('/api/attendance/mark-all', {
        method: 'POST',
        body: JSON.stringify({ date, studentIds, present }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const map = {}
      studentIds.forEach(id => { map[id] = present })
      setAttendance(map)
    } catch (e) {
      setError(e.message || 'Failed to update')
      setTimeout(() => setError(''), 3000)
    }
  }

  const presentCount = students.filter(s => attendance[s.studentId]).length
  const absentCount = students.length - presentCount
  const dayName = DAY_NAMES[new Date(date + 'T00:00:00').getDay()]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="font-condensed text-sm tracking-widest uppercase animate-pulse" style={{ color: 'var(--muted)' }}>
        Loading...
      </div>
    </div>
  )

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-6 px-6 py-5 relative overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--accent)' }}>
        <div className="absolute right-0 top-0 bottom-0 flex items-center pr-6 pointer-events-none select-none">
          <span className="font-condensed font-black text-8xl opacity-[0.04] tracking-widest uppercase">ATTENDANCE</span>
        </div>
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="font-condensed font-black text-3xl uppercase tracking-widest mb-1" style={{ color: 'var(--accent)' }}>
              {dayName}
            </div>
            <div className="font-condensed text-lg font-bold tracking-wider" style={{ color: 'var(--text)' }}>
              {formatDate(date)}
            </div>
            {lastUpdated && (
              <div className="text-xs mt-1 tracking-wider uppercase" style={{ color: 'var(--muted)' }}>
                Live · Updated {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
          <span className="inline-block font-condensed font-bold text-xs tracking-widest uppercase px-3 py-1 mt-1"
            style={{
              border: `1px solid ${isOffDay ? 'rgba(224,60,60,0.4)' : 'rgba(34,197,94,0.4)'}`,
              background: isOffDay ? 'rgba(224,60,60,0.08)' : 'rgba(34,197,94,0.08)',
              color: isOffDay ? 'var(--accent2)' : 'var(--green)',
            }}>
            {isOffDay ? '⛔ Off Day' : '● Working Day'}
          </span>
        </div>
      </div>

      {/* Off-day banner */}
      {isOffDay && (
        <div className="mb-5 px-4 py-3 text-sm font-medium"
          style={{ background: 'rgba(224,60,60,0.07)', border: '1px solid rgba(224,60,60,0.25)', borderLeft: '3px solid var(--accent2)', color: 'var(--accent2)' }}>
          ⚠ Off day — attendance cannot be marked. List will rotate on the next working day.
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-3 text-sm"
          style={{ background: 'rgba(224,60,60,0.1)', border: '1px solid rgba(224,60,60,0.3)', color: 'var(--accent2)' }}>
          {error}
        </div>
      )}

      {/* First slot callout */}
      {students.length > 0 && !isOffDay && (
        <div className="mb-5 px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.2)', borderLeft: '3px solid var(--accent)' }}>
          <span className="text-xl">🚗</span>
          <div>
            <div className="font-condensed font-black text-base tracking-wide uppercase" style={{ color: 'var(--accent)' }}>
              {students[0].name}
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>First slot today · Rotated from yesterday&apos;s list</div>
          </div>
        </div>
      )}

      {/* Stats + bulk actions */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <StatChip label="Present" value={presentCount} color="var(--green)" />
        <StatChip label="Absent"  value={absentCount}  color="var(--accent2)" />
        <StatChip label="Total"   value={students.length} color="var(--muted)" />
        {isAdmin && !isOffDay && (
          <div className="flex gap-2 ml-auto">
            <ActionBtn onClick={() => markAll(true)}  label="All Present" color="var(--green)" />
            <ActionBtn onClick={() => markAll(false)} label="All Absent"  color="var(--muted)" />
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div className="grid px-4 py-2.5 font-condensed font-bold text-xs tracking-widest uppercase"
          style={{
            gridTemplateColumns: isAdmin ? '48px 1fr 90px 110px 44px' : '48px 1fr 90px 110px',
            background: '#0d1014',
            borderBottom: '2px solid var(--accent)',
            color: 'var(--muted)',
          }}>
          <div>#</div><div>Name</div><div>ID</div><div>Status</div>
          {isAdmin && <div />}
        </div>

        {students.map((s, idx) => {
          const present  = !!attendance[s.studentId]
          const isFirst  = idx === 0
          const isMarking = markingId === s.studentId
          return (
            <div key={s._id} className="student-row grid px-4 py-3 items-center"
              style={{
                gridTemplateColumns: isAdmin ? '48px 1fr 90px 110px 44px' : '48px 1fr 90px 110px',
                borderBottom: '1px solid var(--border)',
                borderLeft: isFirst ? '3px solid var(--accent)' : '3px solid transparent',
                background: present ? 'rgba(34,197,94,0.04)' : 'transparent',
              }}>
              <div className="font-condensed font-black text-2xl leading-none"
                style={{ color: isFirst ? 'var(--accent)' : 'var(--muted)' }}>
                {String(idx + 1).padStart(2, '0')}
              </div>
              <div className="text-sm" style={{ color: 'var(--text)', fontWeight: isFirst ? 700 : 400 }}>
                {s.name}
              </div>
              <div className="font-condensed text-xs tracking-wider uppercase" style={{ color: 'var(--muted)' }}>
                {s.studentId}
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 font-condensed font-bold text-xs tracking-widest uppercase"
                  style={{ color: present ? 'var(--green)' : 'var(--muted)' }}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ background: present ? 'var(--green)' : 'var(--muted)', boxShadow: present ? '0 0 6px var(--green)' : 'none' }} />
                  {present ? 'Present' : 'Absent'}
                </span>
              </div>
              {isAdmin && (
                <div>
                  <button onClick={() => toggleAttendance(s.studentId)}
                    disabled={isOffDay || isMarking}
                    className="w-8 h-8 flex items-center justify-center transition-all font-condensed font-bold text-sm"
                    style={{
                      border: `1px solid ${present ? 'var(--green)' : 'var(--border)'}`,
                      color: present ? 'var(--green)' : 'var(--muted)',
                      background: present ? 'rgba(34,197,94,0.1)' : 'transparent',
                      cursor: isOffDay ? 'not-allowed' : 'pointer',
                      opacity: isMarking ? 0.5 : 1,
                    }}>
                    {isMarking ? '…' : present ? '✓' : '○'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!isAdmin && (
        <div className="mt-4 text-center font-condensed text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
          View only · Admin login required to mark attendance
        </div>
      )}
    </div>
  )
}

function StatChip({ label, value, color }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 font-condensed font-bold text-xs tracking-widest uppercase"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
      {label} <span className="text-base" style={{ color }}>{value}</span>
    </div>
  )
}

function ActionBtn({ onClick, label, color }) {
  return (
    <button onClick={onClick}
      className="font-condensed font-bold text-xs tracking-widest uppercase px-3 py-1.5 transition-all"
      style={{ border: `1px solid ${color}`, color, background: 'transparent', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}18` }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
      {label}
    </button>
  )
}
