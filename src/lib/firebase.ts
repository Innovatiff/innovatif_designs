import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { firebaseConfig } from './firebase-config'

export { firebaseConfig }

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const firestore = getFirestore(app)

isSupported()
  .then((ok) => {
    if (ok) getAnalytics(app)
  })
  .catch(() => {
    /* analytics is optional */
  })
