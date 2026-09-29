import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  type DocumentData,
} from 'firebase/firestore'
import type { Page } from '../types'
import type { Backend } from './db'
import { firestore } from './firebase'
import { normalizeInput, normalizePage } from './normalize'

const nowISO = () => new Date().toISOString()

function friendly(error: unknown): Error {
  const code = (error as { code?: string })?.code ?? ''
  const message = error instanceof Error ? error.message : String(error)
  if (code === 'permission-denied') {
    return new Error(
      'Firestore denied this request. Make sure you are signed in and that the rules from firestore.rules are published in the Firebase console.',
    )
  }
  if (code === 'unavailable') return new Error('Cannot reach Firestore. Check your internet connection and try again.')
  if (code === 'not-found' && /database/i.test(message)) {
    return new Error('The Firestore database does not exist yet. Create it in the Firebase console (Build → Firestore Database).')
  }
  if (code === 'resource-exhausted') return new Error('Firestore quota exceeded for today. Try again later.')
  return error instanceof Error ? error : new Error(message)
}

async function run<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error) {
    throw friendly(error)
  }
}

function toPage(id: string, data: DocumentData): Page {
  const createdAt = typeof data.createdAt === 'string' ? data.createdAt : ''
  const updatedAt = typeof data.updatedAt === 'string' ? data.updatedAt : createdAt
  return normalizePage(data, { id, createdAt, updatedAt })
}

const pages = () => collection(firestore, 'pages')
const images = () => collection(firestore, 'images')

export const firestoreBackend: Backend = {
  name: 'firestore',

  listPages: () =>
    run(async () => {
      const snapshot = await getDocs(query(pages(), orderBy('updatedAt', 'desc')))
      return snapshot.docs.map((d) => toPage(d.id, d.data()))
    }),

  getPage: (id) =>
    run(async () => {
      const snapshot = await getDoc(doc(firestore, 'pages', id))
      return snapshot.exists() ? toPage(snapshot.id, snapshot.data()) : null
    }),

  createPage: (input) =>
    run(async () => {
      const now = nowISO()
      const data = normalizeInput(input)
      const ref = await addDoc(pages(), { ...data, createdAt: now, updatedAt: now })
      return { ...data, id: ref.id, createdAt: now, updatedAt: now }
    }),

  updatePage: (id, input, createdAt) =>
    run(async () => {
      const now = nowISO()
      const data = normalizeInput(input)
      const created = createdAt || now
      await setDoc(doc(firestore, 'pages', id), { ...data, createdAt: created, updatedAt: now })
      return { ...data, id, createdAt: created, updatedAt: now }
    }),

  deletePage: (id) => run(() => deleteDoc(doc(firestore, 'pages', id))),

  uploadImage: (dataUrl) =>
    run(async () => {
      const ref = await addDoc(images(), { dataUrl, createdAt: nowISO() })
      return `img:${ref.id}`
    }),

  getImage: (id) =>
    run(async () => {
      const snapshot = await getDoc(doc(firestore, 'images', id))
      const data = snapshot.exists() ? snapshot.data() : null
      return data && typeof data.dataUrl === 'string' ? data.dataUrl : null
    }),
}
