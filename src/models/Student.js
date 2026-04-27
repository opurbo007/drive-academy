import mongoose from 'mongoose'
import { SIDE_KEYS } from '@/lib/sides'

const schema = new mongoose.Schema({
  side: { type: String, enum: SIDE_KEYS, required: true },
  studentId: { type: String, required: true },
  name: { type: String, required: true },
  shift: { type: String, enum: ['Shift 1', 'Shift 2'], default: 'Shift 1', required: true },
  captain: { type: String, default: 'Student' },
  cleanupCount: { type: Number, default: 0, min: 0 },
  slotOrder: { type: Number, required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true })

schema.index({ side: 1, studentId: 1 }, { unique: true })
schema.index({ side: 1, slotOrder: 1 })

export default mongoose.models.Student || mongoose.model('Student', schema)
