import type { Backend, CollectionName } from './db'
import { newId } from './normalize'

const IMAGE_PREFIX = 'innovatif:image:'
const keyFor = (name: CollectionName) => `innovatif:${name}`

type StoredRecord = Record<string, unknown> & { id: string }

function read(name: CollectionName): StoredRecord[] {
  try {
    const raw = localStorage.getItem(keyFor(name))
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed)
      ? parsed.filter((r): r is StoredRecord => Boolean(r) && typeof r === 'object' && typeof (r as StoredRecord).id === 'string')
      : []
  } catch {
    return []
  }
}

function write(name: CollectionName, records: StoredRecord[]) {
  try {
    localStorage.setItem(keyFor(name), JSON.stringify(records))
  } catch {
    throw new Error('This browser has run out of local storage space. Remove some images or pages.')
  }
}

export const localBackend: Backend = {
  name: 'local',

  async list(name) {
    return read(name).map((r) => ({ id: r.id, data: r }))
  },

  async get(name, id) {
    const record = read(name).find((r) => r.id === id)
    return record ? { id, data: record } : null
  },

  async create(name, data) {
    const id = newId()
    write(name, [...read(name), { ...data, id }])
    return id
  },

  async set(name, id, data) {
    const records = read(name)
    const index = records.findIndex((r) => r.id === id)
    const record = { ...data, id }
    if (index === -1) records.push(record)
    else records[index] = record
    write(name, records)
  },

  async remove(name, id) {
    write(name, read(name).filter((r) => r.id !== id))
  },

  async uploadImage(dataUrl) {
    const id = newId(12)
    try {
      localStorage.setItem(IMAGE_PREFIX + id, dataUrl)
    } catch {
      throw new Error('This browser has run out of local storage space for images.')
    }
    return `img:${id}`
  },

  async getImage(id) {
    return localStorage.getItem(IMAGE_PREFIX + id)
  },
}
