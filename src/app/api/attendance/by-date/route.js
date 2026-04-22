import { connectDB } from '@/lib/db'
import { rotateIfNeeded, getOffDays, isOffDay } from '@/utils/rotation'
import Student from '@/models/Student'
import Attendance from '@/models/Attendance'

export async function GET(request) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)

    // Only trigger rotation for today or future; past dates just read as-is
    const today = new Date().toISOString().slice(0, 10)
    if (date === today) await rotateIfNeeded(date)

    const offDays = await getOffDays()
    const [students, records] = await Promise.all([
      Student.find({ active: true }).sort({ slotOrder: 1 }).lean(),
      Attendance.find({ date }).lean(),
    ])

    const attendance = {}
    records.forEach(r => { attendance[r.studentId] = r.present })

    return Response.json({
      date,
      students,
      attendance,
      isOffDay: isOffDay(offDays, date),
      offDays,
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
