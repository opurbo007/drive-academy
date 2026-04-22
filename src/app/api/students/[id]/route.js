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
    const student = await Student.findByIdAndUpdate(id, body, { new: true })
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
    await Student.findByIdAndUpdate(id, { active: false })
    return Response.json({ message: 'Student deactivated' })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 })
  }
}
