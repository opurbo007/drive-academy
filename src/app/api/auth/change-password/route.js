import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import User from '@/models/User'

export async function POST(request) {
  await connectDB()
  const adminOrRes = await requireAdmin(request)
  if (adminOrRes instanceof Response) return adminOrRes

  try {
    const { currentPassword, newPassword } = await request.json()
    if (!newPassword || newPassword.length < 6)
      return Response.json({ error: 'New password must be at least 6 characters' }, { status: 400 })

    const user = await User.findById(adminOrRes._id)
    const ok = await user.comparePassword(currentPassword)
    if (!ok) return Response.json({ error: 'Current password is incorrect' }, { status: 401 })

    user.password = newPassword
    await user.save()
    return Response.json({ message: 'Password changed successfully' })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
