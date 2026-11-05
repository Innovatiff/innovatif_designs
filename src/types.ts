export const ILLUSTRATION_KEYS = [
  'product',
  'design',
  'software',
  'social',
  'branding',
  'marketing',
  'web',
  'mobile',
  'video',
  'content',
  'strategy',
  'print',
  'ecommerce',
  'seo',
  'other',
] as const

export type IllustrationKey = (typeof ILLUSTRATION_KEYS)[number]

export interface ServiceItem {
  id: string
  name: string
  description: string
  illustration: IllustrationKey
  /** `img:<firestore id>` for uploads, or an http(s) URL. */
  image: string | null
  /** What you charge. */
  price: number
  /** What the market typically charges. */
  marketPrice: number
}

export interface PageInput {
  title: string
  client: string
  intro: string
  cover: IllustrationKey
  coverImage: string | null
  currency: string
  validUntil: string
  reference: string
  services: ServiceItem[]
  notes: string
  preparedBy: string
  contact: string
  ctaText: string
}

export interface Page extends PageInput {
  id: string
  createdAt: string
  updatedAt: string
}

export interface CheckoutItem {
  id: string
  name: string
  description: string
  illustration: IllustrationKey
  /** `img:<firestore id>` for uploads, or an http(s) URL. */
  image: string | null
  quantity: number
  /** Price per unit. */
  price: number
  /** Optional list (compare-at) price per unit. 0 hides it. */
  listPrice: number
}

export interface CheckoutInput {
  title: string
  client: string
  /** Pre-fills the email field on the Stripe payment page. */
  clientEmail: string
  reference: string
  currency: string
  items: CheckoutItem[]
  /** Flat shipping & handling fee for the whole order. */
  shipping: number
  /** Tax rate in percent, applied to the items subtotal. */
  taxRate: number
  /** Ask for a delivery address on the Stripe payment page. */
  collectShipping: boolean
  /** Two-letter country codes the order can ship to. */
  shipCountries: string[]
  notes: string
  preparedBy: string
  contact: string
}

export interface Checkout extends CheckoutInput {
  id: string
  createdAt: string
  updatedAt: string
}
