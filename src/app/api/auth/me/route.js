import { connectDB } from '@/lib/db'
import { getAdminFromRequest } from '@/lib/auth'

export async function GET(request) {
  await connectDB()
  const user = await getAdminFromRequest(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json({ username: user.username, role: user.role, side: user.side })
}
