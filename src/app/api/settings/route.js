import { connectDB } from '@/lib/db'
import { getSideFromUrl } from '@/lib/sides'
import Settings from '@/models/Settings'
import { getOffDays } from '@/utils/rotation'

export async function GET(request) {
  try {
    await connectDB()
    const side = getSideFromUrl(request.url)
    if (!side) return Response.json({ error: 'Side is required' }, { status: 400 })

    const offDays = await getOffDays(side)
    const lastRotation = await Settings.findOne({ side, key: 'lastRotationDate' }).lean()
    return Response.json({ offDays, lastRotationDate: lastRotation?.value || null, side })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
