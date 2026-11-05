import { getIdToken } from './auth'
import { IS_LOCAL } from './mode'

const FUNCTIONS = '/.netlify/functions'

export type PaymentState = 'paid' | 'processing' | 'unpaid' | 'unknown'

export interface PaymentStatus {
  /** False when STRIPE_SECRET_KEY is not set on Netlify (or in demo mode). */
  configured: boolean
  livemode: boolean
  state: PaymentState
  amount?: number
  currency?: string
  paidAt?: string
  error?: string
  code?: string
  demo?: boolean
}

export interface PaidInfo {
  amount: number
  currency: string
  paidAt: string
}

export class PaymentError extends Error {
  readonly code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

export const DEMO_PAYMENTS_MESSAGE =
  'Payments are off in demo mode. On your Netlify site, with STRIPE_SECRET_KEY set, this button opens Stripe.'

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${FUNCTIONS}/${path}`, { ...init, headers: { accept: 'application/json', ...(init?.headers ?? {}) } })
  } catch {
    throw new PaymentError('Could not reach the payment service. Check your connection and try again.', 'network')
  }
  if (!(res.headers.get('content-type') ?? '').includes('application/json')) {
    throw new PaymentError(
      'The payment service is not running here. Payments work on your Netlify site, or locally with `npx netlify dev`.',
      'unavailable',
    )
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new PaymentError(
      typeof body.error === 'string' ? body.error : `Payment request failed (${res.status}).`,
      typeof body.code === 'string' ? body.code : undefined,
    )
  }
  return body as T
}

/** Creates a Stripe Checkout Session for the order and sends the browser to it. */
export async function startPayment(checkoutId: string): Promise<void> {
  if (IS_LOCAL) throw new PaymentError(DEMO_PAYMENTS_MESSAGE, 'demo')
  const { url } = await call<{ url: string }>('checkout-create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: checkoutId }),
  })
  if (!/^https:\/\//.test(url)) throw new PaymentError('The payment page address was not valid.', 'bad_url')
  window.location.assign(url)
}

export async function fetchPaymentStatus(checkoutId: string, sessionId?: string | null): Promise<PaymentStatus> {
  if (IS_LOCAL) return { configured: false, livemode: false, state: 'unknown', demo: true }
  const query = new URLSearchParams({ id: checkoutId })
  if (sessionId) query.set('session_id', sessionId)
  try {
    return await call<PaymentStatus>(`checkout-status?${query}`)
  } catch (error) {
    const e = error as PaymentError
    return { configured: e.code !== 'unavailable', livemode: false, state: 'unknown', error: e.message, code: e.code }
  }
}

/** Owner only: every paid checkout, keyed by checkout id. */
export async function fetchPaidCheckouts(): Promise<Record<string, PaidInfo>> {
  if (IS_LOCAL) return {}
  const token = await getIdToken()
  if (!token) return {}
  const body = await call<{ payments?: Record<string, PaidInfo> }>('checkout-payments', {
    headers: { authorization: `Bearer ${token}` },
  })
  return body.payments ?? {}
}

// Remember which Stripe session paid an order in this browser, so a refresh shows "Paid"
// immediately instead of waiting for Stripe's search index to catch up.
const sessionKey = (id: string) => `innovatif:paid-session:${id}`

export function rememberPaidSession(checkoutId: string, sessionId: string) {
  try {
    localStorage.setItem(sessionKey(checkoutId), sessionId)
  } catch {
    /* optional */
  }
}

export function recallPaidSession(checkoutId: string): string | null {
  try {
    return localStorage.getItem(sessionKey(checkoutId))
  } catch {
    return null
  }
}
