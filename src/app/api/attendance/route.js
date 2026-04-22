import { connectDB } from '@/lib/db'
import Attendance from '@/models/Attendance'

export async function GET(request) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)
    const records = await Attendance.find({ date }).lean()
    const attendance = {}
    records.forEach(r => { attendance[r.studentId] = r.present })
    return Response.json({ date, attendance })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
