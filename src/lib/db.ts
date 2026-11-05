import type { Checkout, CheckoutInput, Page, PageInput } from '../types'
import { IS_LOCAL } from './mode'
import { normalizeCheckout, normalizeCheckoutInput, normalizeInput, normalizePage } from './normalize'

export { IS_LOCAL }

export type CollectionName = 'pages' | 'checkouts'

export interface StoredDoc {
  id: string
  data: Record<string, unknown>
}

/** Storage primitives. Firestore in production, localStorage in demo mode. */
export interface Backend {
  readonly name: 'firestore' | 'local'
  list(collection: CollectionName): Promise<StoredDoc[]>
  get(collection: CollectionName, id: string): Promise<StoredDoc | null>
  create(collection: CollectionName, data: Record<string, unknown>): Promise<string>
  set(collection: CollectionName, id: string, data: Record<string, unknown>): Promise<void>
  remove(collection: CollectionName, id: string): Promise<void>
  /** Stores an image data URL and returns a reference such as `img:abc123`. */
  uploadImage(dataUrl: string): Promise<string>
  getImage(id: string): Promise<string | null>
}

const backend: Promise<Backend> = IS_LOCAL
  ? import('./db.local').then((m) => m.localBackend)
  : import('./db.firestore').then((m) => m.firestoreBackend)

interface Meta {
  id: string
  createdAt: string
  updatedAt: string
}

function metaOf(doc: StoredDoc): Meta {
  const createdAt = typeof doc.data.createdAt === 'string' ? doc.data.createdAt : ''
  const updatedAt = typeof doc.data.updatedAt === 'string' ? doc.data.updatedAt : createdAt
  return { id: doc.id, createdAt, updatedAt }
}

export interface Repo<T extends Meta & { title: string }, I> {
  list(): Promise<T[]>
  get(id: string): Promise<T | null>
  create(input: I): Promise<T>
  update(id: string, input: I, createdAt: string): Promise<T>
  remove(id: string): Promise<void>
  duplicate(id: string): Promise<T>
}

function repo<T extends Meta & { title: string }, I extends object>(
  collection: CollectionName,
  toInput: (raw: unknown) => I,
  toDoc: (raw: unknown, meta: Meta) => T,
): Repo<T, I> {
  const nowISO = () => new Date().toISOString()

  const create = async (input: I): Promise<T> => {
    const b = await backend
    const now = nowISO()
    const data = toInput(input)
    const id = await b.create(collection, { ...data, createdAt: now, updatedAt: now })
    return toDoc(data, { id, createdAt: now, updatedAt: now })
  }

  const get = async (id: string): Promise<T | null> => {
    const doc = await (await backend).get(collection, id)
    return doc ? toDoc(doc.data, metaOf(doc)) : null
  }

  return {
    async list() {
      const docs = await (await backend).list(collection)
      return docs.map((d) => toDoc(d.data, metaOf(d))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },
    get,
    create,
    async update(id, input, createdAt) {
      const b = await backend
      const now = nowISO()
      const data = toInput(input)
      const created = createdAt || now
      await b.set(collection, id, { ...data, createdAt: created, updatedAt: now })
      return toDoc(data, { id, createdAt: created, updatedAt: now })
    },
    async remove(id) {
      await (await backend).remove(collection, id)
    },
    async duplicate(id) {
      const source = await get(id)
      if (!source) throw new Error('This page no longer exists.')
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = source
      return create(toInput({ ...rest, title: `${source.title} (copy)` }))
    },
  }
}

export const db = {
  pages: repo<Page, PageInput>('pages', normalizeInput, normalizePage),
  checkouts: repo<Checkout, CheckoutInput>('checkouts', normalizeCheckoutInput, normalizeCheckout),
  uploadImage: (dataUrl: string) => backend.then((b) => b.uploadImage(dataUrl)),
  getImage: (id: string) => backend.then((b) => b.getImage(id)),
}
