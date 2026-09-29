import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics, isSupported } from 'firebase/analytics'

// Firebase web configuration for the "innovatif-designs" project.
// These values identify the project and are safe to ship in the browser bundle;
// access is controlled by Firestore security rules (see firestore.rules) and Firebase Auth.
export const firebaseConfig = {
  apiKey: 'AIzaSyBLedbrCBlQ9iU9d0y2XZHPrvdUGDGnn4Y',
  authDomain: 'innovatif-designs.firebaseapp.com',
  projectId: 'innovatif-designs',
  storageBucket: 'innovatif-designs.firebasestorage.app',
  messagingSenderId: '1046101676345',
  appId: '1:1046101676345:web:a391948b44f581491d98e8',
  measurementId: 'G-Z9FWZ87ZFF',
}

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
