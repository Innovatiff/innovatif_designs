import { createRemoteJWKSet, jwtVerify } from 'jose'
import { firebaseConfig } from '../../src/lib/firebase-config'

// Verifies Firebase Auth ID tokens with Google's public keys (no service account needed).
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
)

export interface VerifiedUser {
  uid: string
  email: string | null
}

/** Optional OWNER_EMAILS (comma separated) limits owner-only data to those accounts. */
function allowedEmails(): string[] {
  return (process.env.OWNER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export async function verifyFirebaseUser(req: Request): Promise<VerifiedUser | null> {
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization') ?? '')
  if (!match) return null
  try {
    const { payload } = await jwtVerify(match[1], JWKS, {
      issuer: `https://securetoken.google.com/${firebaseConfig.projectId}`,
      audience: firebaseConfig.projectId,
      algorithms: ['RS256'],
    })
    if (typeof payload.sub !== 'string' || !payload.sub) return null
    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : null
    const allowed = allowedEmails()
    if (allowed.length > 0 && (!email || !allowed.includes(email))) return null
    return { uid: payload.sub, email }
  } catch {
    return null
  }
}
