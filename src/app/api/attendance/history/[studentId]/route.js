import { connectDB } from '@/lib/db'
import { getSideFromUrl } from '@/lib/sides'
import Attendance from '@/models/Attendance'

export async function GET(request, { params }) {
  try {
    await connectDB()
    const side = getSideFromUrl(request.url)
    if (!side) return Response.json({ error: 'Side is required' }, { status: 400 })

    const { studentId } = await params
    const records = await Attendance.find({ side, studentId }).sort({ date: -1 }).limit(30).lean()
    return Response.json(records)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
