import { Link } from 'react-router-dom'
import type { Checkout, Page } from '../types'
import { checkoutTotals } from '../lib/checkout'
import { formatDate, formatMoney, pluralize, totals } from '../lib/format'
import { Illustration } from '../lib/illustrations'
import type { PaidInfo } from '../lib/payments'
import { Img } from './Img'
import { CheckIcon } from './icons'

export function PageCard({ page }: { page: Page }) {
  const t = totals(page.services)
  return (
    <Link to={`/p/${page.id}`} className="card">
      <div className="card-art artboard artboard-black">
        <span className="card-kind">Pricing page</span>
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

export function CheckoutCard({ checkout, paid }: { checkout: Checkout; paid?: PaidInfo }) {
  const t = checkoutTotals(checkout)
  const withImage = checkout.items.find((i) => i.image)
  const first = checkout.items[0]
  return (
    <Link to={`/c/${checkout.id}`} className="card">
      <div className="card-art artboard artboard-black">
        <span className="card-kind">Checkout</span>
        {withImage?.image ? (
          <Img src={withImage.image} className="card-img" />
        ) : (
          <Illustration k={first?.illustration ?? 'ecommerce'} size={110} />
        )}
      </div>
      <div className="card-body">
        <div className="card-eyebrow">
          <span className="card-client">{checkout.client || 'No client'}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDate(checkout.updatedAt)}</span>
        </div>
        <h3>{checkout.title}</h3>
        <div className="card-meta">
          <span>{pluralize(t.itemCount, 'item')}</span>
          {paid ? (
            <span className="pill pill-dark">
              <CheckIcon size={13} /> Paid
            </span>
          ) : (
            t.savingsMinor > 0 && <span className="pill pill-blue">Save {t.savingsPct}%</span>
          )}
          <span className="card-price">{formatMoney(t.total, checkout.currency)}</span>
        </div>
      </div>
    </Link>
  )
}
