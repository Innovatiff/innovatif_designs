import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import type { AuthBackend } from './auth'
import { auth } from './firebase'

function friendly(error: unknown): Error {
  const code = (error as { code?: string })?.code ?? ''
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return new Error('Wrong email or password.')
    case 'auth/invalid-email':
      return new Error('Enter a valid email address.')
    case 'auth/missing-password':
      return new Error('Enter your password.')
    case 'auth/too-many-requests':
      return new Error('Too many attempts. Wait a moment and try again.')
    case 'auth/user-disabled':
      return new Error('This account has been disabled.')
    case 'auth/network-request-failed':
      return new Error('Network error. Check your connection and try again.')
    case 'auth/operation-not-allowed':
      return new Error('Email/Password sign-in is not enabled. Turn it on in the Firebase console → Authentication → Sign-in method.')
    case 'auth/configuration-not-found':
      return new Error('Authentication is not set up for this Firebase project yet. Open the Firebase console → Authentication → Get started.')
    default:
      return error instanceof Error ? error : new Error(String(error))
  }
}

export const firebaseAuth: AuthBackend = {
  enabled: true,
  subscribe: (callback) => onAuthStateChanged(auth, (user) => callback(user ? { email: user.email } : null)),
  async signIn(email, password) {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (error) {
      throw friendly(error)
    }
  },
  signOut: () => signOut(auth),
}
