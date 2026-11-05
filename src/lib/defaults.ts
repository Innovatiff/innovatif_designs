// Values remembered between pages so each new page starts pre-filled.
const KEY = 'innovatif:defaults'

export interface Defaults {
  currency?: string
  preparedBy?: string
  contact?: string
  ctaText?: string
  notes?: string
  checkoutNotes?: string
}

export function loadDefaults(): Defaults {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}') as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Defaults) : {}
  } catch {
    return {}
  }
}

export function saveDefaults(patch: Defaults) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadDefaults(), ...patch }))
  } catch {
    /* optional */
  }
}
