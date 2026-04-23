import { connectDB } from '@/lib/db'
import { getSideFromUrl } from '@/lib/sides'
import Attendance from '@/models/Attendance'

export async function GET(request) {
  try {
    await connectDB()
    const side = getSideFromUrl(request.url)
    if (!side) return Response.json({ error: 'Side is required' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)
    const records = await Attendance.find({ side, date }).lean()
    const attendance = {}
    records.forEach(record => {
      attendance[record.studentId] = record.present
    })

    return Response.json({ date, attendance, side })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
