import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
})

export default mongoose.models.Settings || mongoose.model('Settings', schema)
