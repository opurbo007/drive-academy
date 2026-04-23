import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { setOffDays } from '@/utils/rotation'

export async function PUT(request) {
  await connectDB()
  const adminOrRes = await requireAdmin(request)
  if (adminOrRes instanceof Response) return adminOrRes

  try {
    const { offDays } = await request.json()
    if (!Array.isArray(offDays)) {
      return Response.json({ error: 'offDays must be an array' }, { status: 400 })
    }
    await setOffDays(adminOrRes.side, offDays)
    return Response.json({ offDays })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
