import { verifyFirebaseUser, type VerifiedUser } from './firebase-auth'
import { getPublicDocument, type PublicCollection } from './firestore'
import { stripeFromEnv, type StripeAccess } from './stripe'

/** Everything a handler touches outside its own logic, so tests can swap it out. */
export interface Deps {
  stripe(): StripeAccess | null
  getDocument(collection: PublicCollection, id: string): Promise<Record<string, unknown> | null>
  origin(req: Request): string
  verifyUser(req: Request): Promise<VerifiedUser | null>
}

/**
 * Where Stripe sends the buyer back to. Uses the request's own origin when it is this site
 * (production, deploy previews, `netlify dev` on localhost), otherwise the site's main URL.
 */
export function siteOrigin(req: Request): string {
  const requestOrigin = new URL(req.url).origin
  const known = [process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.DEPLOY_URL].flatMap((value) => {
    try {
      return value ? [new URL(value).origin] : []
    } catch {
      return []
    }
  })
  if (known.includes(requestOrigin)) return requestOrigin
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)) return requestOrigin
  return known[0] ?? requestOrigin
}

export const defaultDeps: Deps = {
  stripe: stripeFromEnv,
  getDocument: getPublicDocument,
  origin: siteOrigin,
  verifyUser: verifyFirebaseUser,
}
