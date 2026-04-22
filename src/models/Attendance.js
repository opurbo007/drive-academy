import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  date: { type: String, required: true },
  studentId: { type: String, required: true },
  present: { type: Boolean, default: false },
  markedBy: { type: String },
  markedAt: { type: Date },
}, { timestamps: true })

schema.index({ date: 1, studentId: 1 }, { unique: true })

export default mongoose.models.Attendance || mongoose.model('Attendance', schema)
