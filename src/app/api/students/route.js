import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { seedIfNeeded } from '@/lib/seed'
import { getSideFromUrl, normalizeSide } from '@/lib/sides'
import Student from '@/models/Student'
import { getOffDays, isOffDay, rotateIfNeeded } from '@/utils/rotation'

export async function GET(request) {
  try {
    await connectDB()
    await seedIfNeeded()

    const side = getSideFromUrl(request.url)
    if (!side) return Response.json({ error: 'Side is required' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)

    await rotateIfNeeded(side, date)

    const offDays = await getOffDays(side)
    const students = await Student.find({ side, active: true }).sort({ slotOrder: 1 }).lean()

    return Response.json({ students, isOffDay: isOffDay(offDays, date), offDays, date, side })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  await connectDB()
  const adminOrRes = await requireAdmin(request)
  if (adminOrRes instanceof Response) return adminOrRes

  try {
    const { studentId, name } = await request.json()
    const side = normalizeSide(adminOrRes.side)
    const maxOrder = await Student.findOne({ side }).sort({ slotOrder: -1 })
    const slotOrder = maxOrder ? maxOrder.slotOrder + 1 : 0

    const student = await Student.create({
      side,
      studentId,
      name,
      captain: 'Student',
      slotOrder,
    })

    return Response.json(student, { status: 201 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 })
  }
}
