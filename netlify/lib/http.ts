/** Firestore auto IDs and demo IDs: letters and digits only. */
export const DOC_ID = /^[A-Za-z0-9]{1,64}$/
export const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{8,240}$/

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

export function fail(status: number, error: string, code?: string): Response {
  return json(code ? { error, code } : { error }, status)
}

export interface Failure {
  status: number
  error: string
  code: string
}

/** Maps Stripe SDK errors to messages the checkout page can show. */
export function describeStripeError(error: unknown): Failure {
  const e = (error ?? {}) as { type?: string; message?: string }
  switch (e.type) {
    case 'StripeAuthenticationError':
      return {
        status: 503,
        code: 'stripe_auth',
        error: 'Stripe rejected the secret key. Check STRIPE_SECRET_KEY in your Netlify environment variables.',
      }
    case 'StripePermissionError':
      return {
        status: 503,
        code: 'stripe_permission',
        error: 'This Stripe key is not allowed to create payments. Use your secret key (sk_...).',
      }
    case 'StripeInvalidRequestError':
      return { status: 400, code: 'stripe_invalid', error: e.message || 'Stripe could not process this order.' }
    case 'StripeRateLimitError':
      return { status: 429, code: 'stripe_rate_limit', error: 'Too many payment requests right now. Try again in a moment.' }
    case 'StripeConnectionError':
    case 'StripeAPIError':
      return { status: 502, code: 'stripe_unavailable', error: 'Could not reach Stripe. Try again in a moment.' }
    default:
      return { status: 500, code: 'error', error: 'The payment service hit an error. Try again in a moment.' }
  }
}

export function stripeFailure(error: unknown): Response {
  const f = describeStripeError(error)
  return fail(f.status, f.error, f.code)
}
