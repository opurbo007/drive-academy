import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/drive-academy'

let cached = global._mongoose

if (!cached) {
  cached = global._mongoose = { conn: null, promise: null, migrationPromise: null }
}

async function dropIndexIfExists(db, collectionName, indexName) {
  try {
    const indexes = await db.collection(collectionName).indexes()
    if (indexes.some(index => index.name === indexName)) {
      await db.collection(collectionName).dropIndex(indexName)
    }
  } catch (error) {
    const ignorableCodes = ['NamespaceNotFound', 26, 'IndexNotFound', 27]
    if (ignorableCodes.includes(error?.code) || ignorableCodes.includes(error?.codeName)) {
      return
    }
    throw error
  }
}

async function migrateLegacyIndexes(connection) {
  const db = connection.connection.db

  await dropIndexIfExists(db, 'settings', 'key_1')
  await dropIndexIfExists(db, 'students', 'studentId_1')
  await dropIndexIfExists(db, 'attendances', 'date_1_studentId_1')
}

export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then(async mongooseInstance => {
      if (!cached.migrationPromise) {
        cached.migrationPromise = migrateLegacyIndexes(mongooseInstance)
      }
      await cached.migrationPromise
      return mongooseInstance
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}
