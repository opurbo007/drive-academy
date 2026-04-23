import mongoose from 'mongoose'
import { SIDE_KEYS } from '@/lib/sides'

const schema = new mongoose.Schema({
  side: { type: String, enum: SIDE_KEYS, required: true },
  key: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
})

schema.index({ side: 1, key: 1 }, { unique: true })

export default mongoose.models.Settings || mongoose.model('Settings', schema)
