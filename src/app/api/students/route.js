import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { seedIfNeeded } from '@/lib/seed'
import { rotateIfNeeded, getOffDays, isOffDay } from '@/utils/rotation'
import Student from '@/models/Student'

export async function GET(request) {
  try {
    await connectDB()
    await seedIfNeeded()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)

    await rotateIfNeeded(date)

    const offDays = await getOffDays()
    const students = await Student.find({ active: true }).sort({ slotOrder: 1 }).lean()

    return Response.json({ students, isOffDay: isOffDay(offDays, date), offDays, date })
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
    const maxOrder = await Student.findOne().sort({ slotOrder: -1 })
    const slotOrder = maxOrder ? maxOrder.slotOrder + 1 : 0
    const student = await Student.create({ studentId, name, slotOrder })
    return Response.json(student, { status: 201 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 })
  }
}
