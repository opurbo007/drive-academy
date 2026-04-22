import Settings from '../models/Settings'
import Student from '../models/Student'

export async function getOffDays() {
  const s = await Settings.findOne({ key: 'offDays' })
  return s ? s.value : [5, 6] // default: Fri, Sat
}

export async function setOffDays(days) {
  await Settings.findOneAndUpdate({ key: 'offDays' }, { value: days }, { upsert: true })
}

export function isOffDay(offDays, dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return offDays.includes(d.getDay())
}

export async function getLastRotationDate() {
  const s = await Settings.findOne({ key: 'lastRotationDate' })
  return s ? s.value : null
}

export async function setLastRotationDate(date) {
  await Settings.findOneAndUpdate({ key: 'lastRotationDate' }, { value: date }, { upsert: true })
}

function nextWorkingDay(offDays, dateStr) {
  let d = new Date(dateStr + 'T00:00:00')
  while (true) {
    d.setDate(d.getDate() + 1)
    const s = d.toISOString().slice(0, 10)
    if (!isOffDay(offDays, s)) return s
  }
}

export async function rotateIfNeeded(todayStr) {
  const offDays = await getOffDays()
  if (isOffDay(offDays, todayStr)) return false

  const lastRotation = await getLastRotationDate()
  if (lastRotation === todayStr) return false

  if (lastRotation) {
    const expectedNext = nextWorkingDay(offDays, lastRotation)
    if (todayStr < expectedNext) return false
  }

  const students = await Student.find({ active: true }).sort({ slotOrder: 1 })
  const total = students.length
  const bulk = students.map((s, i) => ({
    updateOne: {
      filter: { _id: s._id },
      update: { slotOrder: total - 1 - i },
    },
  }))
  await Student.bulkWrite(bulk)
  await setLastRotationDate(todayStr)
  return true
}
