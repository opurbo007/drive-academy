import { connectDB } from '@/lib/db'
import { getSideFromUrl } from '@/lib/sides'
import Attendance from '@/models/Attendance'
import Student from '@/models/Student'
import { getOffDays, isOffDay, rotateIfNeeded } from '@/utils/rotation'

export async function GET(request) {
  try {
    await connectDB()
    const side = getSideFromUrl(request.url)
    if (!side) return Response.json({ error: 'Side is required' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)

    const today = new Date().toISOString().slice(0, 10)
    if (date === today) await rotateIfNeeded(side, date)

    const offDays = await getOffDays(side)
    const [students, records] = await Promise.all([
      Student.find({ side, active: true }).sort({ slotOrder: 1 }).lean(),
      Attendance.find({ side, date }).lean(),
    ])

    const attendance = {}
    records.forEach(record => {
      attendance[record.studentId] = record.present
    })

    return Response.json({
      date,
      students,
      attendance,
      isOffDay: isOffDay(offDays, date),
      offDays,
      side,
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
