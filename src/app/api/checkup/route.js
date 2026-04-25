import { requireAdmin } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { expandCheckupGroups, getCheckupForDate, saveCheckupGroups } from '@/lib/checkup'
import { getSideFromUrl } from '@/lib/sides'
import Student from '@/models/Student'

export async function GET(request) {
  try {
    await connectDB()
    const side = getSideFromUrl(request.url)
    if (!side) return Response.json({ error: 'Side is required' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)
    const checkup = await getCheckupForDate(side, date)
    const expandedGroups = await expandCheckupGroups(side, checkup.groups)

    return Response.json({
      date,
      groups: expandedGroups,
      currentIndex: checkup.currentIndex,
      currentGroup: expandedGroups[checkup.currentIndex] || [],
      lastAdvancedDate: checkup.lastAdvancedDate,
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  await connectDB()
  const adminOrRes = await requireAdmin(request)
  if (adminOrRes instanceof Response) return adminOrRes

  try {
    const { groups, currentIndex } = await request.json()
    if (!Array.isArray(groups)) {
      return Response.json({ error: 'Groups must be an array' }, { status: 400 })
    }

    const students = await Student.find({ side: adminOrRes.side, active: true }).lean()
    const validIds = new Set(students.map(student => student.studentId))
    const usedIds = new Set()

    const cleanedGroups = groups.map(group => {
      if (!Array.isArray(group)) return []
      return group.filter(studentId => {
        if (!validIds.has(studentId) || usedIds.has(studentId)) return false
        usedIds.add(studentId)
        return true
      })
    }).filter(group => group.length === 2 || group.length === 3)

    const safeIndex = cleanedGroups.length > 0 ? Math.min(Math.max(Number(currentIndex) || 0, 0), cleanedGroups.length - 1) : 0
    await saveCheckupGroups(adminOrRes.side, cleanedGroups, undefined, safeIndex)
    const expandedGroups = await expandCheckupGroups(adminOrRes.side, cleanedGroups)

    return Response.json({
      groups: expandedGroups,
      currentIndex: safeIndex,
      currentGroup: expandedGroups[safeIndex] || [],
      message: 'Checkup groups saved',
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }
}
