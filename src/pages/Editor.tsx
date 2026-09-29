import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { IllustrationKey, Page, PageInput, ServiceItem } from '../types'
import { db } from '../lib/db'
import { plusDays, formatMoney, totals } from '../lib/format'
import { isServiceEmpty, makeReference, newId, normalizeInput, toMoney } from '../lib/normalize'
import { ArtPicker } from '../components/ArtPicker'
import { Proposal } from '../components/Proposal'
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon, PlusIcon, TrashIcon } from '../components/icons'
import { Splash } from '../components/Splash'

const DEFAULTS_KEY = 'innovatif:defaults'
const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'MAD', 'AED', 'SAR', 'QAR', 'KWD', 'CAD', 'AUD', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK',
  'TRY', 'INR', 'PKR', 'NGN', 'KES', 'GHS', 'ZAR', 'EGP', 'TND', 'DZD', 'BRL', 'MXN', 'ARS', 'COP', 'JPY', 'CNY', 'KRW',
  'SGD', 'HKD', 'MYR', 'IDR', 'PHP', 'THB', 'VND',
]

interface DraftService extends Omit<ServiceItem, 'price' | 'marketPrice'> {
  price: string
  marketPrice: string
}
interface Draft extends Omit<PageInput, 'services'> {
  services: DraftService[]
}

function loadDefaults(): Partial<PageInput> {
  try {
    return JSON.parse(localStorage.getItem(DEFAULTS_KEY) || '{}') as Partial<PageInput>
  } catch {
    return {}
  }
}

function saveDefaults(input: PageInput) {
  try {
    const { currency, preparedBy, contact, ctaText, notes } = input
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify({ currency, preparedBy, contact, ctaText, notes }))
  } catch {
    /* optional */
  }
}

const moneyString = (n: number) => (n ? String(n) : '')

function newDraftService(illustration: IllustrationKey = 'design'): DraftService {
  return { id: newId(), name: '', description: '', illustration, image: null, price: '', marketPrice: '' }
}

function emptyDraft(): Draft {
  const d = loadDefaults()
  return {
    title: '',
    client: '',
    intro: '',
    cover: 'design',
    coverImage: null,
    currency: d.currency || 'USD',
    validUntil: plusDays(30),
    reference: '',
    services: [newDraftService()],
    notes: d.notes ?? '',
    preparedBy: d.preparedBy ?? 'Innovatif Designs',
    contact: d.contact ?? '',
    ctaText: d.ctaText || 'Ready to get started?',
  }
}

function fromPage(page: Page): Draft {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = page
  return {
    ...rest,
    services: page.services.map((s) => ({ ...s, price: moneyString(s.price), marketPrice: moneyString(s.marketPrice) })),
  }
}

function toInput(draft: Draft): PageInput {
  return normalizeInput({
    ...draft,
    services: draft.services.map((s) => ({ ...s, price: toMoney(s.price), marketPrice: toMoney(s.marketPrice) })),
  })
}

function validate(input: PageInput): { message: string; focusId?: string } | null {
  if (!input.title) return { message: 'Give the page a title.', focusId: 'f-title' }
  if (input.services.length === 0) return { message: 'Add at least one service.', focusId: 'f-add-service' }
  for (let i = 0; i < input.services.length; i++) {
    const s = input.services[i]
    if (!s.name) return { message: `Service ${i + 1} needs a name.`, focusId: `s-${s.id}-name` }
    if (!s.price && !s.marketPrice) return { message: `Add a price for “${s.name}”.`, focusId: `s-${s.id}-price` }
  }
  return null
}

export default function Editor() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [draft, setDraft] = useState<Draft | null>(() => (isEdit ? null : emptyDraft()))
  const [loaded, setLoaded] = useState<Page | null>(null)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const dirty = useRef(false)

  useEffect(() => {
    document.title = `${isEdit ? 'Edit page' : 'New page'} — Innovatif Designs`
  }, [isEdit])

  useEffect(() => {
    if (!id) return
    let alive = true
    db.getPage(id)
      .then((page) => {
        if (!alive) return
        if (!page) setLoadError('This page does not exist or has been deleted.')
        else {
          setLoaded(page)
          setDraft(fromPage(page))
        }
      })
      .catch((e) => alive && setLoadError(e instanceof Error ? e.message : 'Could not load this page.'))
    return () => {
      alive = false
    }
  }, [id])

  // Suggest a reference number for new pages.
  useEffect(() => {
    if (id) return
    let alive = true
    db.listPages()
      .then((pages) => {
        if (!alive) return
        setDraft((d) => (d && !d.reference ? { ...d, reference: makeReference(pages.length + 1) } : d))
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

  const updateService = useCallback((serviceId: string, patch: Partial<DraftService>) => {
    dirty.current = true
    setDraft((d) => (d ? { ...d, services: d.services.map((s) => (s.id === serviceId ? { ...s, ...patch } : s)) } : d))
  }, [])

  const addService = () => {
    if (!draft) return
    const last = draft.services[draft.services.length - 1]
    const service = newDraftService(last ? last.illustration : 'design')
    update({ services: [...draft.services, service] })
    window.setTimeout(() => document.getElementById(`s-${service.id}-name`)?.focus(), 0)
  }

  const removeService = (serviceId: string) => {
    if (!draft) return
    update({ services: draft.services.filter((s) => s.id !== serviceId) })
  }

  const moveService = (serviceId: string, direction: -1 | 1) => {
    if (!draft) return
    const index = draft.services.findIndex((s) => s.id === serviceId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= draft.services.length) return
    const services = [...draft.services]
    ;[services[index], services[target]] = [services[target], services[index]]
    update({ services })
  }

  const previewPage = useMemo(() => {
    if (!draft) return null
    const input = toInput(draft)
    return { ...input, services: input.services.filter((s) => !isServiceEmpty(s)) }
  }, [draft])

  const save = useCallback(async () => {
    if (!draft || saving) return
    const input = toInput(draft)
    input.services = input.services.filter((s) => !isServiceEmpty(s))
    const problem = validate(input)
    if (problem) {
      setError(problem.message)
      setTab('edit')
      if (problem.focusId) window.setTimeout(() => document.getElementById(problem.focusId!)?.focus(), 0)
      return
    }
    setSaving(true)
    setError('')
    try {
      const saved = isEdit && id ? await db.updatePage(id, input, loaded?.createdAt ?? '') : await db.createPage(input)
      saveDefaults(input)
      dirty.current = false
      navigate(`/p/${saved.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The page could not be saved.')
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
        <h1>Page not found</h1>
        <p>{loadError}</p>
        <Link to="/" className="btn btn-dark">
          Back to all pages
        </Link>
      </main>
    )
  }

  if (!draft || !previewPage) {
    return <Splash />
  }

  const t = totals(previewPage.services)
  const backHref = isEdit ? `/p/${id}` : '/'

  return (
    <>
      <header className="topbar topbar-editor">
        <div className="topbar-inner">
          <div className="topbar-left">
            <Link to={backHref} className="btn btn-ghost">
              <ArrowLeftIcon size={16} />
              <span className="btn-label">{isEdit ? 'Back to page' : 'All pages'}</span>
            </Link>
            <span className="topbar-title">{isEdit ? 'Edit page' : 'New page'}</span>
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
              {saving ? 'Saving…' : 'Save page'}
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
              <h2>Page</h2>
              <small>What the client sees first</small>
            </div>
            <div className="field">
              <label htmlFor="f-title">Title</label>
              <input
                id="f-title"
                className="input input-lg"
                value={draft.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="e.g. Brand identity & website launch"
                autoFocus={!isEdit}
              />
            </div>
            <div className="row">
              <div className="field">
                <label htmlFor="f-client">Client</label>
                <input
                  id="f-client"
                  className="input"
                  value={draft.client}
                  onChange={(e) => update({ client: e.target.value })}
                  placeholder="Client or company name"
                />
              </div>
              <div className="field">
                <label htmlFor="f-reference">Reference</label>
                <input
                  id="f-reference"
                  className="input"
                  value={draft.reference}
                  onChange={(e) => update({ reference: e.target.value })}
                  placeholder="ID-2026-001"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="f-intro">Introduction</label>
              <textarea
                id="f-intro"
                className="textarea"
                value={draft.intro}
                onChange={(e) => update({ intro: e.target.value })}
                placeholder="Two or three sentences on what you are proposing and the result the client gets."
              />
            </div>
            <div className="field">
              <span className="label">Cover illustration</span>
              <ArtPicker
                idPrefix="cover"
                value={draft.cover}
                image={draft.coverImage}
                onChange={(cover) => update({ cover })}
                onImage={(coverImage) => update({ coverImage })}
              />
            </div>
            <div className="row">
              <div className="field">
                <label htmlFor="f-currency">Currency</label>
                <input
                  id="f-currency"
                  className="input"
                  list="currency-list"
                  value={draft.currency}
                  onChange={(e) => update({ currency: e.target.value.toUpperCase() })}
                  maxLength={3}
                  placeholder="USD"
                />
                <datalist id="currency-list">
                  {CURRENCIES.map((c) => (
                    <option value={c} key={c} />
                  ))}
                </datalist>
              </div>
              <div className="field">
                <label htmlFor="f-valid">Valid until</label>
                <input
                  id="f-valid"
                  className="input"
                  type="date"
                  value={draft.validUntil}
                  onChange={(e) => update({ validUntil: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="fieldset">
            <div className="fieldset-title">
              <h2>Services &amp; pricing</h2>
              <small>
                {previewPage.services.length > 0
                  ? `${formatMoney(t.price, previewPage.currency)}${t.hasSavings ? ` · saves ${t.pct}%` : ''}`
                  : 'Add what you are offering'}
              </small>
            </div>
            <div className="service-edits">
              {draft.services.map((service, index) => (
                <div className="service-edit" key={service.id}>
                  <div className="service-edit-head">
                    <strong>Service {index + 1}</strong>
                    <span className="spacer" />
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost btn-icon"
                      onClick={() => moveService(service.id, -1)}
                      disabled={index === 0}
                      title="Move up"
                      aria-label="Move up"
                    >
                      <ChevronUpIcon size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost btn-icon"
                      onClick={() => moveService(service.id, 1)}
                      disabled={index === draft.services.length - 1}
                      title="Move down"
                      aria-label="Move down"
                    >
                      <ChevronDownIcon size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost btn-icon btn-danger"
                      onClick={() => removeService(service.id)}
                      title="Remove service"
                      aria-label="Remove service"
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                  <div className="field">
                    <label htmlFor={`s-${service.id}-name`}>Name</label>
                    <input
                      id={`s-${service.id}-name`}
                      className="input"
                      value={service.name}
                      onChange={(e) => updateService(service.id, { name: e.target.value })}
                      placeholder="e.g. Website design & development"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`s-${service.id}-desc`}>Description</label>
                    <textarea
                      id={`s-${service.id}-desc`}
                      className="textarea"
                      value={service.description}
                      onChange={(e) => updateService(service.id, { description: e.target.value })}
                      placeholder={'What is included and why it matters.\n- Start a line with "- " to add a checklist item'}
                    />
                    <span className="hint">Lines starting with “- ” become checklist items.</span>
                  </div>
                  <div className="field">
                    <span className="label">Illustration</span>
                    <ArtPicker
                      idPrefix={`s-${service.id}`}
                      value={service.illustration}
                      image={service.image}
                      onChange={(illustration) => updateService(service.id, { illustration })}
                      onImage={(image) => updateService(service.id, { image })}
                    />
                  </div>
                  <div className="row">
                    <div className="field">
                      <label htmlFor={`s-${service.id}-price`}>Your price</label>
                      <div className="money">
                        <span className="money-prefix">{draft.currency || 'USD'}</span>
                        <input
                          id={`s-${service.id}-price`}
                          className="input"
                          inputMode="decimal"
                          value={service.price}
                          onChange={(e) => updateService(service.id, { price: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor={`s-${service.id}-market`}>Market price</label>
                      <div className="money">
                        <span className="money-prefix">{draft.currency || 'USD'}</span>
                        <input
                          id={`s-${service.id}-market`}
                          className="input"
                          inputMode="decimal"
                          value={service.marketPrice}
                          onChange={(e) => updateService(service.id, { marketPrice: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <span className="hint">What agencies or freelancers usually charge.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" id="f-add-service" className="btn btn-dashed" onClick={addService}>
              <PlusIcon size={16} />
              Add a service
            </button>
          </section>

          <section className="fieldset">
            <div className="fieldset-title">
              <h2>Closing</h2>
              <small>How the client says yes</small>
            </div>
            <div className="field">
              <label htmlFor="f-cta">Call to action</label>
              <input
                id="f-cta"
                className="input"
                value={draft.ctaText}
                onChange={(e) => update({ ctaText: e.target.value })}
                placeholder="Ready to get started?"
              />
            </div>
            <div className="row">
              <div className="field">
                <label htmlFor="f-prepared">Prepared by</label>
                <input
                  id="f-prepared"
                  className="input"
                  value={draft.preparedBy}
                  onChange={(e) => update({ preparedBy: e.target.value })}
                  placeholder="Your name or studio"
                />
              </div>
              <div className="field">
                <label htmlFor="f-contact">Contact</label>
                <input
                  id="f-contact"
                  className="input"
                  value={draft.contact}
                  onChange={(e) => update({ contact: e.target.value })}
                  placeholder="email · phone · website"
                />
                <span className="hint">An email address becomes the “Accept proposal” button.</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor="f-notes">Notes &amp; terms</label>
              <textarea
                id="f-notes"
                className="textarea"
                value={draft.notes}
                onChange={(e) => update({ notes: e.target.value })}
                placeholder="Timeline, payment schedule, revisions, what is not included…"
              />
            </div>
          </section>

          <div className="form-actions">
            {error && <span className="field-error">{error}</span>}
            <button type="submit" className="btn btn-blue btn-lg" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create page'}
            </button>
          </div>
        </form>

        <aside className="preview-pane" aria-label="Live preview">
          <div className="preview-label">
            <span>Live preview</span>
            <span>{previewPage.services.length > 0 ? formatMoney(t.price, previewPage.currency) : ''}</span>
          </div>
          <div className="preview-frame">
            <Proposal page={previewPage} preview />
          </div>
        </aside>
      </div>
    </>
  )
}
