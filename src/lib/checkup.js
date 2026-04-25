import Settings from '@/models/Settings'
import Student from '@/models/Student'
import { DEFAULT_SIDE, normalizeSide } from '@/lib/sides'
import { getOffDays, isOffDay } from '@/utils/rotation'

const CHECKUP_KEY = 'checkup'

function resolveSide(side) {
  return normalizeSide(side) || DEFAULT_SIDE
}

function createEmptyState() {
  return {
    groups: [],
    currentIndex: 0,
    lastAdvancedDate: null,
  }
}

function nextWorkingDay(offDays, dateStr) {
  let date = new Date(`${dateStr}T00:00:00`)
  while (true) {
    date.setDate(date.getDate() + 1)
    const nextDate = date.toISOString().slice(0, 10)
    if (!isOffDay(offDays, nextDate)) return nextDate
  }
}

export async function getCheckupState(side) {
  const activeSide = resolveSide(side)
  const record = await Settings.findOne({ side: activeSide, key: CHECKUP_KEY }).lean()
  return record?.value || createEmptyState()
}

export async function setCheckupState(side, state) {
  const activeSide = resolveSide(side)
  await Settings.findOneAndUpdate(
    { side: activeSide, key: CHECKUP_KEY },
    { value: state },
    { upsert: true }
  )
}

export async function saveCheckupGroups(side, groups, effectiveDate, startIndex = 0) {
  const activeSide = resolveSide(side)
  const date = effectiveDate || new Date().toISOString().slice(0, 10)
  const offDays = await getOffDays(activeSide)
  const safeIndex = groups.length > 0 ? Math.min(Math.max(Number(startIndex) || 0, 0), groups.length - 1) : 0
  const nextState = {
    groups,
    currentIndex: safeIndex,
    lastAdvancedDate: groups.length > 0 && !isOffDay(offDays, date) ? date : null,
  }
  await setCheckupState(activeSide, nextState)
  return nextState
}

export async function getCheckupForDate(side, date) {
  const activeSide = resolveSide(side)
  const offDays = await getOffDays(activeSide)
  const state = await getCheckupState(activeSide)
  const groups = Array.isArray(state.groups) ? state.groups : []

  if (groups.length === 0) {
    return { ...createEmptyState(), groups, currentGroup: null }
  }

  let currentIndex = Math.min(state.currentIndex || 0, groups.length - 1)
  let lastAdvancedDate = state.lastAdvancedDate || null

  if (!isOffDay(offDays, date)) {
    if (!lastAdvancedDate) {
      lastAdvancedDate = date
    } else {
      let nextDate = nextWorkingDay(offDays, lastAdvancedDate)
      while (nextDate <= date) {
        currentIndex = (currentIndex + 1) % groups.length
        lastAdvancedDate = nextDate
        nextDate = nextWorkingDay(offDays, lastAdvancedDate)
      }
    }
  }

  if (currentIndex !== state.currentIndex || lastAdvancedDate !== state.lastAdvancedDate) {
    await setCheckupState(activeSide, { groups, currentIndex, lastAdvancedDate })
  }

  return {
    groups,
    currentIndex,
    lastAdvancedDate,
    currentGroup: groups[currentIndex] || null,
  }
}

export async function expandCheckupGroups(side, groups) {
  const activeSide = resolveSide(side)
  const studentIds = [...new Set(groups.flat())]
  if (studentIds.length === 0) return []

  const students = await Student.find({ side: activeSide, active: true, studentId: { $in: studentIds } })
    .sort({ slotOrder: 1 })
    .lean()

  const studentMap = new Map(students.map(student => [student.studentId, student]))
  return groups.map(group => group.map(studentId => studentMap.get(studentId)).filter(Boolean)).filter(group => group.length > 0)
}
