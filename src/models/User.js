import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { SIDE_KEYS } from '@/lib/sides'

const schema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin'], default: 'admin' },
  side: { type: String, enum: SIDE_KEYS, required: true },
}, { timestamps: true })

schema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

schema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password)
}

export default mongoose.models.User || mongoose.model('User', schema)
