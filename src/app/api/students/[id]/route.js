import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import Student from '@/models/Student'

export async function PUT(request, { params }) {
  await connectDB()
  const adminOrRes = await requireAdmin(request)
  if (adminOrRes instanceof Response) return adminOrRes

  try {
    const { id } = await params
    const body = await request.json()
    const update = {}

    if (typeof body.studentId === 'string') update.studentId = body.studentId
    if (typeof body.name === 'string') update.name = body.name
    if ('cleanupCount' in body) update.cleanupCount = Math.max(Number(body.cleanupCount) || 0, 0)

    const student = await Student.findOneAndUpdate(
      { _id: id, side: adminOrRes.side },
      update,
      { new: true }
    )
    return Response.json(student)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 })
  }
}

export async function DELETE(request, { params }) {
  await connectDB()
  const adminOrRes = await requireAdmin(request)
  if (adminOrRes instanceof Response) return adminOrRes

  try {
    const { id } = await params
    await Student.findOneAndUpdate({ _id: id, side: adminOrRes.side }, { active: false })
    return Response.json({ message: 'Student deactivated' })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 })
  }
}
