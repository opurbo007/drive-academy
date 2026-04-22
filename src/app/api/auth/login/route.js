import { connectDB } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { seedIfNeeded } from '@/lib/seed'
import User from '@/models/User'

export async function POST(request) {
  try {
    await connectDB()
    await seedIfNeeded()
    const { username, password } = await request.json()
    if (!username || !password)
      return Response.json({ error: 'Username and password required' }, { status: 400 })

    const user = await User.findOne({ username })
    if (!user) return Response.json({ error: 'Invalid credentials' }, { status: 401 })

    const ok = await user.comparePassword(password)
    if (!ok) return Response.json({ error: 'Invalid credentials' }, { status: 401 })

    const token = signToken({ id: user._id, username: user.username, role: user.role })
    return Response.json({ token, username: user.username, role: user.role })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
