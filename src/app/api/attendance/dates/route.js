import { connectDB } from '@/lib/db'
import Attendance from '@/models/Attendance'

export async function GET() {
  try {
    await connectDB()
    // Get distinct dates that have at least one attendance record, sorted desc
    const dates = await Attendance.distinct('date')
    dates.sort((a, b) => b.localeCompare(a))
    return Response.json({ dates })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
