import type { Page, PageInput } from '../types'
import { newId } from './normalize'

export interface Backend {
  readonly name: 'firestore' | 'local'
  listPages(): Promise<Page[]>
  getPage(id: string): Promise<Page | null>
  createPage(input: PageInput): Promise<Page>
  updatePage(id: string, input: PageInput, createdAt: string): Promise<Page>
  deletePage(id: string): Promise<void>
  /** Stores an image data URL and returns a reference such as `img:abc123`. */
  uploadImage(dataUrl: string): Promise<string>
  getImage(id: string): Promise<string | null>
}

/** `npm run dev:demo` / `npm run build:demo` keep everything in this browser's localStorage. */
export const IS_LOCAL = import.meta.env.VITE_BACKEND === 'local'

const backend: Promise<Backend> = IS_LOCAL
  ? import('./db.local').then((m) => m.localBackend)
  : import('./db.firestore').then((m) => m.firestoreBackend)

export const db = {
  listPages: () => backend.then((b) => b.listPages()),
  getPage: (id: string) => backend.then((b) => b.getPage(id)),
  createPage: (input: PageInput) => backend.then((b) => b.createPage(input)),
  updatePage: (id: string, input: PageInput, createdAt: string) => backend.then((b) => b.updatePage(id, input, createdAt)),
  deletePage: (id: string) => backend.then((b) => b.deletePage(id)),
  uploadImage: (dataUrl: string) => backend.then((b) => b.uploadImage(dataUrl)),
  getImage: (id: string) => backend.then((b) => b.getImage(id)),
  async duplicatePage(id: string): Promise<Page> {
    const b = await backend
    const source = await b.getPage(id)
    if (!source) throw new Error('This page no longer exists.')
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = source
    return b.createPage({
      ...rest,
      title: `${source.title} (copy)`,
      services: source.services.map((s) => ({ ...s, id: newId() })),
    })
  },
}
