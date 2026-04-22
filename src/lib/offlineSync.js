const QUEUE_KEY = 'da_offline_queue'
const USER_KEY = 'da_user'
const SNAPSHOT_PREFIX = 'da_snapshot:'
export const QUEUE_EVENT = 'da-sync-queue-changed'

function isBrowser() {
  return typeof window !== 'undefined'
}

function readJson(key, fallback) {
  if (!isBrowser()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  if (!isBrowser()) return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function emitQueueChange(count) {
  if (!isBrowser()) return
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT, { detail: { count } }))
}

export function getPendingSyncQueue() {
  return readJson(QUEUE_KEY, [])
}

export function getPendingSyncCount() {
  return getPendingSyncQueue().length
}

export function enqueueAttendanceMutation(mutation) {
  const queue = getPendingSyncQueue()
  const nextQueue = [...queue, { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, ...mutation }]
  writeJson(QUEUE_KEY, nextQueue)
  emitQueueChange(nextQueue.length)
  return nextQueue.length
}

export function replacePendingSyncQueue(queue) {
  writeJson(QUEUE_KEY, queue)
  emitQueueChange(queue.length)
}

export async function flushAttendanceQueue(authFetch) {
  if (!isBrowser() || !navigator.onLine) return { flushed: 0, remaining: getPendingSyncCount() }

  const queue = getPendingSyncQueue()
  if (queue.length === 0) return { flushed: 0, remaining: 0 }

  let flushed = 0
  const remaining = [...queue]

  while (remaining.length > 0) {
    const item = remaining[0]
    const endpoint = item.type === 'mark-all' ? '/api/attendance/mark-all' : '/api/attendance/mark'
    const res = await authFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(item.payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to sync offline changes')
    }

    remaining.shift()
    flushed += 1
    replacePendingSyncQueue(remaining)
  }

  return { flushed, remaining: 0 }
}

export function saveOfflineSnapshot(key, value) {
  writeJson(`${SNAPSHOT_PREFIX}${key}`, { savedAt: new Date().toISOString(), value })
}

export function readOfflineSnapshot(key) {
  return readJson(`${SNAPSHOT_PREFIX}${key}`, null)
}

export function saveCachedUser(user) {
  writeJson(USER_KEY, user)
}

export function readCachedUser() {
  return readJson(USER_KEY, null)
}

export function clearCachedUser() {
  if (!isBrowser()) return
  window.localStorage.removeItem(USER_KEY)
}
