import type { ReactNode } from 'react'
import type { CheckoutInput } from '../types'
import { checkoutTotals, formatRate, type CheckoutLine } from '../lib/checkout'
import { countryName } from '../lib/countries'
import { formatDate, formatMoney, hasCents, parseContact, parseDescription, pluralize, websiteHref } from '../lib/format'
import { Illustration } from '../lib/illustrations'
import { fromMinor } from '../lib/money'
import type { PaymentStatus } from '../lib/payments'
import { Img } from './Img'
import { CardIcon, CheckCircleIcon, CheckIcon, ClockIcon, LockIcon, TruckIcon } from './icons'
import { Wordmark } from './Wordmark'

export interface CheckoutPageProps {
  checkout: CheckoutInput & { id?: string; updatedAt?: string }
  /** Rendered inside the editor: the pay button does nothing. */
  preview?: boolean
  /** Payment state from Stripe; null while loading. */
  status?: PaymentStatus | null
  paying?: boolean
  payError?: string
  notice?: 'success' | 'canceled' | null
  onPay?: () => void
}

type Fmt = (amount: number) => string

function ItemRow({ line, currency, fmt }: { line: CheckoutLine; currency: string; fmt: Fmt }) {
  const { item } = line
  const { paragraphs, bullets } = parseDescription(item.description)
  const unit = fromMinor(line.unitMinor, currency)
  const listUnit = fromMinor(line.listUnitMinor, currency)
  const onSale = line.listUnitMinor > line.unitMinor
  const pct = onSale ? Math.round(((line.listUnitMinor - line.unitMinor) / line.listUnitMinor) * 100) : 0
  return (
    <li className="co-item">
      <div className="co-item-art">
        {item.image ? (
          <Img src={item.image} className="co-item-img" alt={item.name} />
        ) : (
          <div className="artboard artboard-light">
            <Illustration k={item.illustration} size={64} />
          </div>
        )}
      </div>
      <div className="co-item-main">
        <h3>{item.name || 'Untitled product'}</h3>
        {paragraphs.map((p, i) => (
          <p className="co-item-desc" key={i}>
            {p}
          </p>
        ))}
        {bullets.length > 0 && (
          <ul className="checks">
            {bullets.map((b, i) => (
              <li key={i}>
                <CheckIcon size={15} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
        {onSale && (
          <div className="co-item-save">
            <span>
              List price: <s>{fmt(listUnit)}</s>
            </span>
            <span className="pill pill-blue">
              {line.unitMinor === 0 ? 'Free' : `Save ${fmt(listUnit - unit)} (${pct}%)`}
            </span>
          </div>
        )}
        <div className="co-item-meta">
          <span className="co-qty">Qty: {item.quantity}</span>
          {item.quantity > 1 && <span>{fmt(unit)} each</span>}
        </div>
      </div>
      <div className="co-item-price">{line.unitMinor === 0 ? 'Free' : fmt(fromMinor(line.lineMinor, currency))}</div>
    </li>
  )
}

function SellerLine({ seller, contact }: { seller: string; contact: string }) {
  const parts = contact
    .split(/\s*(?:·|\||\n|,)\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
  const nodes: ReactNode[] = []
  parts.forEach((part, i) => {
    const { email, website } = parseContact(part)
    let node: ReactNode = part
    if (email && part === email) node = <a href={`mailto:${email}`}>{email}</a>
    else if (website && part === website)
      node = (
        <a href={websiteHref(website)} target="_blank" rel="noreferrer">
          {website}
        </a>
      )
    nodes.push(<span key={i}>{node}</span>)
  })
  return (
    <p className="co-seller">
      {seller && (
        <span>
          Sold by <strong>{seller}</strong>
        </span>
      )}
      {nodes}
    </p>
  )
}

interface PayAreaProps {
  total: number
  fmt: Fmt
  status?: PaymentStatus | null
  paying?: boolean
  payError?: string
  preview?: boolean
  seller: string
  onPay?: () => void
}

function PayArea({ total, fmt, status, paying, payError, preview, seller, onPay }: PayAreaProps) {
  if (status?.state === 'paid') {
    return (
      <div className="co-paid" role="status">
        <CheckCircleIcon size={30} />
        <div>
          <strong>Paid</strong>
          <span>
            {fmt(status.amount ?? total)}
            {status.paidAt ? ` on ${formatDate(status.paidAt)}` : ''}
          </span>
        </div>
      </div>
    )
  }
  if (status?.state === 'processing') {
    return (
      <div className="co-paid co-processing" role="status">
        <ClockIcon size={30} />
        <div>
          <strong>Payment processing</strong>
          <span>Your bank is confirming the payment. Nothing else to do.</span>
        </div>
      </div>
    )
  }
  const unavailable = !preview && status != null && !status.configured && !status.demo
  return (
    <div className="co-pay">
      <button
        type="button"
        className="btn btn-blue co-pay-btn"
        onClick={preview ? undefined : onPay}
        disabled={!preview && (paying || unavailable)}
        tabIndex={preview ? -1 : undefined}
      >
        <LockIcon size={18} />
        {paying ? 'Opening secure payment…' : `Pay ${fmt(total)}`}
      </button>
      {unavailable ? (
        <p className="co-pay-note">
          Online payment isn't switched on yet. Contact {seller || 'the seller'} to complete this order.
        </p>
      ) : (
        <p className="co-pay-note">You'll pay on Stripe's secure page. Cards, Apple Pay and Google Pay where available.</p>
      )}
      {payError && (
        <p className="co-pay-error" role="alert">
          {payError}
        </p>
      )}
    </div>
  )
}

export function CheckoutPage({ checkout, preview = false, status, paying, payError, notice, onPay }: CheckoutPageProps) {
  const currency = checkout.currency || 'USD'
  const t = checkoutTotals(checkout)
  const exact = [t.total, t.shipping, t.tax, ...t.lines.map((l) => fromMinor(l.unitMinor, currency))].some(hasCents)
  const fmt: Fmt = (n) => formatMoney(n, currency, exact)
  const seller = checkout.preparedBy
  const paid = status?.state === 'paid'
  const unavailable = !preview && status != null && !status.configured && !status.demo
  const shipTo = checkout.shipCountries.slice(0, 6).map(countryName).join(', ')
  const showShipping = t.shippingMinor > 0 || checkout.collectShipping

  return (
    <div className={`co${preview ? ' co-preview' : ''}`}>
      <header className="co-head">
        <div className="co-head-inner">
          <Wordmark to={null} tone="light" size="lg" label={seller || undefined} />
          <div className="co-head-title">
            Checkout <span>({pluralize(t.itemCount, 'item')})</span>
          </div>
          <div className="co-head-secure">
            <LockIcon size={16} />
            <span>Secure checkout</span>
          </div>
        </div>
      </header>

      {notice === 'success' && paid && (
        <div className="co-banner co-banner-success" role="status">
          <div className="co-banner-inner">
            <CheckCircleIcon size={24} />
            <div>
              <strong>Thank you! Your order is placed.</strong>
              <span>
                We received your payment of {fmt(status?.amount ?? t.total)}
                {checkout.reference ? `. Order reference ${checkout.reference}` : ''}.
              </span>
            </div>
          </div>
        </div>
      )}
      {notice === 'canceled' && !paid && (
        <div className="co-banner" role="status">
          <div className="co-banner-inner">
            <LockIcon size={20} />
            <div>
              <strong>Payment canceled.</strong>
              <span>You have not been charged. You can pay whenever you're ready.</span>
            </div>
          </div>
        </div>
      )}

      <main className="co-main">
        <div className="co-left">
          <div className="co-intro">
            <h1>{checkout.title || 'Untitled checkout'}</h1>
            {(checkout.client || checkout.reference) && (
              <p>
                {checkout.client && (
                  <>
                    Order for <strong>{checkout.client}</strong>
                  </>
                )}
                {checkout.client && checkout.reference && <span aria-hidden="true"> · </span>}
                {checkout.reference && <>Ref {checkout.reference}</>}
              </p>
            )}
          </div>

          <section className="co-card">
            <header className="co-step">
              <span className="co-step-n">1</span>
              <h2>Review items</h2>
              <span className="co-step-meta">{pluralize(t.itemCount, 'item')}</span>
            </header>
            {t.lines.length === 0 ? (
              <p className="co-empty">No products yet.</p>
            ) : (
              <ul className="co-items">
                {t.lines.map((line) => (
                  <ItemRow key={line.item.id} line={line} currency={currency} fmt={fmt} />
                ))}
              </ul>
            )}
          </section>

          <section className="co-card">
            <header className="co-step">
              <span className="co-step-n">2</span>
              <h2>{checkout.collectShipping ? 'Delivery & payment' : 'Payment'}</h2>
            </header>
            <div className="co-info-list">
              {checkout.collectShipping && (
                <div className="co-info">
                  <span className="co-info-icon">
                    <TruckIcon size={20} />
                  </span>
                  <div>
                    <strong>Delivery address</strong>
                    <p>
                      You'll enter it on the next step.
                      {shipTo && ` We ship to ${shipTo}${checkout.shipCountries.length > 6 ? ' and more' : ''}.`}
                    </p>
                  </div>
                </div>
              )}
              <div className="co-info">
                <span className="co-info-icon">
                  <CardIcon size={20} />
                </span>
                <div>
                  <strong>Pay securely with Stripe</strong>
                  <p>Pay by card, or with Apple Pay and Google Pay on supported devices.</p>
                </div>
              </div>
              <div className="co-info">
                <span className="co-info-icon">
                  <LockIcon size={20} />
                </span>
                <div>
                  <strong>Your details stay private</strong>
                  <p>Card details go straight to Stripe and are never stored on this site.</p>
                </div>
              </div>
            </div>
          </section>

          {checkout.notes && (
            <section className="co-card co-notes">
              <h2>Notes &amp; terms</h2>
              <p>{checkout.notes}</p>
            </section>
          )}

          {(seller || checkout.contact) && <SellerLine seller={seller} contact={checkout.contact} />}
        </div>

        <aside className="co-right" aria-label="Order summary">
          <div className="co-summary">
            <PayArea
              total={t.total}
              fmt={fmt}
              status={status}
              paying={paying}
              payError={payError}
              preview={preview}
              seller={seller}
              onPay={onPay}
            />
            <h2>Order summary</h2>
            <dl className="co-rows">
              <div>
                <dt>Items ({t.itemCount}):</dt>
                <dd>{fmt(t.subtotal)}</dd>
              </div>
              {showShipping && (
                <div>
                  <dt>Shipping &amp; handling:</dt>
                  <dd>{t.shippingMinor > 0 ? fmt(t.shipping) : 'Free'}</dd>
                </div>
              )}
              {t.taxMinor > 0 && (
                <>
                  <div className="co-row-rule">
                    <dt>Total before tax:</dt>
                    <dd>{fmt(t.beforeTax)}</dd>
                  </div>
                  <div>
                    <dt>Estimated tax ({formatRate(checkout.taxRate)}%):</dt>
                    <dd>{fmt(t.tax)}</dd>
                  </div>
                </>
              )}
            </dl>
            <div className="co-total">
              <span>Order total</span>
              <strong>{fmt(t.total)}</strong>
            </div>
            {t.savingsMinor > 0 && (
              <div className="co-savings">
                <CheckIcon size={16} />
                <span>
                  You save {fmt(t.savings)} ({t.savingsPct}%) compared with list prices
                </span>
              </div>
            )}
          </div>
          <p className="co-trust">
            <LockIcon size={14} />
            Payments are processed securely by Stripe
          </p>
        </aside>
      </main>

      {!preview && (
        <div className="co-mobilebar no-print">
          <div className="co-mobilebar-total">
            <span>Order total</span>
            <strong>{fmt(t.total)}</strong>
          </div>
          {paid ? (
            <span className="pill pill-blue co-mobilebar-paid">
              <CheckIcon size={14} /> Paid
            </span>
          ) : status?.state === 'processing' ? (
            <span className="pill pill-gray">Processing</span>
          ) : (
            <button type="button" className="btn btn-blue" onClick={onPay} disabled={paying || unavailable}>
              <LockIcon size={16} />
              {paying ? 'Opening…' : 'Pay now'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
