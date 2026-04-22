import { connectDB } from '@/lib/db'
import Attendance from '@/models/Attendance'

export async function GET(request, { params }) {
  try {
    await connectDB()
    const records = await Attendance.find({ studentId: params.studentId })
      .sort({ date: -1 }).limit(30).lean()
    return Response.json(records)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
