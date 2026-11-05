import Stripe from 'stripe'
import type { Checkout } from '../../src/types'
import { checkoutTotals, formatRate } from '../../src/lib/checkout'
import { parseDescription } from '../../src/lib/format'
import { fromMinor } from '../../src/lib/money'
import { isEmail } from '../../src/lib/normalize'

export interface StripeAccess {
  client: Stripe
  livemode: boolean
}

let cached: { key: string; access: StripeAccess } | null = null

/** The Stripe client for STRIPE_SECRET_KEY, or null when payments are not set up. */
export function stripeFromEnv(): StripeAccess | null {
  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim()
  if (!key) return null
  if (!cached || cached.key !== key) {
    cached = {
      key,
      access: {
        client: new Stripe(key, { maxNetworkRetries: 2, appInfo: { name: 'Innovatif Designs' } }),
        livemode: /^(sk|rk)_live_/.test(key),
      },
    }
  }
  return cached.access
}

type LineItem = Stripe.Checkout.SessionCreateParams.LineItem
type AllowedCountry = Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry

function plainDescription(text: string): string | undefined {
  const { paragraphs, bullets } = parseDescription(text)
  const joined = [...paragraphs, ...bullets].join(' · ').trim()
  if (!joined) return undefined
  return joined.length > 500 ? `${joined.slice(0, 497).trimEnd()}…` : joined
}

function publicImage(ref: string | null, imageBase: string | null): string | undefined {
  if (!ref) return undefined
  if (ref.startsWith('img:')) return imageBase ? `${imageBase}?id=${encodeURIComponent(ref.slice(4))}` : undefined
  return /^https:\/\//.test(ref) && ref.length <= 2000 ? ref : undefined
}

function feeLine(currency: string, amount: number, name: string): LineItem {
  return { quantity: 1, price_data: { currency, unit_amount: amount, product_data: { name } } }
}

/**
 * Builds the Stripe Checkout Session from the order as stored in Firestore. Prices never come from
 * the browser, so a buyer cannot change what they are charged.
 */
export function checkoutSessionParams(checkout: Checkout, origin: string): Stripe.Checkout.SessionCreateParams {
  const currency = checkout.currency.toLowerCase()
  const totals = checkoutTotals(checkout)
  // Stripe downloads product images itself, so they must be public https URLs.
  const imageBase = origin.startsWith('https://') ? `${origin}/.netlify/functions/image` : null

  const lineItems: LineItem[] = totals.lines
    .filter((line) => line.unitMinor > 0)
    .map((line) => {
      const description = plainDescription(line.item.description)
      const image = publicImage(line.item.image, imageBase)
      return {
        quantity: line.item.quantity,
        price_data: {
          currency,
          unit_amount: line.unitMinor,
          product_data: {
            name: line.item.name || 'Item',
            ...(description ? { description } : {}),
            ...(image ? { images: [image] } : {}),
          },
        },
      }
    })
  if (totals.shippingMinor > 0) lineItems.push(feeLine(currency, totals.shippingMinor, 'Shipping & handling'))
  if (totals.taxMinor > 0) lineItems.push(feeLine(currency, totals.taxMinor, `Tax (${formatRate(checkout.taxRate)}%)`))

  const metadata: Record<string, string> = { app: 'innovatif', checkout_id: checkout.id }
  if (checkout.reference) metadata.reference = checkout.reference.slice(0, 100)
  const description = (checkout.reference ? `${checkout.title} (${checkout.reference})` : checkout.title).slice(0, 1000)

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: lineItems,
    submit_type: 'pay',
    client_reference_id: checkout.id,
    metadata,
    payment_intent_data: { metadata, ...(description ? { description } : {}) },
    success_url: `${origin}/c/${checkout.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/c/${checkout.id}?canceled=1`,
  }
  if (isEmail(checkout.clientEmail)) params.customer_email = checkout.clientEmail
  if (checkout.collectShipping && checkout.shipCountries.length > 0) {
    params.shipping_address_collection = { allowed_countries: checkout.shipCountries as AllowedCountry[] }
  }
  return params
}

export interface PaymentRecord {
  state: 'paid' | 'processing'
  amount: number
  currency: string
  paidAt: string
}

function toRecord(state: PaymentRecord['state'], pi: Stripe.PaymentIntent): PaymentRecord {
  const minor = pi.amount_received || pi.amount
  return {
    state,
    amount: fromMinor(minor, pi.currency),
    currency: pi.currency.toUpperCase(),
    paidAt: new Date(pi.created * 1000).toISOString(),
  }
}

/** Latest successful (or still processing) payment for a checkout, using Stripe search. */
export async function findPayment(stripe: Stripe, checkoutId: string): Promise<PaymentRecord | null> {
  const result = await stripe.paymentIntents.search({ query: `metadata['checkout_id']:'${checkoutId}'`, limit: 20 })
  const newest = [...result.data].sort((a, b) => b.created - a.created)
  const paid = newest.find((pi) => pi.status === 'succeeded')
  if (paid) return toRecord('paid', paid)
  const processing = newest.find((pi) => pi.status === 'processing')
  return processing ? toRecord('processing', processing) : null
}

/** Every paid checkout, keyed by checkout id (owner view). */
export async function listPaidCheckouts(stripe: Stripe, maxPages = 5): Promise<Record<string, PaymentRecord>> {
  const out: Record<string, PaymentRecord> = {}
  let page: string | undefined
  for (let i = 0; i < maxPages; i++) {
    const result = await stripe.paymentIntents.search({
      query: "metadata['app']:'innovatif' AND status:'succeeded'",
      limit: 100,
      ...(page ? { page } : {}),
    })
    for (const pi of result.data) {
      const id = pi.metadata?.checkout_id
      if (!id) continue
      const record = toRecord('paid', pi)
      if (!out[id] || out[id].paidAt < record.paidAt) out[id] = record
    }
    if (!result.has_more || !result.next_page) break
    page = result.next_page
  }
  return out
}

export interface SessionPayment {
  state: 'paid' | 'processing' | 'unpaid'
  amount: number
  currency: string
  paidAt: string
}

/** Status of the Checkout Session Stripe redirected back with, if it belongs to this checkout. */
export async function sessionPayment(stripe: Stripe, checkoutId: string, sessionId: string): Promise<SessionPayment | null> {
  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch (error) {
    if ((error as { type?: string })?.type === 'StripeInvalidRequestError') return null
    throw error
  }
  if (session.client_reference_id !== checkoutId && session.metadata?.checkout_id !== checkoutId) return null
  const currency = session.currency ?? 'usd'
  return {
    state: session.payment_status === 'paid' ? 'paid' : session.status === 'complete' ? 'processing' : 'unpaid',
    amount: fromMinor(session.amount_total ?? 0, currency),
    currency: currency.toUpperCase(),
    paidAt: new Date(session.created * 1000).toISOString(),
  }
}
