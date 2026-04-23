import jwt from 'jsonwebtoken'
import { connectDB } from './db'
import User from '../models/User'
import { getSideFromUrl, normalizeSide } from './sides'

const JWT_SECRET = process.env.JWT_SECRET || 'secret'

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' })
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

// Extract and verify admin from Next.js Request
export async function getAdminFromRequest(request) {
  try {
    const auth = request.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return null
    const token = auth.slice(7)
    const decoded = verifyToken(token)
    await connectDB()
    const user = await User.findById(decoded.id).select('-password').lean()
    return user || null
  } catch {
    return null
  }
}

// Middleware helper — returns 401 Response or null if ok
export async function requireAdmin(request) {
  const user = await getAdminFromRequest(request)
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const requestSide = getSideFromUrl(request.url)
  if (requestSide && normalizeSide(user.side) !== requestSide) {
    return Response.json({ error: 'This captain can only manage their own side' }, { status: 403 })
  }
  return user
}
