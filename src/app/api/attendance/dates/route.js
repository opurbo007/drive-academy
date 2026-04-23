import { connectDB } from '@/lib/db'
import { getSideFromUrl } from '@/lib/sides'
import Attendance from '@/models/Attendance'

export async function GET(request) {
  try {
    await connectDB()
    const side = getSideFromUrl(request.url)
    if (!side) return Response.json({ error: 'Side is required' }, { status: 400 })

    const dates = await Attendance.distinct('date', { side })
    dates.sort((a, b) => b.localeCompare(a))
    return Response.json({ dates, side })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
