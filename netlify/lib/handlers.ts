import { checkoutTotals } from '../../src/lib/checkout'
import { normalizeCheckout } from '../../src/lib/normalize'
import type { Deps } from './deps'
import { DOC_ID, SESSION_ID, describeStripeError, fail, json, stripeFailure } from './http'
import { checkoutSessionParams, findPayment, listPaidCheckouts, sessionPayment } from './stripe'

type Handler = (req: Request) => Promise<Response>

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

/** POST { id } → { url } of a Stripe Checkout page for that order. */
export function createCheckoutHandler(deps: Deps): Handler {
  return async (req) => {
    if (req.method !== 'POST') return fail(405, 'Use POST.')
    const body = (await req.json().catch(() => null)) as { id?: unknown } | null
    const id = typeof body?.id === 'string' ? body.id : ''
    if (!DOC_ID.test(id)) return fail(400, 'Invalid checkout id.', 'bad_request')

    const stripe = deps.stripe()
    if (!stripe) return fail(503, 'Online payments are not set up yet.', 'stripe_not_configured')

    let raw: Record<string, unknown> | null
    try {
      raw = await deps.getDocument('checkouts', id)
    } catch (error) {
      console.error('checkout-create: could not read the order', message(error))
      return fail(502, 'This order could not be loaded. Try again in a moment.', 'store_unavailable')
    }
    if (!raw) return fail(404, 'This order does not exist or has been deleted.', 'not_found')

    const checkout = normalizeCheckout(raw, {
      id,
      createdAt: String(raw.createdAt ?? ''),
      updatedAt: String(raw.updatedAt ?? ''),
    })
    if (checkoutTotals(checkout).totalMinor <= 0) return fail(400, 'This order has nothing to pay.', 'empty')

    try {
      const existing = await findPayment(stripe.client, id)
      if (existing?.state === 'paid') return fail(409, 'This order has already been paid.', 'already_paid')
      if (existing?.state === 'processing') return fail(409, 'A payment for this order is already processing.', 'processing')
    } catch (error) {
      // The search only guards against paying twice; never block a payment on it.
      console.warn('checkout-create: payment search failed', message(error))
    }

    try {
      const session = await stripe.client.checkout.sessions.create(checkoutSessionParams(checkout, deps.origin(req)))
      if (!session.url) return fail(502, 'Stripe did not return a payment page.', 'stripe_no_url')
      return json({ url: session.url })
    } catch (error) {
      console.error('checkout-create: Stripe refused the session', message(error))
      return stripeFailure(error)
    }
  }
}

/** GET ?id=…[&session_id=…] → payment state of an order. Public; it never returns personal data. */
export function createStatusHandler(deps: Deps): Handler {
  return async (req) => {
    if (req.method !== 'GET') return fail(405, 'Use GET.')
    const params = new URL(req.url).searchParams
    const id = params.get('id') ?? ''
    const sessionId = params.get('session_id') ?? ''
    if (!DOC_ID.test(id)) return fail(400, 'Invalid checkout id.', 'bad_request')

    const stripe = deps.stripe()
    if (!stripe) return json({ configured: false, livemode: false, state: 'unknown' })
    const base = { configured: true, livemode: stripe.livemode }

    try {
      if (SESSION_ID.test(sessionId)) {
        const session = await sessionPayment(stripe.client, id, sessionId)
        if (session && session.state !== 'unpaid') return json({ ...base, ...session })
      }
      const payment = await findPayment(stripe.client, id)
      return json(payment ? { ...base, ...payment } : { ...base, state: 'unpaid' })
    } catch (error) {
      console.error('checkout-status: Stripe error', message(error))
      const failure = describeStripeError(error)
      return json({ ...base, state: 'unknown', error: failure.error, code: failure.code })
    }
  }
}

/** GET with the owner's Firebase ID token → every paid checkout. */
export function createPaymentsHandler(deps: Deps): Handler {
  return async (req) => {
    if (req.method !== 'GET') return fail(405, 'Use GET.')
    const user = await deps.verifyUser(req)
    if (!user) return fail(401, 'Sign in to see payments.', 'unauthorized')

    const stripe = deps.stripe()
    if (!stripe) return json({ configured: false, livemode: false, payments: {} })
    try {
      return json({ configured: true, livemode: stripe.livemode, payments: await listPaidCheckouts(stripe.client) })
    } catch (error) {
      console.error('checkout-payments: Stripe error', message(error))
      return stripeFailure(error)
    }
  }
}

const IMAGE_DATA_URL = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/

/** GET ?id=… → an uploaded image as a real file, so Stripe can show product photos. */
export function createImageHandler(deps: Deps): Handler {
  return async (req) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 })
    const id = new URL(req.url).searchParams.get('id') ?? ''
    if (!DOC_ID.test(id)) return new Response('Not found', { status: 404 })

    let raw: Record<string, unknown> | null
    try {
      raw = await deps.getDocument('images', id)
    } catch (error) {
      console.error('image: could not read the image', message(error))
      return new Response('Unavailable', { status: 502 })
    }
    const match = IMAGE_DATA_URL.exec(typeof raw?.dataUrl === 'string' ? raw.dataUrl : '')
    if (!match) return new Response('Not found', { status: 404 })

    const bytes = Uint8Array.from(Buffer.from(match[2], 'base64'))
    return new Response(req.method === 'HEAD' ? null : bytes, {
      headers: {
        'content-type': match[1],
        'content-length': String(bytes.byteLength),
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
      },
    })
  }
}
