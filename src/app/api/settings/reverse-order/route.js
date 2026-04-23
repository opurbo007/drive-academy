import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { getOffDays, isOffDay, reverseStudentOrder, setLastRotationDate } from '@/utils/rotation'

export async function POST(request) {
  await connectDB()
  const adminOrRes = await requireAdmin(request)
  if (adminOrRes instanceof Response) return adminOrRes

  try {
    const { effectiveDate } = await request.json().catch(() => ({}))
    const today = effectiveDate || new Date().toISOString().slice(0, 10)

    await reverseStudentOrder(adminOrRes.side)

    const offDays = await getOffDays(adminOrRes.side)
    if (!isOffDay(offDays, today)) {
      await setLastRotationDate(adminOrRes.side, today)
    }

    return Response.json({ success: true, reversedAt: today })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
