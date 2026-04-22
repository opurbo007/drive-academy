'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(str) {
  const d = new Date(`${str}T00:00:00`)
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function buildCalendarWeeks(year, month) {
  const first = new Date(year, month, 1).getDay()
  const days = daysInMonth(year, month)
  const cells = []

  for (let i = 0; i < first; i += 1) cells.push(null)
  for (let day = 1; day <= days; day += 1) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export default function HistoryPage() {
  const { isAdmin, authFetch } = useAuth()
  const today = todayStr()
  const nowDate = new Date()

  const [calYear, setCalYear] = useState(nowDate.getFullYear())
  const [calMonth, setCalMonth] = useState(nowDate.getMonth())
  const [selectedDate, setSelectedDate] = useState(null)
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [isOffDay, setIsOffDay] = useState(false)
  const [dateLoading, setDateLoading] = useState(false)
  const [markingId, setMarkingId] = useState(null)
  const [error, setError] = useState('')
  const [saveMsg, setSaveMsg] = useState('')
  const [recordDates, setRecordDates] = useState(new Set())

  const flash = (setter, message, ms = 2500) => {
    setter(message)
    setTimeout(() => setter(''), ms)
  }

  useEffect(() => {
    fetch('/api/attendance/dates')
      .then(res => res.json())
      .then(data => setRecordDates(new Set(data.dates || [])))
      .catch(() => {})
  }, [])

  const loadDate = useCallback(async (date) => {
    setDateLoading(true)
    setError('')
    setSaveMsg('')
    try {
      const res = await fetch(`/api/attendance/by-date?date=${date}`)
      const data = await res.json()
      setStudents(data.students || [])
      setAttendance(data.attendance || {})
      setIsOffDay(data.isOffDay || false)
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
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      setAttendance(prev => ({ ...prev, [studentId]: present }))
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
      const studentIds = students.map(student => student.studentId)
      const res = await authFetch('/api/attendance/mark-all', {
        method: 'POST',
        body: JSON.stringify({ date: selectedDate, studentIds, present }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      const nextAttendance = {}
      studentIds.forEach(id => {
        nextAttendance[id] = present
      })
      setAttendance(nextAttendance)
      setRecordDates(prev => new Set([...prev, selectedDate]))
      flash(setSaveMsg, 'All updated')
    } catch (e) {
      flash(setError, e.message || 'Failed')
    }
  }

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalYear(year => year - 1)
      setCalMonth(11)
    } else {
      setCalMonth(month => month - 1)
    }
  }

  const nextMonth = () => {
    const now = new Date()
    if (calYear === now.getFullYear() && calMonth === now.getMonth()) return
    if (calMonth === 11) {
      setCalYear(year => year + 1)
      setCalMonth(0)
    } else {
      setCalMonth(month => month + 1)
    }
  }

  const isCurrentMonth = calYear === nowDate.getFullYear() && calMonth === nowDate.getMonth()
  const weeks = buildCalendarWeeks(calYear, calMonth)
  const presentCount = students.filter(student => attendance[student.studentId]).length
  const absentCount = students.length - presentCount
  const isPast = selectedDate && selectedDate < today
  const canEdit = isAdmin && selectedDate && (isPast || !isOffDay)

  return (
    <div className="fade-in">
      <div className="mb-5 sm:mb-6">
        <h1 className="font-condensed font-black text-3xl uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
          Attendance History
        </h1>
        <p className="text-xs tracking-widest uppercase mt-1" style={{ color: 'var(--muted)' }}>
          {isAdmin ? 'Select a date to view or edit attendance' : 'Select a date to view past attendance'}
        </p>
      </div>

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: '#0d1014' }}>
            <button onClick={prevMonth} className="font-condensed font-bold text-sm px-3 py-2 transition-all" style={{ color: 'var(--muted)', background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer' }}>
              Prev
            </button>
            <span className="font-condensed font-bold text-sm tracking-widest uppercase text-center" style={{ color: 'var(--text)' }}>
              {MONTH_FULL[calMonth]} {calYear}
            </span>
            <button onClick={nextMonth} disabled={isCurrentMonth} className="font-condensed font-bold text-sm px-3 py-2 transition-all" style={{ color: isCurrentMonth ? 'var(--border)' : 'var(--muted)', background: 'transparent', border: '1px solid var(--border)', cursor: isCurrentMonth ? 'not-allowed' : 'pointer' }}>
              Next
            </button>
          </div>

          <div className="grid grid-cols-7 px-2 sm:px-3 pt-3 pb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center font-condensed font-bold text-xs tracking-widest" style={{ color: 'var(--muted)' }}>
                {day}
              </div>
            ))}
          </div>

          <div className="px-2 sm:px-3 pb-3 space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIndex) => {
                  if (!day) return <div key={dayIndex} />

                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const isToday = dateStr === today
                  const isFuture = dateStr > today
                  const isSelected = dateStr === selectedDate
                  const hasRecord = recordDates.has(dateStr)

                  return (
                    <button key={dayIndex} disabled={isFuture} onClick={() => !isFuture && selectDate(dateStr)} className="relative flex flex-col items-center justify-center h-11 sm:h-10 transition-all font-condensed font-bold text-sm" style={{ cursor: isFuture ? 'not-allowed' : 'pointer', background: isSelected ? 'var(--accent)' : isToday ? 'rgba(245,166,35,0.12)' : 'transparent', border: `1px solid ${isSelected ? 'var(--accent)' : isToday ? 'rgba(245,166,35,0.3)' : 'transparent'}`, color: isSelected ? '#000' : isFuture ? 'var(--border)' : isToday ? 'var(--accent)' : 'var(--text)' }}>
                      {day}
                      {hasRecord && !isSelected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)' }} />}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div>
          {!selectedDate ? (
            <div className="flex items-center justify-center h-56 sm:h-64" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--border)' }}>
              <div className="text-center">
                <div className="font-condensed font-bold text-sm tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                  Select a date
                </div>
              </div>
            </div>
          ) : dateLoading ? (
            <div className="flex items-center justify-center h-56 sm:h-64" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="font-condensed text-sm tracking-widest uppercase animate-pulse" style={{ color: 'var(--muted)' }}>
                Loading...
              </div>
            </div>
          ) : (
            <div>
              <div className="px-4 py-4 sm:px-5 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${isPast ? 'var(--muted)' : 'var(--accent)'}` }}>
                <div>
                  <div className="font-condensed font-black text-lg sm:text-xl uppercase tracking-widest" style={{ color: isPast ? 'var(--text)' : 'var(--accent)' }}>
                    {fmtDate(selectedDate)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {isPast && <Tag label="Past" color="var(--muted)" border="var(--border)" bg="transparent" />}
                    {isOffDay && !isPast && <Tag label="Off Day" color="var(--accent2)" border="rgba(224,60,60,0.3)" bg="rgba(224,60,60,0.07)" />}
                    {isAdmin && isPast && <Tag label="Editable" color="var(--accent)" border="rgba(245,166,35,0.3)" bg="rgba(245,166,35,0.07)" />}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatChip label="Present" value={presentCount} color="var(--green)" />
                  <StatChip label="Absent" value={absentCount} color="var(--accent2)" />
                </div>
              </div>

              {canEdit && (
                <div className="flex gap-2 mb-3">
                  <ABtn onClick={() => markAll(true)} label="All Present" color="var(--green)" />
                  <ABtn onClick={() => markAll(false)} label="All Absent" color="var(--muted)" />
                </div>
              )}

              {error && <Msg type="error" text={error} />}
              {saveMsg && <Msg type="success" text={saveMsg} />}

              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div className="hidden sm:grid px-4 py-2.5 font-condensed font-bold text-xs tracking-widest uppercase" style={{ gridTemplateColumns: canEdit ? '44px 1fr 88px 108px 52px' : '44px 1fr 88px 108px', background: '#0d1014', borderBottom: `2px solid ${isPast ? 'var(--muted)' : 'var(--accent)'}`, color: 'var(--muted)' }}>
                  <div>#</div>
                  <div>Name</div>
                  <div>ID</div>
                  <div>Status</div>
                  {canEdit && <div />}
                </div>

                {students.length === 0 ? (
                  <div className="px-4 py-8 text-center font-condensed text-sm tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                    No student data found
                  </div>
                ) : students.map((student, idx) => {
                  const present = Boolean(attendance[student.studentId])
                  const isFirst = idx === 0
                  const isMarking = markingId === student.studentId

                  return (
                    <div key={student._id} className="student-row px-4 py-3 sm:grid sm:items-center" style={{ gridTemplateColumns: canEdit ? '44px 1fr 88px 108px 52px' : '44px 1fr 88px 108px', borderBottom: '1px solid var(--border)', borderLeft: isFirst && !isPast ? '3px solid var(--accent)' : '3px solid transparent', background: present ? 'rgba(34,197,94,0.04)' : 'transparent' }}>
                      <div className="flex items-start justify-between gap-3 sm:contents">
                        <div className="font-condensed font-black text-xl leading-none" style={{ color: isFirst && !isPast ? 'var(--accent)' : 'var(--muted)' }}>
                          {String(idx + 1).padStart(2, '0')}
                        </div>
                        <div className="min-w-0 flex-1 sm:block">
                          <div className="text-sm" style={{ color: 'var(--text)', fontWeight: isFirst && !isPast ? 700 : 400 }}>{student.name}</div>
                          <div className="mt-1 sm:hidden font-condensed text-xs tracking-wider uppercase" style={{ color: 'var(--muted)' }}>{student.studentId}</div>
                        </div>
                        {canEdit && (
                          <button onClick={() => toggleAttendance(student.studentId)} disabled={isMarking} className="sm:hidden w-10 h-10 flex items-center justify-center transition-all font-condensed font-bold text-sm" style={{ border: `1px solid ${present ? 'var(--green)' : 'var(--border)'}`, color: present ? 'var(--green)' : 'var(--muted)', background: present ? 'rgba(34,197,94,0.1)' : 'transparent', cursor: isMarking ? 'wait' : 'pointer', opacity: isMarking ? 0.5 : 1 }}>
                            {isMarking ? '...' : present ? 'Yes' : 'No'}
                          </button>
                        )}
                      </div>
                      <div className="hidden sm:block text-sm" style={{ color: 'var(--text)', fontWeight: isFirst && !isPast ? 700 : 400 }}>{student.name}</div>
                      <div className="hidden sm:block font-condensed text-xs tracking-wider uppercase" style={{ color: 'var(--muted)' }}>{student.studentId}</div>
                      <div className="mt-2 sm:mt-0">
                        <span className="inline-flex items-center gap-1.5 font-condensed font-bold text-xs tracking-widest uppercase" style={{ color: present ? 'var(--green)' : 'var(--muted)' }}>
                          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: present ? 'var(--green)' : 'var(--muted)', boxShadow: present ? '0 0 6px var(--green)' : 'none' }} />
                          {present ? 'Present' : 'Absent'}
                        </span>
                      </div>
                      {canEdit && (
                        <button onClick={() => toggleAttendance(student.studentId)} disabled={isMarking} className="hidden sm:flex w-9 h-9 items-center justify-center transition-all font-condensed font-bold text-sm" style={{ border: `1px solid ${present ? 'var(--green)' : 'var(--border)'}`, color: present ? 'var(--green)' : 'var(--muted)', background: present ? 'rgba(34,197,94,0.1)' : 'transparent', cursor: isMarking ? 'wait' : 'pointer', opacity: isMarking ? 0.5 : 1 }}>
                          {isMarking ? '...' : present ? 'Yes' : 'No'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Tag({ label, color, border, bg }) {
  return (
    <span className="font-condensed font-bold text-xs tracking-widest uppercase px-2 py-1" style={{ border: `1px solid ${border}`, color, background: bg }}>
      {label}
    </span>
  )
}

function StatChip({ label, value, color }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 font-condensed font-bold text-xs tracking-widest uppercase" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
      {label} <span className="text-base" style={{ color }}>{value}</span>
    </div>
  )
}

function ABtn({ onClick, label, color }) {
  return (
    <button onClick={onClick} className="flex-1 sm:flex-none font-condensed font-bold text-xs tracking-widest uppercase px-3 py-2 transition-all" style={{ border: `1px solid ${color}`, color, background: 'transparent', cursor: 'pointer' }}>
      {label}
    </button>
  )
}

function Msg({ type, text }) {
  const isErr = type === 'error'
  return (
    <div className="px-3 py-2 text-xs font-medium tracking-wide mb-3" style={{ background: isErr ? 'rgba(224,60,60,0.1)' : 'rgba(34,197,94,0.08)', border: `1px solid ${isErr ? 'rgba(224,60,60,0.3)' : 'rgba(34,197,94,0.3)'}`, color: isErr ? 'var(--accent2)' : 'var(--green)' }}>
      {text}
    </div>
  )
}
