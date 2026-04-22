import { connectDB } from '@/lib/db'
import { getOffDays } from '@/utils/rotation'
import Settings from '@/models/Settings'

export async function GET() {
  try {
    await connectDB()
    const offDays = await getOffDays()
    const lastRotation = await Settings.findOne({ key: 'lastRotationDate' }).lean()
    return Response.json({ offDays, lastRotationDate: lastRotation?.value || null })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
