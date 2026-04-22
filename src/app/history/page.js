'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'

const DAY_NAMES  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_SHORT= ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function todayStr() { return new Date().toISOString().slice(0, 10) }

function fmtDate(str) {
  const d = new Date(str + 'T00:00:00')
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate() }

function buildCalendarWeeks(year, month) {
  const first = new Date(year, month, 1).getDay()
  const days  = daysInMonth(year, month)
  const cells = []
  for (let i = 0; i < first; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export default function HistoryPage() {
  const { isAdmin, authFetch } = useAuth()
  const today = todayStr()

  // Calendar nav state
  const nowDate  = new Date()
  const [calYear,  setCalYear]  = useState(nowDate.getFullYear())
  const [calMonth, setCalMonth] = useState(nowDate.getMonth())

  // Selected date state
  const [selectedDate, setSelectedDate] = useState(null)
  const [students,     setStudents]     = useState([])
  const [attendance,   setAttendance]   = useState({})
  const [isOffDay,     setIsOffDay]     = useState(false)
  const [dateLoading,  setDateLoading]  = useState(false)
  const [markingId,    setMarkingId]    = useState(null)
  const [error,        setError]        = useState('')
  const [saveMsg,      setSaveMsg]      = useState('')

  // Dates that have records (for calendar dots)
  const [recordDates, setRecordDates] = useState(new Set())

  useEffect(() => {
    fetch('/api/attendance/dates')
      .then(r => r.json())
      .then(d => setRecordDates(new Set(d.dates || [])))
      .catch(() => {})
  }, [])

  const loadDate = useCallback(async (date) => {
    setDateLoading(true)
    setError('')
    setSaveMsg('')
    try {
      const res  = await fetch(`/api/attendance/by-date?date=${date}`)
      const data = await res.json()
      setStudents(data.students   || [])
      setAttendance(data.attendance || {})
      setIsOffDay(data.isOffDay   || false)
    } catch {
      setError('Failed to load attendance for this date')
    } finally {
      setDateLoading(false)
    }
  }, [])

  const selectDate = (date) => {
    setSelectedDate(date)
    loadDate(date)
  }

  const toggleAttendance = async (studentId) => {
    if (!isAdmin) return
    const isPast = selectedDate < today
    if (!isPast && isOffDay) return
    setMarkingId(studentId)
    try {
      const present = !attendance[studentId]
      const res = await authFetch('/api/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({ date: selectedDate, studentId, present }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setAttendance(prev => ({ ...prev, [studentId]: present }))
      // Refresh record dates
      setRecordDates(prev => new Set([...prev, selectedDate]))
      flash(setSaveMsg, 'Saved')
    } catch (e) {
      flash(setError, e.message || 'Failed to save')
    } finally {
      setMarkingId(null)
    }
  }

  const markAll = async (present) => {
    if (!isAdmin) return
    try {
      const studentIds = students.map(s => s.studentId)
      const res = await authFetch('/api/attendance/mark-all', {
        method: 'POST',
        body: JSON.stringify({ date: selectedDate, studentIds, present }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const map = {}
      studentIds.forEach(id => { map[id] = present })
      setAttendance(map)
      setRecordDates(prev => new Set([...prev, selectedDate]))
      flash(setSaveMsg, 'All updated')
    } catch (e) {
      flash(setError, e.message || 'Failed')
    }
  }

  function flash(set, msg, ms = 2500) { set(msg); setTimeout(() => set(''), ms) }

  const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11) } else setCalMonth(m => m-1) }
  const nextMonth = () => {
    const now = new Date()
    if (calYear === now.getFullYear() && calMonth === now.getMonth()) return
    if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0) } else setCalMonth(m => m+1)
  }

  const isCurrentMonth = calYear === nowDate.getFullYear() && calMonth === nowDate.getMonth()
  const weeks = buildCalendarWeeks(calYear, calMonth)

  const presentCount = students.filter(s => attendance[s.studentId]).length
  const absentCount  = students.length - presentCount
  const isPast       = selectedDate && selectedDate < today
  const canEdit      = isAdmin && selectedDate && (isPast || !isOffDay)

  return (
    <div className="fade-in">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-condensed font-black text-3xl uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
          Attendance History
        </h1>
        <p className="text-xs tracking-widest uppercase mt-1" style={{ color: 'var(--muted)' }}>
          {isAdmin ? 'Select a date to view or edit attendance' : 'Select a date to view past attendance'}
        </p>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: 'minmax(0,340px) 1fr' }}>

        {/* ── Calendar ── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)', background: '#0d1014' }}>
            <button onClick={prevMonth}
              className="font-condensed font-bold text-sm px-2 py-1 transition-all"
              style={{ color: 'var(--muted)', background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text)'; e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}>
              ‹
            </button>
            <span className="font-condensed font-bold text-sm tracking-widest uppercase" style={{ color: 'var(--text)' }}>
              {MONTH_FULL[calMonth]} {calYear}
            </span>
            <button onClick={nextMonth} disabled={isCurrentMonth}
              className="font-condensed font-bold text-sm px-2 py-1 transition-all"
              style={{
                color: isCurrentMonth ? 'var(--border)' : 'var(--muted)',
                background: 'transparent',
                border: `1px solid ${isCurrentMonth ? 'var(--border)' : 'var(--border)'}`,
                cursor: isCurrentMonth ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!isCurrentMonth) { e.currentTarget.style.borderColor = 'var(--text)'; e.currentTarget.style.color = 'var(--text)' } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = isCurrentMonth ? 'var(--border)' : 'var(--muted)' }}>
              ›
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-3 pt-3 pb-1">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="text-center font-condensed font-bold text-xs tracking-widest"
                style={{ color: 'var(--muted)' }}>{d}</div>
            ))}
          </div>

          {/* Weeks */}
          <div className="px-3 pb-3 space-y-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((day, di) => {
                  if (!day) return <div key={di} />
                  const dateStr  = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                  const isToday  = dateStr === today
                  const isFuture = dateStr > today
                  const isSelected = dateStr === selectedDate
                  const hasRecord  = recordDates.has(dateStr)

                  return (
                    <button key={di} disabled={isFuture}
                      onClick={() => !isFuture && selectDate(dateStr)}
                      className="relative flex flex-col items-center justify-center h-9 transition-all font-condensed font-bold text-sm"
                      style={{
                        cursor: isFuture ? 'not-allowed' : 'pointer',
                        background: isSelected ? 'var(--accent)' : isToday ? 'rgba(245,166,35,0.12)' : 'transparent',
                        border: `1px solid ${isSelected ? 'var(--accent)' : isToday ? 'rgba(245,166,35,0.3)' : 'transparent'}`,
                        color: isSelected ? '#000' : isFuture ? 'var(--border)' : isToday ? 'var(--accent)' : 'var(--text)',
                      }}
                      onMouseEnter={e => { if (!isFuture && !isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? 'rgba(245,166,35,0.12)' : 'transparent' }}>
                      {day}
                      {hasRecord && !isSelected && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                          style={{ background: 'var(--green)' }} />
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex gap-4 px-4 pb-3 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--green)' }} />
              Has record
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
              <span className="inline-block w-4 h-4 flex items-center justify-center text-xs font-bold"
                style={{ border: '1px solid rgba(245,166,35,0.3)', color: 'var(--accent)' }}>·</span>
              Today
            </div>
          </div>
        </div>

        {/* ── Attendance panel ── */}
        <div>
          {!selectedDate ? (
            <div className="flex items-center justify-center h-64"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--border)' }}>
              <div className="text-center">
                <div className="text-4xl mb-3 opacity-30">📅</div>
                <div className="font-condensed font-bold text-sm tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                  Select a date
                </div>
              </div>
            </div>
          ) : dateLoading ? (
            <div className="flex items-center justify-center h-64"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="font-condensed text-sm tracking-widest uppercase animate-pulse" style={{ color: 'var(--muted)' }}>
                Loading…
              </div>
            </div>
          ) : (
            <div>
              {/* Date header */}
              <div className="px-5 py-4 mb-4 flex items-center justify-between flex-wrap gap-3"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${isPast ? 'var(--muted)' : 'var(--accent)'}` }}>
                <div>
                  <div className="font-condensed font-black text-xl uppercase tracking-widest"
                    style={{ color: isPast ? 'var(--text)' : 'var(--accent)' }}>
                    {fmtDate(selectedDate)}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {isPast && (
                      <span className="font-condensed font-bold text-xs tracking-widest uppercase px-2 py-0.5"
                        style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
                        Past
                      </span>
                    )}
                    {isOffDay && !isPast && (
                      <span className="font-condensed font-bold text-xs tracking-widest uppercase px-2 py-0.5"
                        style={{ border: '1px solid rgba(224,60,60,0.3)', color: 'var(--accent2)', background: 'rgba(224,60,60,0.07)' }}>
                        Off Day
                      </span>
                    )}
                    {isAdmin && isPast && (
                      <span className="font-condensed font-bold text-xs tracking-widest uppercase px-2 py-0.5"
                        style={{ border: '1px solid rgba(245,166,35,0.3)', color: 'var(--accent)', background: 'rgba(245,166,35,0.07)' }}>
                        ✎ Editable
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatChip label="Present" value={presentCount} color="var(--green)" />
                  <StatChip label="Absent"  value={absentCount}  color="var(--accent2)" />
                </div>
              </div>

              {/* Bulk actions (admin only) */}
              {canEdit && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  <ABtn onClick={() => markAll(true)}  label="All Present" color="var(--green)" />
                  <ABtn onClick={() => markAll(false)} label="All Absent"  color="var(--muted)" />
                </div>
              )}

              {/* Messages */}
              {error   && <Msg type="error"   text={error} />}
              {saveMsg && <Msg type="success" text={saveMsg} />}

              {/* Attendance table */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div className="grid px-4 py-2.5 font-condensed font-bold text-xs tracking-widest uppercase"
                  style={{
                    gridTemplateColumns: canEdit ? '44px 1fr 88px 108px 44px' : '44px 1fr 88px 108px',
                    background: '#0d1014',
                    borderBottom: `2px solid ${isPast ? 'var(--muted)' : 'var(--accent)'}`,
                    color: 'var(--muted)',
                  }}>
                  <div>#</div><div>Name</div><div>ID</div><div>Status</div>
                  {canEdit && <div />}
                </div>

                {students.length === 0 ? (
                  <div className="px-4 py-8 text-center font-condensed text-sm tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                    No student data found
                  </div>
                ) : students.map((s, idx) => {
                  const present   = !!attendance[s.studentId]
                  const isFirst   = idx === 0
                  const isMarking = markingId === s.studentId
                  return (
                    <div key={s._id} className="student-row grid px-4 py-3 items-center"
                      style={{
                        gridTemplateColumns: canEdit ? '44px 1fr 88px 108px 44px' : '44px 1fr 88px 108px',
                        borderBottom: '1px solid var(--border)',
                        borderLeft: isFirst && !isPast ? '3px solid var(--accent)' : '3px solid transparent',
                        background: present ? 'rgba(34,197,94,0.04)' : 'transparent',
                      }}>
                      <div className="font-condensed font-black text-xl leading-none"
                        style={{ color: isFirst && !isPast ? 'var(--accent)' : 'var(--muted)' }}>
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--text)', fontWeight: isFirst && !isPast ? 700 : 400 }}>
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
                      {canEdit && (
                        <button onClick={() => toggleAttendance(s.studentId)} disabled={isMarking}
                          className="w-8 h-8 flex items-center justify-center transition-all font-condensed font-bold text-sm"
                          style={{
                            border: `1px solid ${present ? 'var(--green)' : 'var(--border)'}`,
                            color: present ? 'var(--green)' : 'var(--muted)',
                            background: present ? 'rgba(34,197,94,0.1)' : 'transparent',
                            cursor: isMarking ? 'wait' : 'pointer',
                            opacity: isMarking ? 0.5 : 1,
                          }}>
                          {isMarking ? '…' : present ? '✓' : '○'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {!isAdmin && (
                <div className="mt-3 text-center font-condensed text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                  View only · Admin login required to edit
                </div>
              )}
            </div>
          )}
        </div>
      </div>
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

function ABtn({ onClick, label, color }) {
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

function Msg({ type, text }) {
  const isErr = type === 'error'
  return (
    <div className="px-3 py-2 text-xs font-medium tracking-wide mb-3"
      style={{
        background: isErr ? 'rgba(224,60,60,0.1)' : 'rgba(34,197,94,0.08)',
        border: `1px solid ${isErr ? 'rgba(224,60,60,0.3)' : 'rgba(34,197,94,0.3)'}`,
        color: isErr ? 'var(--accent2)' : 'var(--green)',
      }}>
      {text}
    </div>
  )
}
