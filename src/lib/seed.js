import User from '../models/User'

const SIDES = ['abdul', 'saidul']

let seeded = false

export async function seedIfNeeded() {
  if (seeded) return
  seeded = true

  for (const side of SIDES) {
    const username = `${side}-admin`
    const user = await User.findOne({ username })
    if (!user) {
      await User.create({ username, password: side === 'abdul' ? 'Abdul@1234' : 'Saidul@1234', role: 'admin', side })
      continue
    }
    if (!user.side) {
      user.side = side
      await user.save()
    }
  }
}
