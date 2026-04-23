import Settings from '../models/Settings'
import Student from '../models/Student'
import { DEFAULT_SIDE, normalizeSide } from '@/lib/sides'

function resolveSide(side) {
  return normalizeSide(side) || DEFAULT_SIDE
}

export async function getOffDays(side) {
  const activeSide = resolveSide(side)
  const s = await Settings.findOne({ side: activeSide, key: 'offDays' })
  return s ? s.value : [5, 6] // default: Fri, Sat
}

export async function setOffDays(side, days) {
  const activeSide = resolveSide(side)
  await Settings.findOneAndUpdate({ side: activeSide, key: 'offDays' }, { value: days }, { upsert: true })
}

export function isOffDay(offDays, dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return offDays.includes(d.getDay())
}

export async function getLastRotationDate(side) {
  const activeSide = resolveSide(side)
  const s = await Settings.findOne({ side: activeSide, key: 'lastRotationDate' })
  return s ? s.value : null
}

export async function setLastRotationDate(side, date) {
  const activeSide = resolveSide(side)
  await Settings.findOneAndUpdate({ side: activeSide, key: 'lastRotationDate' }, { value: date }, { upsert: true })
}

export async function reverseStudentOrder(side) {
  const activeSide = resolveSide(side)
  const students = await Student.find({ side: activeSide, active: true }).sort({ slotOrder: 1 })
  const total = students.length
  if (total <= 1) return false

  const bulk = students.map((student, index) => ({
    updateOne: {
      filter: { _id: student._id },
      update: { slotOrder: total - 1 - index },
    },
  }))

  await Student.bulkWrite(bulk)
  return true
}

function nextWorkingDay(offDays, dateStr) {
  let d = new Date(dateStr + 'T00:00:00')
  while (true) {
    d.setDate(d.getDate() + 1)
    const s = d.toISOString().slice(0, 10)
    if (!isOffDay(offDays, s)) return s
  }
}

export async function rotateIfNeeded(side, todayStr) {
  const activeSide = resolveSide(side)
  const offDays = await getOffDays(activeSide)
  if (isOffDay(offDays, todayStr)) return false

  const lastRotation = await getLastRotationDate(activeSide)
  if (lastRotation === todayStr) return false

  if (lastRotation) {
    const expectedNext = nextWorkingDay(offDays, lastRotation)
    if (todayStr < expectedNext) return false
  }

  await reverseStudentOrder(activeSide)
  await setLastRotationDate(activeSide, todayStr)
  return true
}
