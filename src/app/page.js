'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { enqueueAttendanceMutation, getPendingSyncCount, readOfflineSnapshot, saveOfflineSnapshot } from '@/lib/offlineSync'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(str) {
  const d = new Date(`${str}T00:00:00`)
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
  const [notice, setNotice] = useState('')
  const [noticeType, setNoticeType] = useState('info')
  const [lastUpdated, setLastUpdated] = useState(null)

  const showNotice = (text, type = 'info', ms = 3200) => {
    setNotice(text)
    setNoticeType(type)
    if (ms > 0) setTimeout(() => setNotice(''), ms)
  }

  const applySnapshot = (snapshot) => {
    const value = snapshot?.value
    if (!value) return false
    setStudents(value.students || [])
    setAttendance(value.attendance || {})
    setIsOffDay(value.isOffDay || false)
    setLastUpdated(snapshot.savedAt ? new Date(snapshot.savedAt) : null)
    return true
  }

  const fetchData = useCallback(async () => {
    try {
      const [studentsRes, attendanceRes] = await Promise.all([
        fetch(`/api/students?date=${date}`),
        fetch(`/api/attendance?date=${date}`),
      ])
      const studentsData = await studentsRes.json()
      const attendanceData = await attendanceRes.json()
      const snapshot = {
        students: studentsData.students || [],
        isOffDay: studentsData.isOffDay || false,
        attendance: attendanceData.attendance || {},
      }

      setStudents(snapshot.students)
      setIsOffDay(snapshot.isOffDay)
      setAttendance(snapshot.attendance)
      setLastUpdated(new Date())
      setError('')
      saveOfflineSnapshot(`today:${date}`, snapshot)
    } catch {
      const snapshot = readOfflineSnapshot(`today:${date}`)
      if (!applySnapshot(snapshot)) {
        setError('Failed to load data')
      } else {
        showNotice('Loaded the latest cached data for offline use.', 'info')
      }
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  useEffect(() => {
    const handleOnline = () => {
      if (getPendingSyncCount() > 0) {
        showNotice('Back online. Pending attendance changes will sync automatically.', 'success')
      }
      fetchData()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [fetchData])

  const saveTodaySnapshot = (nextAttendance) => {
    saveOfflineSnapshot(`today:${date}`, {
      students,
      isOffDay,
      attendance: nextAttendance,
    })
  }

  const queueSingleChange = (studentId, present) => {
    const nextAttendance = { ...attendance, [studentId]: present }
    setAttendance(nextAttendance)
    saveTodaySnapshot(nextAttendance)
    enqueueAttendanceMutation({ type: 'mark', payload: { date, studentId, present } })
    showNotice('Saved offline. It will sync when the phone is online.', 'success')
  }

  const queueBulkChange = (present) => {
    const nextAttendance = {}
    students.forEach(student => {
      nextAttendance[student.studentId] = present
    })
    setAttendance(nextAttendance)
    saveTodaySnapshot(nextAttendance)
    enqueueAttendanceMutation({
      type: 'mark-all',
      payload: { date, studentIds: students.map(student => student.studentId), present },
    })
    showNotice('Bulk update saved offline. It will sync when the phone is online.', 'success')
  }

  const toggleAttendance = async (studentId) => {
    if (!isAdmin || isOffDay) return
    const present = !attendance[studentId]

    if (!navigator.onLine) {
      queueSingleChange(studentId, present)
      return
    }

    setMarkingId(studentId)
    try {
      const res = await authFetch('/api/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({ date, studentId, present }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      const nextAttendance = { ...attendance, [studentId]: present }
      setAttendance(nextAttendance)
      saveTodaySnapshot(nextAttendance)
    } catch (e) {
      if (!navigator.onLine) {
        queueSingleChange(studentId, present)
      } else {
        setError(e.message || 'Failed to update')
        setTimeout(() => setError(''), 3000)
      }
    } finally {
      setMarkingId(null)
    }
  }

  const markAll = async (present) => {
    if (!isAdmin || isOffDay) return
    const studentIds = students.map(student => student.studentId)

    if (!navigator.onLine) {
      queueBulkChange(present)
      return
    }

    try {
      const res = await authFetch('/api/attendance/mark-all', {
        method: 'POST',
        body: JSON.stringify({ date, studentIds, present }),
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
      saveTodaySnapshot(nextAttendance)
    } catch (e) {
      if (!navigator.onLine) {
        queueBulkChange(present)
      } else {
        setError(e.message || 'Failed to update')
        setTimeout(() => setError(''), 3000)
      }
    }
  }

  const presentCount = students.filter(student => attendance[student.studentId]).length
  const absentCount = students.length - presentCount
  const dayName = DAY_NAMES[new Date(`${date}T00:00:00`).getDay()]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="font-condensed text-sm tracking-widest uppercase animate-pulse" style={{ color: 'var(--muted)' }}>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="mb-5 px-4 py-4 sm:mb-6 sm:px-6 sm:py-5 relative overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--accent)' }}>
        <div className="absolute right-0 top-0 bottom-0 items-center pr-6 pointer-events-none select-none hidden sm:flex">
          <span className="font-condensed font-black text-8xl opacity-[0.04] tracking-widest uppercase">ATTENDANCE</span>
        </div>
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="font-condensed font-black text-2xl sm:text-3xl uppercase tracking-widest mb-1" style={{ color: 'var(--accent)' }}>
              {dayName}
            </div>
            <div className="font-condensed text-base sm:text-lg font-bold tracking-wider" style={{ color: 'var(--text)' }}>
              {formatDate(date)}
            </div>
            {lastUpdated && (
              <div className="text-[11px] sm:text-xs mt-1 tracking-wider uppercase" style={{ color: 'var(--muted)' }}>
                Last refresh {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
          <span className="inline-flex w-fit font-condensed font-bold text-xs tracking-widest uppercase px-3 py-1.5" style={{ border: `1px solid ${isOffDay ? 'rgba(224,60,60,0.4)' : 'rgba(34,197,94,0.4)'}`, background: isOffDay ? 'rgba(224,60,60,0.08)' : 'rgba(34,197,94,0.08)', color: isOffDay ? 'var(--accent2)' : 'var(--green)' }}>
            {isOffDay ? 'Off day' : 'Working day'}
          </span>
        </div>
      </div>

      {notice && <Banner type={noticeType} text={notice} />}
      {error && <Banner type="error" text={error} />}

      {isOffDay && (
        <div className="mb-4 px-4 py-3 text-sm font-medium" style={{ background: 'rgba(224,60,60,0.07)', border: '1px solid rgba(224,60,60,0.25)', borderLeft: '3px solid var(--accent2)', color: 'var(--accent2)' }}>
          Off day. Attendance cannot be marked. The list will reverse on the next working day.
        </div>
      )}

      {students.length > 0 && !isOffDay && (
        <div className="mb-4 px-4 py-3 flex items-start gap-3" style={{ background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.2)', borderLeft: '3px solid var(--accent)' }}>
          <span className="font-condensed font-black text-lg" style={{ color: 'var(--accent)' }}>01</span>
          <div className="min-w-0">
            <div className="font-condensed font-black text-base tracking-wide uppercase" style={{ color: 'var(--accent)' }}>
              {students[0].name}
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              First slot today. The order reverses automatically on each working day.
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
        <StatChip label="Present" value={presentCount} color="var(--green)" />
        <StatChip label="Absent" value={absentCount} color="var(--accent2)" />
        <StatChip label="Total" value={students.length} color="var(--muted)" />
        {isAdmin && !isOffDay && (
          <div className="flex w-full sm:w-auto gap-2 sm:ml-auto">
            <ActionBtn onClick={() => markAll(true)} label="All Present" color="var(--green)" />
            <ActionBtn onClick={() => markAll(false)} label="All Absent" color="var(--muted)" />
          </div>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div className="hidden sm:grid px-4 py-2.5 font-condensed font-bold text-xs tracking-widest uppercase" style={{ gridTemplateColumns: isAdmin ? '48px 1fr 90px 110px 52px' : '48px 1fr 90px 110px', background: '#0d1014', borderBottom: '2px solid var(--accent)', color: 'var(--muted)' }}>
          <div>#</div>
          <div>Name</div>
          <div>ID</div>
          <div>Status</div>
          {isAdmin && <div />}
        </div>

        {students.map((student, idx) => {
          const present = Boolean(attendance[student.studentId])
          const isFirst = idx === 0
          const isMarking = markingId === student.studentId

          return (
            <div
              key={student._id}
              className="student-row px-4 py-3 sm:grid sm:items-center"
              style={{ gridTemplateColumns: isAdmin ? '48px 1fr 90px 110px 52px' : '48px 1fr 90px 110px', borderBottom: '1px solid var(--border)', borderLeft: isFirst ? '3px solid var(--accent)' : '3px solid transparent', background: present ? 'rgba(34,197,94,0.04)' : 'transparent' }}
            >
              <div className="flex items-start justify-between gap-3 sm:contents">
                <div className="font-condensed font-black text-2xl leading-none sm:block" style={{ color: isFirst ? 'var(--accent)' : 'var(--muted)' }}>
                  {String(idx + 1).padStart(2, '0')}
                </div>
                <div className="min-w-0 flex-1 sm:block">
                  <div className="text-sm" style={{ color: 'var(--text)', fontWeight: isFirst ? 700 : 400 }}>{student.name}</div>
                  <div className="mt-1 text-[11px] font-condensed tracking-wider uppercase sm:hidden" style={{ color: 'var(--muted)' }}>
                    {student.studentId}
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => toggleAttendance(student.studentId)}
                    disabled={isOffDay || isMarking}
                    className="sm:hidden w-10 h-10 flex items-center justify-center transition-all font-condensed font-bold text-sm shrink-0"
                    style={{ border: `1px solid ${present ? 'var(--green)' : 'var(--border)'}`, color: present ? 'var(--green)' : 'var(--muted)', background: present ? 'rgba(34,197,94,0.1)' : 'transparent', cursor: isOffDay ? 'not-allowed' : 'pointer', opacity: isMarking ? 0.5 : 1 }}
                  >
                    {isMarking ? '...' : present ? 'Yes' : 'No'}
                  </button>
                )}
              </div>

              <div className="hidden sm:block text-sm" style={{ color: 'var(--text)', fontWeight: isFirst ? 700 : 400 }}>{student.name}</div>
              <div className="hidden sm:block font-condensed text-xs tracking-wider uppercase" style={{ color: 'var(--muted)' }}>{student.studentId}</div>
              <div className="mt-2 sm:mt-0">
                <span className="inline-flex items-center gap-1.5 font-condensed font-bold text-xs tracking-widest uppercase" style={{ color: present ? 'var(--green)' : 'var(--muted)' }}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: present ? 'var(--green)' : 'var(--muted)', boxShadow: present ? '0 0 6px var(--green)' : 'none' }} />
                  {present ? 'Present' : 'Absent'}
                </span>
              </div>
              {isAdmin && (
                <div className="hidden sm:block">
                  <button
                    onClick={() => toggleAttendance(student.studentId)}
                    disabled={isOffDay || isMarking}
                    className="w-9 h-9 flex items-center justify-center transition-all font-condensed font-bold text-sm"
                    style={{ border: `1px solid ${present ? 'var(--green)' : 'var(--border)'}`, color: present ? 'var(--green)' : 'var(--muted)', background: present ? 'rgba(34,197,94,0.1)' : 'transparent', cursor: isOffDay ? 'not-allowed' : 'pointer', opacity: isMarking ? 0.5 : 1 }}
                  >
                    {isMarking ? '...' : present ? 'Yes' : 'No'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!isAdmin && (
        <div className="mt-4 text-center font-condensed text-xs tracking-widest uppercase px-2" style={{ color: 'var(--muted)' }}>
          View only. Admin login is required to mark attendance.
        </div>
      )}
    </div>
  )
}

function Banner({ type, text }) {
  const colors = type === 'error'
    ? { background: 'rgba(224,60,60,0.1)', border: 'rgba(224,60,60,0.3)', color: 'var(--accent2)' }
    : type === 'success'
      ? { background: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.3)', color: 'var(--green)' }
      : { background: 'rgba(245,166,35,0.08)', border: 'rgba(245,166,35,0.25)', color: 'var(--accent)' }

  return (
    <div className="mb-4 px-4 py-3 text-sm" style={{ background: colors.background, border: `1px solid ${colors.border}`, color: colors.color }}>
      {text}
    </div>
  )
}

function StatChip({ label, value, color }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 font-condensed font-bold text-xs tracking-widest uppercase" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
      {label} <span className="text-base" style={{ color }}>{value}</span>
    </div>
  )
}

function ActionBtn({ onClick, label, color }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 sm:flex-none font-condensed font-bold text-xs tracking-widest uppercase px-3 py-2 transition-all"
      style={{ border: `1px solid ${color}`, color, background: 'transparent', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}18` }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {label}
    </button>
  )
}
