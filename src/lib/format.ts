export function formatMoney(amount: number, currency: string): string {
  const code = (currency || 'USD').toUpperCase()
  const digits = Math.abs(amount % 1) < 0.005 ? 0 : 2
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount)
  } catch {
    return `${code} ${amount.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
  }
}

export interface Totals {
  price: number
  market: number
  savings: number
  pct: number
  hasSavings: boolean
}

export function totals(services: { price: number; marketPrice: number }[]): Totals {
  const price = services.reduce((sum, s) => sum + (s.price || 0), 0)
  const market = services.reduce((sum, s) => sum + (s.marketPrice || 0), 0)
  const savings = market - price
  const hasSavings = market > 0 && savings > 0
  const pct = hasSavings ? Math.round((savings / market) * 100) : 0
  return { price, market, savings, pct, hasSavings }
}

export function savingsFor(price: number, marketPrice: number) {
  const savings = marketPrice - price
  const has = marketPrice > 0 && savings > 0
  return { savings, pct: has ? Math.round((savings / marketPrice) * 100) : 0, has }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function toDateOnly(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayISO(): string {
  return toDateOnly(new Date())
}

export function plusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toDateOnly(d)
}

export function formatDate(value: string): string {
  if (!value) return ''
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function pluralize(n: number, word: string, plural = `${word}s`): string {
  return `${n} ${n === 1 ? word : plural}`
}

/** Lines that start with "- ", "* " or "• " become checklist items; everything else is prose. */
export function parseDescription(text: string): { paragraphs: string[]; bullets: string[] } {
  const paragraphs: string[] = []
  const bullets: string[] = []
  let buffer: string[] = []
  const flush = () => {
    if (buffer.length) paragraphs.push(buffer.join(' '))
    buffer = []
  }
  for (const raw of (text || '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    const bullet = /^[-*•]\s+(.+)$/.exec(line)
    if (bullet) bullets.push(bullet[1].trim())
    else buffer.push(line)
  }
  flush()
  return { paragraphs, bullets }
}

export interface ContactParts {
  email: string | null
  phone: string | null
  website: string | null
}

export function parseContact(contact: string): ContactParts {
  const email = /[\w.+-]+@[\w-]+(\.[\w-]+)+/.exec(contact)?.[0] ?? null
  const withoutEmail = email ? contact.replace(email, ' ') : contact
  const phone = /\+?\(?\d[\d\s().-]{6,}\d/.exec(withoutEmail)?.[0]?.trim() ?? null
  const website =
    /(https?:\/\/[^\s·|,]+|www\.[^\s·|,]+|\b[a-z0-9-]+\.[a-z]{2,}(\/[^\s·|,]*)?)/i.exec(withoutEmail)?.[0] ?? null
  return { email, phone, website }
}

export function websiteHref(site: string): string {
  return /^https?:\/\//i.test(site) ? site : `https://${site}`
}
