import { connectDB } from '@/lib/db'
import { expandCheckupGroups, getCheckupForDate } from '@/lib/checkup'
import { SIDE_OPTIONS } from '@/lib/sides'

export async function GET(request) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)

    const sides = await Promise.all(
      SIDE_OPTIONS.map(async sideMeta => {
        const checkup = await getCheckupForDate(sideMeta.key, date)
        const expandedGroups = await expandCheckupGroups(sideMeta.key, checkup.groups)

        return {
          side: sideMeta.key,
          label: sideMeta.label,
          accent: sideMeta.accent,
          currentIndex: checkup.currentIndex,
          currentGroup: expandedGroups[checkup.currentIndex] || [],
          groupsCount: expandedGroups.length,
        }
      })
    )

    return Response.json({ date, sides })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
