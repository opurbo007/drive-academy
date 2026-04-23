export const SIDE_OPTIONS = [
  { key: 'abdul', label: 'Abdul', accent: '#f5a623' },
  { key: 'saidul', label: 'Saidul', accent: '#22c55e' },
]

export const SIDE_KEYS = SIDE_OPTIONS.map(side => side.key)
export const DEFAULT_SIDE = SIDE_OPTIONS[0].key

export function normalizeSide(value) {
  if (!value) return null
  const normalized = String(value).trim().toLowerCase()
  return SIDE_KEYS.includes(normalized) ? normalized : null
}

export function getSideMeta(side) {
  return SIDE_OPTIONS.find(item => item.key === side) || SIDE_OPTIONS[0]
}

export function getSideLabel(side) {
  return getSideMeta(side).label
}

export function getSideFromUrl(url) {
  const { searchParams } = new URL(url)
  return normalizeSide(searchParams.get('side'))
}
