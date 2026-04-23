import { connectDB } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { seedIfNeeded } from '@/lib/seed'
import { normalizeSide } from '@/lib/sides'
import User from '@/models/User'

export async function POST(request) {
  try {
    await connectDB()
    await seedIfNeeded()

    const { username, password, side } = await request.json()
    const activeSide = normalizeSide(side)
    const activeUsername = username || (activeSide ? `${activeSide}-admin` : '')

    if (!activeUsername || !password || !activeSide) {
      return Response.json({ error: 'Username, password, and side are required' }, { status: 400 })
    }

    const user = await User.findOne({ username: activeUsername, side: activeSide })
    if (!user) return Response.json({ error: 'Invalid credentials' }, { status: 401 })

    const ok = await user.comparePassword(password)
    if (!ok) return Response.json({ error: 'Invalid credentials' }, { status: 401 })

    const token = signToken({ id: user._id, username: user.username, role: user.role, side: user.side })
    return Response.json({ token, username: user.username, role: user.role, side: user.side })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
