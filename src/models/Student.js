import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  slotOrder: { type: Number, required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.models.Student || mongoose.model('Student', schema)
