import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc } from 'firebase/firestore'
import type { Backend } from './db'
import { firestore } from './firebase'

function friendly(error: unknown): Error {
  const code = (error as { code?: string })?.code ?? ''
  const message = error instanceof Error ? error.message : String(error)
  if (code === 'permission-denied') {
    return new Error(
      'Firestore denied this request. Make sure you are signed in and that the latest rules from firestore.rules are published in the Firebase console.',
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

export const firestoreBackend: Backend = {
  name: 'firestore',

  list: (name) =>
    run(async () => {
      const snapshot = await getDocs(query(collection(firestore, name), orderBy('updatedAt', 'desc')))
      return snapshot.docs.map((d) => ({ id: d.id, data: d.data() }))
    }),

  get: (name, id) =>
    run(async () => {
      const snapshot = await getDoc(doc(firestore, name, id))
      return snapshot.exists() ? { id: snapshot.id, data: snapshot.data() } : null
    }),

  create: (name, data) => run(async () => (await addDoc(collection(firestore, name), data)).id),

  set: (name, id, data) => run(() => setDoc(doc(firestore, name, id), data)),

  remove: (name, id) => run(() => deleteDoc(doc(firestore, name, id))),

  uploadImage: (dataUrl) =>
    run(async () => {
      const ref = await addDoc(collection(firestore, 'images'), { dataUrl, createdAt: new Date().toISOString() })
      return `img:${ref.id}`
    }),

  getImage: (id) =>
    run(async () => {
      const snapshot = await getDoc(doc(firestore, 'images', id))
      const data = snapshot.exists() ? snapshot.data() : null
      return data && typeof data.dataUrl === 'string' ? data.dataUrl : null
    }),
}
