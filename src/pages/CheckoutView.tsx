import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { Checkout } from '../types'
import { useAuth } from '../lib/auth'
import { db } from '../lib/db'
import { formatMoney } from '../lib/format'
import {
  PaymentError,
  fetchPaymentStatus,
  recallPaidSession,
  rememberPaidSession,
  startPayment,
  type PaymentStatus,
} from '../lib/payments'
import { CheckoutPage } from '../components/CheckoutPage'
import { Menu } from '../components/Menu'
import { Splash } from '../components/Splash'
import { ArrowLeftIcon, CopyIcon, EditIcon, LinkIcon, MoreIcon, PrintIcon, TrashIcon } from '../components/icons'

function StatusPill({ status }: { status: PaymentStatus | null }) {
  if (!status) return null
  if (status.state === 'paid') {
    return (
      <span className="pill pill-dark">
        Paid{status.amount ? ` · ${formatMoney(status.amount, status.currency || 'USD')}` : ''}
      </span>
    )
  }
  if (status.state === 'processing') return <span className="pill pill-gray">Payment processing</span>
  if (status.demo) return <span className="pill pill-gray">Demo mode · payments off</span>
  if (!status.configured) {
    return (
      <span className="pill pill-gray" title="Add STRIPE_SECRET_KEY in Netlify to take payments">
        Stripe not connected
      </span>
    )
  }
  if (status.code === 'stripe_auth') return <span className="pill pill-danger">Stripe key rejected</span>
  if (status.state === 'unknown') return null
  return <span className="pill pill-gray">Awaiting payment{status.livemode ? '' : ' · Test mode'}</span>
}

export default function CheckoutView() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { user, enabled } = useAuth()
  const present = params.get('present') === '1'
  const owner = Boolean(user) && !present
  const sessionParam = params.get('session_id')
  const canceledParam = params.get('canceled') === '1'

  const [checkout, setCheckout] = useState<Checkout | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [notice, setNotice] = useState<'success' | 'canceled' | null>(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    let alive = true
    setCheckout(null)
    setError('')
    db.checkouts
      .get(id)
      .then((c) => {
        if (!alive) return
        if (!c) setError('This checkout does not exist or has been deleted.')
        else setCheckout(c)
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Could not load this checkout.'))
    return () => {
      alive = false
    }
  }, [id])

  const loadStatus = useCallback(async () => {
    const sessionId = sessionParam || recallPaidSession(id)
    const next = await fetchPaymentStatus(id, sessionId)
    setStatus(next)
    if (sessionParam && (next.state === 'paid' || next.state === 'processing')) {
      rememberPaidSession(id, sessionParam)
      setNotice('success')
    }
  }, [id, sessionParam])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (!canceledParam) return
    setNotice('canceled')
    const next = new URLSearchParams(params)
    next.delete('canceled')
    setParams(next, { replace: true })
  }, [canceledParam, params, setParams])

  // Coming back from Stripe with the browser's back button restores this page as it was.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPaying(false)
    }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  useEffect(() => {
    document.title = checkout ? `${checkout.title} — Checkout` : 'Checkout — Innovatif Designs'
    return () => {
      document.title = 'Innovatif Designs'
    }
  }, [checkout])

  const showToast = (message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2600)
  }

  const pay = async () => {
    if (paying) return
    setPaying(true)
    setPayError('')
    try {
      await startPayment(id)
    } catch (e) {
      const err = e as PaymentError
      setPayError(err.message || 'The payment could not be started.')
      setPaying(false)
      if (err.code === 'already_paid' || err.code === 'processing') void loadStatus()
    }
  }

  const copyLink = async () => {
    const url = `${window.location.origin}/c/${id}${enabled ? '' : '?present=1'}`
    try {
      await navigator.clipboard.writeText(url)
      showToast('Client link copied')
    } catch {
      window.prompt('Copy this link', url)
    }
  }

  const duplicate = async () => {
    try {
      const copy = await db.checkouts.duplicate(id)
      navigate(`/c/${copy.id}/edit`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not duplicate the checkout.')
    }
  }

  const remove = async () => {
    if (!checkout) return
    const warning = status?.state === 'paid' ? ' It has been paid; the payment stays in your Stripe account.' : ''
    if (!window.confirm(`Delete “${checkout.title}”?${warning} This cannot be undone.`)) return
    try {
      await db.checkouts.remove(id)
      navigate('/')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not delete the checkout.')
    }
  }

  if (error) {
    return (
      <main className="message-page">
        <h1>Checkout not found</h1>
        <p>{error}</p>
        <Link to="/" className="btn btn-dark">
          Back to all pages
        </Link>
      </main>
    )
  }

  return (
    <>
      {owner && (
        <div className="toolbar no-print">
          <div className="toolbar-inner">
            <Link to="/" className="btn btn-ghost">
              <ArrowLeftIcon size={16} />
              <span className="btn-label">All pages</span>
            </Link>
            <StatusPill status={status} />
            <div className="toolbar-actions">
              <button type="button" className="btn btn-ghost" onClick={() => window.print()} title="Print or save as PDF">
                <PrintIcon size={16} />
                <span className="btn-label">Print / PDF</span>
              </button>
              <button type="button" className="btn" onClick={copyLink} title="Copy a link for your client">
                <LinkIcon size={16} />
                <span className="btn-label">Copy client link</span>
              </button>
              <Menu label={<MoreIcon size={16} />} ariaLabel="More actions">
                <button type="button" className="menu-item" role="menuitem" onClick={duplicate}>
                  <CopyIcon size={16} />
                  Duplicate checkout
                </button>
                <button type="button" className="menu-item menu-item-danger" role="menuitem" onClick={remove}>
                  <TrashIcon size={16} />
                  Delete checkout
                </button>
              </Menu>
              <Link to={`/c/${id}/edit`} className="btn btn-dark">
                <EditIcon size={16} />
                Edit
              </Link>
            </div>
          </div>
          {status?.error && status.code === 'stripe_auth' && <div className="toolbar-note">{status.error}</div>}
        </div>
      )}

      {checkout ? (
        <CheckoutPage
          checkout={checkout}
          status={status}
          paying={paying}
          payError={payError}
          notice={notice}
          onPay={pay}
        />
      ) : (
        <Splash />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  )
}
