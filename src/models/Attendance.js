import mongoose from 'mongoose'
import { SIDE_KEYS } from '@/lib/sides'

const schema = new mongoose.Schema({
  side: { type: String, enum: SIDE_KEYS, required: true },
  date: { type: String, required: true },
  studentId: { type: String, required: true },
  present: { type: Boolean, default: false },
  markedBy: { type: String },
  markedAt: { type: Date },
}, { timestamps: true })

schema.index({ side: 1, date: 1, studentId: 1 }, { unique: true })
schema.index({ side: 1, date: 1 })

export default mongoose.models.Attendance || mongoose.model('Attendance', schema)
