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
