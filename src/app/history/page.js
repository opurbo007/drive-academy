'use client'
import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getSideLabel, getSideMeta, normalizeSide } from '@/lib/sides'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(str) {
  const date = new Date(`${str}T00:00:00`)
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_SHORT[date.getMonth()]} ${date.getFullYear()}`
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function buildCalendarWeeks(year, month) {
  const first = new Date(year, month, 1).getDay()
  const days = daysInMonth(year, month)
  const cells = []
  for (let index = 0; index < first; index += 1) cells.push(null)
  for (let day = 1; day <= days; day += 1) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7))
  return weeks
}

function normalizeStatus(value) {
  return typeof value === 'boolean' ? value : null
}

function getNextStudentId(students, attendance) {
  return students.find(student => normalizeStatus(attendance[student.studentId]) === null)?._id || null
}

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryPageContent />
    </Suspense>
  )
}

function HistoryPageContent() {
  const { isAdmin, authFetch, user } = useAuth()
  const searchParams = useSearchParams()
  const side = normalizeSide(searchParams.get('side'))
  const sideMeta = side ? getSideMeta(side) : null

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

  const canEdit = isAdmin && user?.side === side

  const flash = (setter, message, ms = 2500) => {
    setter(message)
    setTimeout(() => setter(''), ms)
  }

  useEffect(() => {
    if (!side) return
    fetch(`/api/attendance/dates?side=${side}`)
      .then(response => response.json())
      .then(data => setRecordDates(new Set(data.dates || [])))
      .catch(() => {})
  }, [side])

  const loadDate = useCallback(async date => {
    if (!side) return
    setDateLoading(true)
    setError('')
    setSaveMsg('')
    try {
      const response = await fetch(`/api/attendance/by-date?date=${date}&side=${side}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load attendance')
      setStudents(data.students || [])
      setAttendance(data.attendance || {})
      setIsOffDay(data.isOffDay || false)
    } catch (requestError) {
      setError(requestError.message || 'Failed to load attendance')
    } finally {
      setDateLoading(false)
    }
  }, [side])

  const selectDate = date => {
    setSelectedDate(date)
    loadDate(date)
  }

  const setAttendanceStatus = async (studentId, nextStatus) => {
    if (!canEdit) return
    const isPast = selectedDate < today
    if (!isPast && isOffDay) return

    setMarkingId(studentId)
    try {
      const response = await authFetch(`/api/attendance/mark?side=${side}`, {
        method: 'POST',
        body: JSON.stringify({ date: selectedDate, studentId, present: nextStatus }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save')

      setAttendance(prev => {
        const next = { ...prev }
        if (nextStatus === null) delete next[studentId]
        else next[studentId] = nextStatus
        return next
      })
      setRecordDates(prev => new Set([...prev, selectedDate]))
      flash(setSaveMsg, 'Saved')
    } catch (requestError) {
      flash(setError, requestError.message || 'Failed to save')
    } finally {
      setMarkingId(null)
    }
  }

  const markAll = async present => {
    if (!canEdit) return
    try {
      const studentIds = students.map(student => student.studentId)
      const response = await authFetch(`/api/attendance/mark-all?side=${side}`, {
        method: 'POST',
        body: JSON.stringify({ date: selectedDate, studentIds, present }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed')

      const nextAttendance = {}
      studentIds.forEach(studentId => {
        nextAttendance[studentId] = present
      })
      setAttendance(nextAttendance)
      setRecordDates(prev => new Set([...prev, selectedDate]))
      flash(setSaveMsg, 'All updated')
    } catch (requestError) {
      flash(setError, requestError.message || 'Failed')
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

  if (!sideMeta) {
    return (
      <div className="fade-in space-y-4">
        <div className="mobile-card p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--accent)' }}>
          <div className="font-condensed font-black text-2xl tracking-[0.18em] uppercase" style={{ color: 'var(--accent)' }}>
            History
          </div>
          <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
            Open Abdul or Saidul first to view attendance history.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/history?side=abdul" className="mobile-card text-center font-condensed font-black text-sm tracking-widest uppercase px-4 py-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            Abdul
          </Link>
          <Link href="/history?side=saidul" className="mobile-card text-center font-condensed font-black text-sm tracking-widest uppercase px-4 py-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            Saidul
          </Link>
        </div>
      </div>
    )
  }

  const isCurrentMonth = calYear === nowDate.getFullYear() && calMonth === nowDate.getMonth()
  const weeks = buildCalendarWeeks(calYear, calMonth)
  const presentCount = students.filter(student => normalizeStatus(attendance[student.studentId]) === true).length
  const absentCount = students.filter(student => normalizeStatus(attendance[student.studentId]) === false).length
  const blankCount = students.length - presentCount - absentCount
  const isPast = selectedDate && selectedDate < today
  const editThisDate = canEdit && selectedDate && (isPast || !isOffDay)
  const nextStudentId = getNextStudentId(students, attendance)

  return (
    <div className="fade-in space-y-4">
      <div className="mobile-card px-5 py-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${sideMeta.accent}` }}>
        <div className="font-condensed font-black text-xs tracking-[0.28em] uppercase" style={{ color: 'var(--muted)' }}>
          {getSideLabel(side)}
        </div>
        <h1 className="font-condensed font-black text-3xl tracking-[0.14em] uppercase mt-2" style={{ color: sideMeta.accent }}>
          History
        </h1>
        <p className="text-xs tracking-[0.22em] uppercase mt-2" style={{ color: 'var(--muted)' }}>
          {canEdit ? 'View or edit old attendance' : 'View past attendance'}
        </p>
      </div>

      <div className="mobile-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: '#0d1014' }}>
          <button onClick={prevMonth} className="mobile-card font-condensed font-bold text-sm px-3 py-2" style={{ color: 'var(--muted)', background: 'transparent', border: '1px solid var(--border)' }}>
            Prev
          </button>
          <span className="font-condensed font-bold text-sm tracking-[0.18em] uppercase text-center" style={{ color: 'var(--text)' }}>
            {MONTH_FULL[calMonth]} {calYear}
          </span>
          <button onClick={nextMonth} disabled={isCurrentMonth} className="mobile-card font-condensed font-bold text-sm px-3 py-2" style={{ color: isCurrentMonth ? 'var(--border)' : 'var(--muted)', background: 'transparent', border: '1px solid var(--border)' }}>
            Next
          </button>
        </div>

        <div className="grid grid-cols-7 px-3 pt-3 pb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div key={`${day}-${index}`} className="text-center font-condensed font-bold text-xs tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
              {day}
            </div>
          ))}
        </div>

        <div className="px-3 pb-3 space-y-1">
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
                  <button
                    key={dayIndex}
                    disabled={isFuture}
                    onClick={() => !isFuture && selectDate(dateStr)}
                    className="relative flex flex-col items-center justify-center h-11 transition-all font-condensed font-bold text-sm rounded-2xl"
                    style={{
                      cursor: isFuture ? 'not-allowed' : 'pointer',
                      background: isSelected ? sideMeta.accent : isToday ? 'rgba(245,166,35,0.12)' : 'transparent',
                      border: `1px solid ${isSelected ? sideMeta.accent : isToday ? 'rgba(245,166,35,0.3)' : 'transparent'}`,
                      color: isSelected ? '#000' : isFuture ? 'var(--border)' : isToday ? 'var(--accent)' : 'var(--text)',
                    }}
                  >
                    {day}
                    {hasRecord && !isSelected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)' }} />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {!selectedDate ? (
        <div className="mobile-card flex items-center justify-center h-40" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="font-condensed font-bold text-sm tracking-[0.22em] uppercase" style={{ color: 'var(--muted)' }}>
            Select a date
          </div>
        </div>
      ) : dateLoading ? (
        <div className="mobile-card flex items-center justify-center h-40" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="font-condensed text-sm tracking-widest uppercase animate-pulse" style={{ color: 'var(--muted)' }}>
            Loading...
          </div>
        </div>
      ) : (
        <>
          <div className="mobile-card px-4 py-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${isPast ? 'var(--muted)' : sideMeta.accent}` }}>
            <div className="font-condensed font-black text-lg uppercase tracking-[0.14em]" style={{ color: isPast ? 'var(--text)' : sideMeta.accent }}>
              {fmtDate(selectedDate)}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <StatChip label="P" value={presentCount} color="var(--green)" />
              <StatChip label="A" value={absentCount} color="var(--accent2)" />
              <StatChip label="B" value={blankCount} color="var(--muted)" />
            </div>
          </div>

          {editThisDate && (
            <div className="grid grid-cols-2 gap-2">
              <ABtn onClick={() => markAll(true)} label="All P" color="var(--green)" />
              <ABtn onClick={() => markAll(false)} label="All A" color="var(--accent2)" />
            </div>
          )}

          {error && <Msg type="error" text={error} />}
          {saveMsg && <Msg type="success" text={saveMsg} />}

          <div className="space-y-3">
              <div className="mobile-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {students.map((student, index) => {
                  const status = normalizeStatus(attendance[student.studentId])
                  const isCurrent = nextStudentId === student._id
                  const isMarking = markingId === student.studentId
                  const order = index + 1

                  return (
                    <div key={student._id} className="student-row px-4 py-3 flex items-center gap-3" style={{ borderTop: index > 0 ? '1px solid var(--border)' : 'none', borderLeft: isCurrent ? `3px solid ${sideMeta.accent}` : '3px solid transparent', background: status === true ? 'rgba(34,197,94,0.04)' : status === false ? 'rgba(224,60,60,0.04)' : 'transparent' }}>
                      <div className="font-condensed font-black text-xl leading-none shrink-0" style={{ color: isCurrent ? sideMeta.accent : 'var(--muted)' }}>
                        {String(order).padStart(2, '0')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm" style={{ color: 'var(--text)', fontWeight: isCurrent ? 700 : 400 }}>{student.name}</div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--muted)' }}>{student.studentId}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {editThisDate ? (
                          <div className="flex gap-1">
                            <StatusBtn label="P" active={status === true} disabled={isMarking} onClick={() => setAttendanceStatus(student.studentId, status === true ? null : true)} />
                            <StatusBtn label="A" active={status === false} tone="danger" disabled={isMarking} onClick={() => setAttendanceStatus(student.studentId, status === false ? null : false)} />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatChip({ label, value, color }) {
  return (
    <div className="mobile-card flex flex-col items-center justify-center px-2 py-3 font-condensed font-bold text-[11px] tracking-[0.22em] uppercase" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
      <span>{label}</span>
      <span className="text-lg mt-1" style={{ color }}>{value}</span>
    </div>
  )
}

function ABtn({ onClick, label, color }) {
  return (
    <button onClick={onClick} className="mobile-card font-condensed font-bold text-xs tracking-[0.24em] uppercase px-3 py-3 transition-all" style={{ border: `1px solid ${color}`, color, background: 'transparent', cursor: 'pointer' }}>
      {label}
    </button>
  )
}

function Msg({ type, text }) {
  const isErr = type === 'error'
  return (
    <div className="mobile-card px-3 py-3 text-xs font-medium tracking-wide" style={{ background: isErr ? 'rgba(224,60,60,0.1)' : 'rgba(34,197,94,0.08)', border: `1px solid ${isErr ? 'rgba(224,60,60,0.3)' : 'rgba(34,197,94,0.3)'}`, color: isErr ? 'var(--accent2)' : 'var(--green)' }}>
      {text}
    </div>
  )
}

function StatusBtn({ label, active, onClick, disabled = false, tone = 'success' }) {
  const activeColor = tone === 'danger' ? 'var(--accent2)' : 'var(--green)'
  return (
    <button onClick={onClick} disabled={disabled} className="w-10 h-10 flex items-center justify-center font-condensed font-black text-xs transition-all rounded-2xl" style={{ border: `1px solid ${active ? activeColor : 'var(--border)'}`, color: active ? activeColor : 'var(--muted)', background: active ? `${tone === 'danger' ? 'rgba(224,60,60,0.12)' : 'rgba(34,197,94,0.12)'}` : 'transparent', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
      {label}
    </button>
  )
}
