import { ILLUSTRATION_KEYS, type IllustrationKey, type Page, type PageInput, type ServiceItem } from '../types'
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
