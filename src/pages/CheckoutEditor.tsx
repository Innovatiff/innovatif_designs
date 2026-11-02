import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Checkout, CheckoutInput, CheckoutItem, IllustrationKey } from '../types'
import { checkoutTotals } from '../lib/checkout'
import { SHIPPING_COUNTRIES, countryName, parseCountryList } from '../lib/countries'
import { CURRENCIES } from '../lib/currencies'
import { db } from '../lib/db'
import { loadDefaults, saveDefaults } from '../lib/defaults'
import { formatMoney } from '../lib/format'
import {
  isEmail,
  isItemEmpty,
  makeReference,
  newId,
  normalizeCheckoutInput,
  toMoney,
  toQuantity,
  toRate,
} from '../lib/normalize'
import { ArtPicker } from '../components/ArtPicker'
import { CheckoutPage } from '../components/CheckoutPage'
import { Splash } from '../components/Splash'
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon, MinusIcon, PlusIcon, TrashIcon } from '../components/icons'

interface DraftItem extends Omit<CheckoutItem, 'quantity' | 'price' | 'listPrice'> {
  quantity: string
  price: string
  listPrice: string
}

interface Draft extends Omit<CheckoutInput, 'items' | 'shipping' | 'taxRate' | 'shipCountries'> {
  items: DraftItem[]
  shipping: string
  taxRate: string
  shipCountries: string
}

const numberString = (n: number) => (n ? String(n) : '')

function newDraftItem(illustration: IllustrationKey = 'product'): DraftItem {
  return { id: newId(), name: '', description: '', illustration, image: null, quantity: '1', price: '', listPrice: '' }
}

function emptyDraft(): Draft {
  const d = loadDefaults()
  return {
    title: '',
    client: '',
    clientEmail: '',
    reference: '',
    currency: d.currency || 'USD',
    items: [newDraftItem()],
    shipping: '',
    taxRate: '',
    collectShipping: false,
    shipCountries: '',
    notes: d.checkoutNotes ?? '',
    preparedBy: d.preparedBy ?? 'Innovatif Designs',
    contact: d.contact ?? '',
  }
}

function fromCheckout(c: Checkout): Draft {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = c
  return {
    ...rest,
    items: c.items.map((i) => ({
      ...i,
      quantity: String(i.quantity),
      price: numberString(i.price),
      listPrice: numberString(i.listPrice),
    })),
    shipping: numberString(c.shipping),
    taxRate: numberString(c.taxRate),
    shipCountries: c.shipCountries.join(', '),
  }
}

function toInput(draft: Draft): CheckoutInput {
  return normalizeCheckoutInput({
    ...draft,
    items: draft.items.map((i) => ({
      ...i,
      quantity: toQuantity(i.quantity),
      price: toMoney(i.price),
      listPrice: toMoney(i.listPrice),
    })),
    shipping: toMoney(draft.shipping),
    taxRate: toRate(draft.taxRate),
    shipCountries: draft.shipCountries,
  })
}

function validate(draft: Draft, input: CheckoutInput): { message: string; focusId?: string } | null {
  if (!input.title) return { message: 'Give the checkout a title.', focusId: 'k-title' }
  if (draft.clientEmail.trim() && !isEmail(draft.clientEmail.trim())) {
    return { message: 'The client email does not look right.', focusId: 'k-email' }
  }
  if (input.items.length === 0) return { message: 'Add at least one product.', focusId: 'k-add-item' }
  for (let i = 0; i < input.items.length; i++) {
    const item = input.items[i]
    if (!item.name) return { message: `Product ${i + 1} needs a name.`, focusId: `i-${item.id}-name` }
    if (!item.price && !item.listPrice) return { message: `Add a price for “${item.name}”.`, focusId: `i-${item.id}-price` }
  }
  if (checkoutTotals(input).totalMinor <= 0) return { message: 'The order total must be more than zero.' }
  if (draft.collectShipping) {
    const codes = parseCountryList(draft.shipCountries)
    const unknown = codes.filter((c) => !SHIPPING_COUNTRIES.has(c))
    if (codes.length === 0) return { message: 'List the countries you ship to, such as US, CA.', focusId: 'k-countries' }
    if (unknown.length) return { message: `Unknown country code: ${unknown.join(', ')}.`, focusId: 'k-countries' }
  }
  return null
}

export default function CheckoutEditor() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [draft, setDraft] = useState<Draft | null>(() => (isEdit ? null : emptyDraft()))
  const [loaded, setLoaded] = useState<Checkout | null>(null)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const dirty = useRef(false)

  useEffect(() => {
    document.title = `${isEdit ? 'Edit checkout' : 'New checkout'} — Innovatif Designs`
  }, [isEdit])

  useEffect(() => {
    if (!id) return
    let alive = true
    db.checkouts
      .get(id)
      .then((c) => {
        if (!alive) return
        if (!c) setLoadError('This checkout does not exist or has been deleted.')
        else {
          setLoaded(c)
          setDraft(fromCheckout(c))
        }
      })
      .catch((e) => alive && setLoadError(e instanceof Error ? e.message : 'Could not load this checkout.'))
    return () => {
      alive = false
    }
  }, [id])

  // Suggest a reference number for new checkouts.
  useEffect(() => {
    if (id) return
    let alive = true
    Promise.all([db.pages.list(), db.checkouts.list()])
      .then(([pages, checkouts]) => {
        if (!alive) return
        const next = makeReference(pages.length + checkouts.length + 1)
        setDraft((d) => (d && !d.reference ? { ...d, reference: next } : d))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [id])

  useEffect(() => {
    const onUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])

  const update = useCallback((patch: Partial<Draft>) => {
    dirty.current = true
    setDraft((d) => (d ? { ...d, ...patch } : d))
  }, [])

  const updateItem = useCallback((itemId: string, patch: Partial<DraftItem>) => {
    dirty.current = true
    setDraft((d) => (d ? { ...d, items: d.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) } : d))
  }, [])

  const addItem = () => {
    if (!draft) return
    const last = draft.items[draft.items.length - 1]
    const item = newDraftItem(last ? last.illustration : 'product')
    update({ items: [...draft.items, item] })
    window.setTimeout(() => document.getElementById(`i-${item.id}-name`)?.focus(), 0)
  }

  const removeItem = (itemId: string) => {
    if (!draft) return
    update({ items: draft.items.filter((i) => i.id !== itemId) })
  }

  const moveItem = (itemId: string, direction: -1 | 1) => {
    if (!draft) return
    const index = draft.items.findIndex((i) => i.id === itemId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= draft.items.length) return
    const items = [...draft.items]
    ;[items[index], items[target]] = [items[target], items[index]]
    update({ items })
  }

  const stepQuantity = (item: DraftItem, delta: number) => {
    updateItem(item.id, { quantity: String(Math.min(999, Math.max(1, toQuantity(item.quantity) + delta))) })
  }

  const preview = useMemo(() => {
    if (!draft) return null
    const input = toInput(draft)
    return { ...input, items: input.items.filter((i) => !isItemEmpty(i)) }
  }, [draft])

  const save = useCallback(async () => {
    if (!draft || saving) return
    const input = toInput(draft)
    input.items = input.items.filter((i) => !isItemEmpty(i))
    const problem = validate(draft, input)
    if (problem) {
      setError(problem.message)
      setTab('edit')
      if (problem.focusId) window.setTimeout(() => document.getElementById(problem.focusId!)?.focus(), 0)
      return
    }
    setSaving(true)
    setError('')
    try {
      const saved =
        isEdit && id ? await db.checkouts.update(id, input, loaded?.createdAt ?? '') : await db.checkouts.create(input)
      saveDefaults({
        currency: input.currency,
        preparedBy: input.preparedBy,
        contact: input.contact,
        checkoutNotes: input.notes,
      })
      dirty.current = false
      navigate(`/c/${saved.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The checkout could not be saved.')
    } finally {
      setSaving(false)
    }
  }, [draft, saving, isEdit, id, loaded, navigate])

  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void saveRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    void save()
  }

  if (loadError) {
    return (
      <main className="message-page">
        <h1>Checkout not found</h1>
        <p>{loadError}</p>
        <Link to="/" className="btn btn-dark">
          Back to all pages
        </Link>
      </main>
    )
  }

  if (!draft || !preview) return <Splash />

  const t = checkoutTotals(preview)
  const currency = draft.currency || 'USD'
  const shipCodes = parseCountryList(draft.shipCountries)
  const shipKnown = shipCodes.filter((c) => SHIPPING_COUNTRIES.has(c))
  const backHref = isEdit ? `/c/${id}` : '/'

  return (
    <>
      <header className="topbar topbar-editor">
        <div className="topbar-inner">
          <div className="topbar-left">
            <Link to={backHref} className="btn btn-ghost">
              <ArrowLeftIcon size={16} />
              <span className="btn-label">{isEdit ? 'Back to checkout' : 'All pages'}</span>
            </Link>
            <span className="topbar-title">{isEdit ? 'Edit checkout' : 'New checkout'}</span>
          </div>
          <div className="topbar-actions">
            <div className="seg mobile-only" role="tablist" aria-label="Editor view">
              <button type="button" role="tab" aria-selected={tab === 'edit'} onClick={() => setTab('edit')}>
                Edit
              </button>
              <button type="button" role="tab" aria-selected={tab === 'preview'} onClick={() => setTab('preview')}>
                Preview
              </button>
            </div>
            <button type="button" className="btn btn-blue" onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save checkout'}
            </button>
          </div>
        </div>
        {error && (
          <div className="topbar-error" role="alert">
            {error}
          </div>
        )}
      </header>

      <div className={`editor${tab === 'preview' ? ' show-preview' : ''}`}>
        <form className="form" onSubmit={onSubmit} noValidate>
          <section className="fieldset">
            <div className="fieldset-title">
              <h2>Checkout</h2>
              <small>Who it's for</small>
            </div>
            <div className="field">
              <label htmlFor="k-title">Title</label>
              <input
                id="k-title"
                className="input input-lg"
                value={draft.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="e.g. Brand launch kit"
                autoFocus={!isEdit}
              />
            </div>
            <div className="row">
              <div className="field">
                <label htmlFor="k-client">Client</label>
                <input
                  id="k-client"
                  className="input"
                  value={draft.client}
                  onChange={(e) => update({ client: e.target.value })}
                  placeholder="Client or company name"
                />
              </div>
              <div className="field">
                <label htmlFor="k-email">Client email</label>
                <input
                  id="k-email"
                  className="input"
                  type="email"
                  value={draft.clientEmail}
                  onChange={(e) => update({ clientEmail: e.target.value })}
                  placeholder="Optional"
                />
                <span className="hint">Pre-filled on the payment page.</span>
              </div>
            </div>
            <div className="row">
              <div className="field">
                <label htmlFor="k-reference">Reference</label>
                <input
                  id="k-reference"
                  className="input"
                  value={draft.reference}
                  onChange={(e) => update({ reference: e.target.value })}
                  placeholder="ID-2026-001"
                />
              </div>
              <div className="field">
                <label htmlFor="k-currency">Currency</label>
                <input
                  id="k-currency"
                  className="input"
                  list="k-currency-list"
                  value={draft.currency}
                  onChange={(e) => update({ currency: e.target.value.toUpperCase() })}
                  maxLength={3}
                  placeholder="USD"
                />
                <datalist id="k-currency-list">
                  {CURRENCIES.map((c) => (
                    <option value={c} key={c} />
                  ))}
                </datalist>
              </div>
            </div>
          </section>

          <section className="fieldset">
            <div className="fieldset-title">
              <h2>Products</h2>
              <small>
                {preview.items.length > 0
                  ? `${formatMoney(t.subtotal, currency)}${t.savingsMinor > 0 ? ` · saves ${t.savingsPct}%` : ''}`
                  : 'Add what you are selling'}
              </small>
            </div>
            <div className="service-edits">
              {draft.items.map((item, index) => (
                <div className="service-edit" key={item.id}>
                  <div className="service-edit-head">
                    <strong>Product {index + 1}</strong>
                    <span className="spacer" />
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost btn-icon"
                      onClick={() => moveItem(item.id, -1)}
                      disabled={index === 0}
                      title="Move up"
                      aria-label="Move up"
                    >
                      <ChevronUpIcon size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost btn-icon"
                      onClick={() => moveItem(item.id, 1)}
                      disabled={index === draft.items.length - 1}
                      title="Move down"
                      aria-label="Move down"
                    >
                      <ChevronDownIcon size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost btn-icon btn-danger"
                      onClick={() => removeItem(item.id)}
                      title="Remove product"
                      aria-label="Remove product"
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                  <div className="field">
                    <label htmlFor={`i-${item.id}-name`}>Name</label>
                    <input
                      id={`i-${item.id}-name`}
                      className="input"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                      placeholder="e.g. Premium business cards (box of 250)"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`i-${item.id}-desc`}>Description</label>
                    <textarea
                      id={`i-${item.id}-desc`}
                      className="textarea"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      placeholder={'What the client gets.\n- Start a line with "- " to add a checklist item'}
                    />
                  </div>
                  <div className="field">
                    <span className="label">Image</span>
                    <ArtPicker
                      idPrefix={`i-${item.id}`}
                      value={item.illustration}
                      image={item.image}
                      onChange={(illustration) => updateItem(item.id, { illustration })}
                      onImage={(image) => updateItem(item.id, { image })}
                    />
                  </div>
                  <div className="row row-3">
                    <div className="field">
                      <label htmlFor={`i-${item.id}-qty`}>Quantity</label>
                      <div className="qty">
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => stepQuantity(item, -1)}
                          aria-label="Decrease quantity"
                          disabled={toQuantity(item.quantity) <= 1}
                        >
                          <MinusIcon size={15} />
                        </button>
                        <input
                          id={`i-${item.id}-qty`}
                          className="input qty-input"
                          inputMode="numeric"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, { quantity: e.target.value.replace(/[^\d]/g, '').slice(0, 3) })}
                          onBlur={() => updateItem(item.id, { quantity: String(toQuantity(item.quantity)) })}
                        />
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => stepQuantity(item, 1)}
                          aria-label="Increase quantity"
                        >
                          <PlusIcon size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor={`i-${item.id}-price`}>Price (each)</label>
                      <div className="money">
                        <span className="money-prefix">{currency}</span>
                        <input
                          id={`i-${item.id}-price`}
                          className="input"
                          inputMode="decimal"
                          value={item.price}
                          onChange={(e) => updateItem(item.id, { price: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor={`i-${item.id}-list`}>List price</label>
                      <div className="money">
                        <span className="money-prefix">{currency}</span>
                        <input
                          id={`i-${item.id}-list`}
                          className="input"
                          inputMode="decimal"
                          value={item.listPrice}
                          onChange={(e) => updateItem(item.id, { listPrice: e.target.value })}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </div>
                  <span className="hint">
                    The list price is shown crossed out with the saving, like a sale price. Set the price to 0 to
                    include a free bonus.
                  </span>
                </div>
              ))}
            </div>
            <button type="button" id="k-add-item" className="btn btn-dashed" onClick={addItem}>
              <PlusIcon size={16} />
              Add a product
            </button>
          </section>

          <section className="fieldset">
            <div className="fieldset-title">
              <h2>Shipping &amp; tax</h2>
              <small>Order total {formatMoney(t.total, currency)}</small>
            </div>
            <div className="row">
              <div className="field">
                <label htmlFor="k-shipping">Shipping &amp; handling</label>
                <div className="money">
                  <span className="money-prefix">{currency}</span>
                  <input
                    id="k-shipping"
                    className="input"
                    inputMode="decimal"
                    value={draft.shipping}
                    onChange={(e) => update({ shipping: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <span className="hint">One fee for the whole order.</span>
              </div>
              <div className="field">
                <label htmlFor="k-tax">Tax rate</label>
                <div className="money money-suffix">
                  <input
                    id="k-tax"
                    className="input"
                    inputMode="decimal"
                    value={draft.taxRate}
                    onChange={(e) => update({ taxRate: e.target.value })}
                    placeholder="0"
                  />
                  <span className="money-prefix">%</span>
                </div>
                <span className="hint">Applied to the products.</span>
              </div>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={draft.collectShipping}
                onChange={(e) => update({ collectShipping: e.target.checked })}
              />
              <span>
                <strong>Ask for a delivery address</strong>
                <small>For physical products. The client enters it on the payment page.</small>
              </span>
            </label>
            {draft.collectShipping && (
              <div className="field">
                <label htmlFor="k-countries">Ships to (country codes)</label>
                <input
                  id="k-countries"
                  className="input"
                  value={draft.shipCountries}
                  onChange={(e) => update({ shipCountries: e.target.value.toUpperCase() })}
                  placeholder="US, CA, GB"
                />
                <span className="hint">
                  {shipKnown.length > 0
                    ? shipKnown.slice(0, 8).map(countryName).join(', ') + (shipKnown.length > 8 ? '…' : '')
                    : 'Two-letter codes separated by commas.'}
                </span>
              </div>
            )}
          </section>

          <section className="fieldset">
            <div className="fieldset-title">
              <h2>Seller</h2>
              <small>Shown under the order</small>
            </div>
            <div className="row">
              <div className="field">
                <label htmlFor="k-seller">Sold by</label>
                <input
                  id="k-seller"
                  className="input"
                  value={draft.preparedBy}
                  onChange={(e) => update({ preparedBy: e.target.value })}
                  placeholder="Your name or studio"
                />
              </div>
              <div className="field">
                <label htmlFor="k-contact">Contact</label>
                <input
                  id="k-contact"
                  className="input"
                  value={draft.contact}
                  onChange={(e) => update({ contact: e.target.value })}
                  placeholder="email · phone · website"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="k-notes">Notes &amp; terms</label>
              <textarea
                id="k-notes"
                className="textarea"
                value={draft.notes}
                onChange={(e) => update({ notes: e.target.value })}
                placeholder="Delivery times, refund policy, what happens after payment…"
              />
            </div>
          </section>

          <div className="form-actions">
            {error && <span className="field-error">{error}</span>}
            <button type="submit" className="btn btn-blue btn-lg" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create checkout'}
            </button>
          </div>
        </form>

        <aside className="preview-pane" aria-label="Live preview">
          <div className="preview-label">
            <span>Live preview</span>
            <span>{preview.items.length > 0 ? formatMoney(t.total, currency) : ''}</span>
          </div>
          <div className="preview-frame">
            <CheckoutPage checkout={preview} preview />
          </div>
        </aside>
      </div>
    </>
  )
}
