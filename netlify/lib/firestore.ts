import { firebaseConfig } from '../../src/lib/firebase-config'

// Reads public documents through the Firestore REST API. Checkouts and images allow anyone to
// "get" a single document by id (see firestore.rules), so no service account is needed.

interface Value {
  stringValue?: string
  integerValue?: string
  doubleValue?: number
  booleanValue?: boolean
  nullValue?: null
  timestampValue?: string
  arrayValue?: { values?: Value[] }
  mapValue?: { fields?: Record<string, Value> }
}

export function decodeValue(value: Value): unknown {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  if ('timestampValue' in value) return value.timestampValue
  if ('arrayValue' in value) return (value.arrayValue?.values ?? []).map(decodeValue)
  if ('mapValue' in value) return decodeFields(value.mapValue?.fields)
  return null
}

export function decodeFields(fields: Record<string, Value> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields ?? {})) out[key] = decodeValue(value)
  return out
}

export type PublicCollection = 'checkouts' | 'images'

export async function getPublicDocument(collection: PublicCollection, id: string): Promise<Record<string, unknown> | null> {
  const { projectId, apiKey } = firebaseConfig
  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/` +
    `${collection}/${encodeURIComponent(id)}?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (res.status === 404) return null
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Firestore read failed (${res.status}): ${detail.slice(0, 300)}`)
  }
  const body = (await res.json()) as { fields?: Record<string, Value> }
  return decodeFields(body.fields)
}
