import {
  ILLUSTRATION_KEYS,
  type Checkout,
  type CheckoutInput,
  type CheckoutItem,
  type IllustrationKey,
  type Page,
  type PageInput,
  type ServiceItem,
} from '../types'
import { SHIPPING_COUNTRIES, parseCountryList } from './countries'
import { plusDays } from './format'

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

export function newId(length = 10): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('')
}

function text(value: unknown, max: number): string {
  const s = typeof value === 'string' ? value : value == null ? '' : String(value)
  return s.slice(0, max)
}

function clampMoney(n: number): number {
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0
}

/** Accepts numbers or typed strings such as "1,200", "1200.50" or "1200,50". */
export function toMoney(value: unknown): number {
  if (typeof value === 'number') return clampMoney(value)
  let s = String(value ?? '').trim().replace(/[^\d.,-]/g, '')
  if (!s) return 0
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > -1 && lastDot === -1 && s.length - lastComma - 1 === 2 && (s.match(/,/g) || []).length === 1) {
    s = s.replace(',', '.')
  } else {
    s = s.replace(/,/g, '')
  }
  return clampMoney(parseFloat(s))
}

export function isImageRef(value: unknown): value is string {
  return typeof value === 'string' && (/^img:[A-Za-z0-9_-]{1,80}$/.test(value) || /^https?:\/\/\S{1,2000}$/.test(value))
}

function illustration(value: unknown): IllustrationKey {
  return (ILLUSTRATION_KEYS as readonly string[]).includes(value as string) ? (value as IllustrationKey) : 'other'
}

function dateOnly(value: unknown): string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
}

export function normalizeService(input: unknown): ServiceItem {
  const s = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const id = String(s.id ?? '')
  return {
    id: /^[A-Za-z0-9_-]{1,40}$/.test(id) ? id : newId(),
    name: text(s.name, 200).trim(),
    description: text(s.description, 5000),
    illustration: illustration(s.illustration),
    image: isImageRef(s.image) ? s.image : null,
    price: toMoney(s.price),
    marketPrice: toMoney(s.marketPrice),
  }
}

export function normalizeInput(input: unknown): PageInput {
  const p = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  return {
    title: text(p.title, 200).trim(),
    client: text(p.client, 200).trim(),
    intro: text(p.intro, 3000),
    cover: illustration(p.cover),
    coverImage: isImageRef(p.coverImage) ? p.coverImage : null,
    currency: text(p.currency, 8).trim().toUpperCase() || 'USD',
    validUntil: dateOnly(p.validUntil),
    reference: text(p.reference, 60).trim(),
    services: (Array.isArray(p.services) ? p.services : []).slice(0, 60).map(normalizeService),
    notes: text(p.notes, 5000),
    preparedBy: text(p.preparedBy, 200).trim(),
    contact: text(p.contact, 400).trim(),
    ctaText: text(p.ctaText, 200).trim(),
  }
}

export function normalizePage(input: unknown, meta: { id: string; createdAt: string; updatedAt: string }): Page {
  return { ...normalizeInput(input), ...meta }
}

export function isServiceEmpty(s: ServiceItem): boolean {
  return !s.name.trim() && !s.description.trim() && !s.price && !s.marketPrice && !s.image
}

export function makeReference(n: number, date = new Date()): string {
  return `ID-${date.getFullYear()}-${String(n).padStart(3, '0')}`
}

/** An example page that shows what a finished page looks like. */
export function seedPage(): PageInput {
  return {
    title: 'Brand identity & website launch',
    client: 'Aurora Coffee Co.',
    intro:
      'A complete launch package that takes Aurora Coffee from a neighbourhood favourite to a brand people recognise: a distinctive identity, a website that sells, and content ready for opening week.',
    cover: 'branding',
    coverImage: null,
    currency: 'USD',
    validUntil: plusDays(30),
    reference: makeReference(1),
    services: [
      {
        id: newId(),
        name: 'Brand identity',
        description:
          'A logo system and visual language built to work everywhere, from cups and signage to Instagram.\n- Primary logo, monogram and wordmark\n- Colour palette and typography\n- 24-page brand guidelines\n- Two rounds of revisions',
        illustration: 'branding',
        image: null,
        price: 1650,
        marketPrice: 2400,
      },
      {
        id: newId(),
        name: 'Website design & development',
        description:
          'A fast, mobile-first website with online ordering hooks and an easy editor so the team can update the menu themselves.\n- 5 designed pages\n- Content management system\n- Search engine basics and analytics\n- Launch support for 30 days',
        illustration: 'web',
        image: null,
        price: 3200,
        marketPrice: 4800,
      },
      {
        id: newId(),
        name: 'Social media kit',
        description:
          'Templates and launch content so every post looks like the brand from day one.\n- 30 editable post and story templates\n- Highlight covers and profile assets\n- 12 launch-week posts, written and designed',
        illustration: 'social',
        image: null,
        price: 750,
        marketPrice: 1200,
      },
      {
        id: newId(),
        name: 'Product photography',
        description: 'Half-day shoot at the café with 40 edited images for the website, menus and social media.',
        illustration: 'video',
        image: null,
        price: 650,
        marketPrice: 900,
      },
    ],
    notes:
      'Timeline: 4–5 weeks from kick-off.\nPayment: 50% to start, 50% on delivery.\nEach deliverable includes two rounds of revisions. Additional pages, templates or shoot days are quoted separately.',
    preparedBy: 'Innovatif Designs',
    contact: 'hello@innovatifdesigns.com · +1 (555) 010-2030',
    ctaText: 'Ready to get started?',
  }
}

// ---------------------------------------------------------------------------
// Checkouts
// ---------------------------------------------------------------------------

/** Whole quantity between 1 and 999. */
export function toQuantity(value: unknown): number {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? '').replace(/[^\d]/g, ''), 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(999, Math.floor(n))
}

/** Percentage between 0 and 100, up to three decimals ("8.25", "8,25 %"). */
export function toRate(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(',', '.').replace(/[^\d.]/g, ''))
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(100, Math.round(n * 1000) / 1000)
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function rowId(value: unknown): string {
  const id = String(value ?? '')
  return /^[A-Za-z0-9_-]{1,40}$/.test(id) ? id : newId()
}

export function normalizeCheckoutItem(input: unknown): CheckoutItem {
  const s = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  return {
    id: rowId(s.id),
    name: text(s.name, 200).trim(),
    description: text(s.description, 3000),
    illustration: illustration(s.illustration ?? 'product'),
    image: isImageRef(s.image) ? s.image : null,
    quantity: toQuantity(s.quantity),
    price: toMoney(s.price),
    listPrice: toMoney(s.listPrice),
  }
}

export function normalizeCheckoutInput(input: unknown): CheckoutInput {
  const p = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const email = text(p.clientEmail, 200).trim()
  return {
    title: text(p.title, 200).trim(),
    client: text(p.client, 200).trim(),
    clientEmail: isEmail(email) ? email : '',
    reference: text(p.reference, 60).trim(),
    currency: text(p.currency, 8).trim().toUpperCase() || 'USD',
    items: (Array.isArray(p.items) ? p.items : []).slice(0, 50).map(normalizeCheckoutItem),
    shipping: toMoney(p.shipping),
    taxRate: toRate(p.taxRate),
    collectShipping: p.collectShipping === true,
    shipCountries: parseCountryList(p.shipCountries).filter((c) => SHIPPING_COUNTRIES.has(c)),
    notes: text(p.notes, 5000),
    preparedBy: text(p.preparedBy, 200).trim(),
    contact: text(p.contact, 400).trim(),
  }
}

export function normalizeCheckout(input: unknown, meta: { id: string; createdAt: string; updatedAt: string }): Checkout {
  return { ...normalizeCheckoutInput(input), ...meta }
}

export function isItemEmpty(item: CheckoutItem): boolean {
  return !item.name.trim() && !item.description.trim() && !item.price && !item.listPrice && !item.image
}

/** An example checkout that shows what a finished one looks like. */
export function seedCheckout(): CheckoutInput {
  return {
    title: 'Brand launch kit',
    client: 'Aurora Coffee Co.',
    clientEmail: '',
    reference: makeReference(2),
    currency: 'USD',
    items: [
      {
        id: newId(),
        name: 'Logo design package',
        description:
          'A complete logo system ready for print, signage and social media.\n- Primary logo, monogram and wordmark\n- Files for print and screen\n- Two rounds of revisions',
        illustration: 'branding',
        image: null,
        quantity: 1,
        price: 650,
        listPrice: 900,
      },
      {
        id: newId(),
        name: 'Premium business cards (box of 250)',
        description: 'Double-sided, 400gsm matte card with a soft-touch finish. Printed and delivered to your door.',
        illustration: 'print',
        image: null,
        quantity: 2,
        price: 89,
        listPrice: 129,
      },
      {
        id: newId(),
        name: 'Social media template pack',
        description: '30 editable post and story templates in your brand colours and fonts.',
        illustration: 'social',
        image: null,
        quantity: 1,
        price: 180,
        listPrice: 250,
      },
    ],
    shipping: 15,
    taxRate: 8,
    collectShipping: true,
    shipCountries: ['US', 'CA'],
    notes: 'Digital files are delivered within 7 business days. Printed cards ship within 10 business days of artwork approval.',
    preparedBy: 'Innovatif Designs',
    contact: 'hello@innovatifdesigns.com · +1 (555) 010-2030',
  }
}
