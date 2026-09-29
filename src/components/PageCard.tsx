import { Link } from 'react-router-dom'
import type { Page } from '../types'
import { formatDate, formatMoney, pluralize, totals } from '../lib/format'
import { Illustration } from '../lib/illustrations'
import { Img } from './Img'

export function PageCard({ page }: { page: Page }) {
  const t = totals(page.services)
  return (
    <Link to={`/p/${page.id}`} className="card">
      <div className="card-art artboard artboard-black">
        {page.coverImage ? <Img src={page.coverImage} className="card-img" /> : <Illustration k={page.cover} size={110} />}
      </div>
      <div className="card-body">
        <div className="card-eyebrow">
          <span className="card-client">{page.client || 'No client'}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDate(page.updatedAt)}</span>
        </div>
        <h3>{page.title}</h3>
        <div className="card-meta">
          <span>{pluralize(page.services.length, 'service')}</span>
          {t.hasSavings && <span className="pill pill-blue">Save {t.pct}%</span>}
          <span className="card-price">{formatMoney(t.price, page.currency)}</span>
        </div>
      </div>
    </Link>
  )
}
