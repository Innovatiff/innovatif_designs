import type { ReactNode } from 'react'
import type { Page, PageInput, ServiceItem } from '../types'
import {
  formatDate,
  formatMoney,
  parseContact,
  parseDescription,
  pluralize,
  savingsFor,
  todayISO,
  totals,
  websiteHref,
} from '../lib/format'
import { Illustration, illustrationLabel } from '../lib/illustrations'
import { Img } from './Img'
import { CheckIcon } from './icons'
import { Wordmark } from './Wordmark'

interface Props {
  page: PageInput & Partial<Pick<Page, 'updatedAt'>>
  /** Rendered inside the editor: no navigation links. */
  preview?: boolean
}

function ContactLine({ contact }: { contact: string }) {
  const parts = contact
    .split(/\s*(?:·|\||\n|,)\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
  const nodes: ReactNode[] = []
  parts.forEach((part, index) => {
    const { email, website } = parseContact(part)
    let node: ReactNode = part
    if (email && part === email) node = <a href={`mailto:${email}`}>{email}</a>
    else if (website && part === website) node = <a href={websiteHref(website)} target="_blank" rel="noreferrer">{website}</a>
    if (index > 0) nodes.push(<span key={`sep-${index}`} className="cta-sep" aria-hidden="true">·</span>)
    nodes.push(<span key={index}>{node}</span>)
  })
  return <p className="cta-contact">{nodes}</p>
}

function Service({ service, index, currency }: { service: ServiceItem; index: number; currency: string }) {
  const { paragraphs, bullets } = parseDescription(service.description)
  const saving = savingsFor(service.price, service.marketPrice)
  const fmt = (n: number) => formatMoney(n, currency)
  return (
    <div className="service">
      <div className="service-art artboard artboard-light">
        {service.image ? <Img src={service.image} className="service-img" /> : <Illustration k={service.illustration} size={84} />}
      </div>
      <div className="service-body">
        <div className="service-index">
          {String(index + 1).padStart(2, '0')} · {illustrationLabel(service.illustration)}
        </div>
        <h3>{service.name || 'Untitled service'}</h3>
        {paragraphs.map((p, i) => (
          <p className="service-desc" key={i}>
            {p}
          </p>
        ))}
        {bullets.length > 0 && (
          <ul className="checks">
            {bullets.map((b, i) => (
              <li key={i}>
                <CheckIcon size={16} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="service-price">
        {saving.has && (
          <div className="price-market">
            Market price <s>{fmt(service.marketPrice)}</s>
          </div>
        )}
        <div className="price-label">Your price</div>
        <div className="price-ours">{fmt(service.price)}</div>
        {saving.has && (
          <span className="pill pill-blue">
            Save {fmt(saving.savings)} · {saving.pct}%
          </span>
        )}
      </div>
    </div>
  )
}

export function Proposal({ page, preview = false }: Props) {
  const services = page.services
  const t = totals(services)
  const fmt = (n: number) => formatMoney(n, page.currency)
  const contact = parseContact(page.contact)
  const date = formatDate(page.updatedAt || todayISO())
  const title = page.title || 'Untitled page'
  const oursWidth = t.market > 0 ? Math.max(3, Math.min(100, (t.price / t.market) * 100)) : 100
  const mailto = contact.email
    ? `mailto:${contact.email}?subject=${encodeURIComponent(`${title}${page.reference ? ` (${page.reference})` : ''}`)}&body=${encodeURIComponent(
        `Hi${page.preparedBy ? ` ${page.preparedBy}` : ''},\n\nWe would like to go ahead with "${title}".\n\n`,
      )}`
    : null
  const tel = contact.phone ? `tel:${contact.phone.replace(/[^\d+]/g, '')}` : null

  return (
    <article className={`proposal${preview ? ' proposal-preview' : ''}`}>
      <header className="p-hero">
        <div className="p-hero-inner">
          <div className="p-topline">
            <Wordmark to={null} tone="light" label={page.preparedBy || undefined} />
            <span className="p-topline-ref">Proposal{page.reference ? ` · ${page.reference}` : ''}</span>
          </div>
          <div className="p-hero-grid">
            <div className="p-hero-text">
              {page.client && (
                <p className="p-for">
                  Prepared for <strong>{page.client}</strong>
                </p>
              )}
              <h1 className="p-title">{title}</h1>
              {page.intro && <p className="p-intro">{page.intro}</p>}
              <dl className="p-meta">
                {page.preparedBy && (
                  <div>
                    <dt>Prepared by</dt>
                    <dd>{page.preparedBy}</dd>
                  </div>
                )}
                <div>
                  <dt>Date</dt>
                  <dd>{date}</dd>
                </div>
                {page.validUntil && (
                  <div>
                    <dt>Valid until</dt>
                    <dd>{formatDate(page.validUntil)}</dd>
                  </div>
                )}
                <div>
                  <dt>Scope</dt>
                  <dd>{pluralize(services.length, 'service')}</dd>
                </div>
              </dl>
            </div>
            <div className="p-hero-art">
              {page.coverImage ? (
                <Img src={page.coverImage} className="p-cover-img" />
              ) : (
                <div className="artboard artboard-dark p-cover-board">
                  <Illustration k={page.cover} size={210} />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="p-summary">
        <div className="p-summary-card">
          <div className={`stats${t.hasSavings ? '' : ' stats-2'}`}>
            {t.hasSavings && (
              <div className="stat">
                <span className="stat-label">Market value</span>
                <span className="stat-value stat-strike">{fmt(t.market)}</span>
                <span className="stat-sub">What this typically costs</span>
              </div>
            )}
            <div className="stat stat-primary">
              <span className="stat-label">Your investment</span>
              <span className="stat-value">{fmt(t.price)}</span>
              <span className="stat-sub">{pluralize(services.length, 'service')}, everything included</span>
            </div>
            {t.hasSavings ? (
              <div className="stat">
                <span className="stat-label">You save</span>
                <span className="stat-value">{fmt(t.savings)}</span>
                <span className="stat-sub">
                  <span className="pill pill-blue">{t.pct}% below market</span>
                </span>
              </div>
            ) : (
              <div className="stat">
                <span className="stat-label">Valid until</span>
                <span className="stat-value stat-small">{page.validUntil ? formatDate(page.validUntil) : 'Open'}</span>
                <span className="stat-sub">Pricing is fixed for this period</span>
              </div>
            )}
          </div>
          {t.hasSavings && (
            <div className="compare" aria-label="Price comparison">
              <div className="compare-row">
                <span>Market</span>
                <div className="bar">
                  <div className="bar-fill bar-market" style={{ width: '100%' }} />
                </div>
                <strong>{fmt(t.market)}</strong>
              </div>
              <div className="compare-row">
                <span>You pay</span>
                <div className="bar">
                  <div className="bar-fill bar-ours" style={{ width: `${oursWidth}%` }} />
                </div>
                <strong className="compare-ours">{fmt(t.price)}</strong>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="p-services">
        <div className="p-section-head">
          <h2>What's included</h2>
          <p>Every service, with what the market charges next to what you pay.</p>
        </div>
        <div className="service-list">
          {services.length === 0 && <p className="service-empty">No services yet.</p>}
          {services.map((s, i) => (
            <Service key={s.id} service={s} index={i} currency={page.currency} />
          ))}
        </div>
      </section>

      <section className="p-invest">
        <div className="p-invest-inner">
          <div className="invest">
            <h2>Investment summary</h2>
            <table className="invest-table">
              <thead>
                <tr>
                  <th>Service</th>
                  {t.market > 0 && <th className="r">Market</th>}
                  <th className="r">Your price</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name || 'Untitled service'}</td>
                    {t.market > 0 && <td className="r muted">{s.marketPrice ? fmt(s.marketPrice) : '—'}</td>}
                    <td className="r">{fmt(s.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="invest-total">
              {t.hasSavings && (
                <>
                  <div className="invest-total-row">
                    <span>Total market value</span>
                    <s>{fmt(t.market)}</s>
                  </div>
                  <div className="invest-total-row invest-savings">
                    <span>You save ({t.pct}%)</span>
                    <span>−{fmt(t.savings)}</span>
                  </div>
                </>
              )}
              <div className="invest-total-row grand">
                <span>Your investment</span>
                <strong>{fmt(t.price)}</strong>
              </div>
            </div>
          </div>
          <div className="cta">
            <h2>{page.ctaText || 'Ready to get started?'}</h2>
            <p>Reply to this proposal or reach out directly. We'll confirm the timeline and get moving right away.</p>
            {(mailto || tel) && (
              <div className="cta-actions">
                {mailto && (
                  <a className="btn btn-white btn-lg" href={mailto}>
                    Accept proposal
                  </a>
                )}
                {tel && (
                  <a className="btn btn-outline-light btn-lg" href={tel}>
                    Call {contact.phone}
                  </a>
                )}
              </div>
            )}
            {page.contact && <ContactLine contact={page.contact} />}
          </div>
        </div>
      </section>

      {page.notes && (
        <section className="p-notes">
          <h3>Notes &amp; terms</h3>
          <p>{page.notes}</p>
        </section>
      )}

      <footer className="p-foot">
        <span>
          {page.preparedBy ? `Prepared by ${page.preparedBy}` : 'Prepared with Innovatif Designs'} · {date}
        </span>
        {page.reference && <span>{page.reference}</span>}
      </footer>
    </article>
  )
}
