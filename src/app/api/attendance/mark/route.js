import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import Attendance from '@/models/Attendance'
import { getOffDays, isOffDay } from '@/utils/rotation'

export async function POST(request) {
  await connectDB()
  const adminOrRes = await requireAdmin(request)
  if (adminOrRes instanceof Response) return adminOrRes

  try {
    const { date, studentId, present } = await request.json()
    const today = new Date().toISOString().slice(0, 10)
    const side = adminOrRes.side

    if (date === today) {
      const offDays = await getOffDays(side)
      if (isOffDay(offDays, date)) {
        return Response.json({ error: 'Cannot mark attendance on an off day' }, { status: 400 })
      }
    }

    if (present === null || typeof present === 'undefined') {
      await Attendance.findOneAndDelete({ side, date, studentId })
      return Response.json({ cleared: true })
    }

    const record = await Attendance.findOneAndUpdate(
      { side, date, studentId },
      { side, present, markedBy: adminOrRes.username, markedAt: new Date() },
      { upsert: true, new: true }
    )

    return Response.json(record)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
