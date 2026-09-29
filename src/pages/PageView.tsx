import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { Page } from '../types'
import { useAuth } from '../lib/auth'
import { db } from '../lib/db'
import { Menu } from '../components/Menu'
import { Proposal } from '../components/Proposal'
import { ArrowLeftIcon, CloseIcon, CopyIcon, EditIcon, ExpandIcon, LinkIcon, MoreIcon, PrintIcon, TrashIcon } from '../components/icons'
import { Splash } from '../components/Splash'

export default function PageView() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { user, enabled } = useAuth()
  const present = params.get('present') === '1'
  const owner = Boolean(user)

  const [page, setPage] = useState<Page | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    let alive = true
    setPage(null)
    setError('')
    db.getPage(id)
      .then((p) => {
        if (!alive) return
        if (!p) setError('This page does not exist or has been deleted.')
        else setPage(p)
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Could not load this page.'))
    return () => {
      alive = false
    }
  }, [id])

  useEffect(() => {
    document.title = page ? `${page.title} — Innovatif Designs` : 'Innovatif Designs'
    return () => {
      document.title = 'Innovatif Designs'
    }
  }, [page])

  useEffect(() => {
    document.body.classList.toggle('presenting', present)
    return () => document.body.classList.remove('presenting')
  }, [present])

  useEffect(() => {
    if (!present || !owner) return
    const leave = () => setParams({}, { replace: true })
    const onFullscreen = () => {
      if (!document.fullscreenElement) leave()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') leave()
    }
    document.addEventListener('fullscreenchange', onFullscreen)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreen)
      document.removeEventListener('keydown', onKey)
    }
  }, [present, owner, setParams])

  const showToast = (message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2400)
  }

  const startPresent = async () => {
    setParams({ present: '1' })
    try {
      await document.documentElement.requestFullscreen?.()
    } catch {
      /* fullscreen is optional */
    }
  }

  const exitPresent = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
      } catch {
        /* ignore */
      }
    }
    setParams({}, { replace: true })
  }

  const copyLink = async () => {
    // With sign-in enabled, clients never see the toolbar; without it, the clean view is the "present" URL.
    const url = `${window.location.origin}/p/${id}${enabled ? '' : '?present=1'}`
    try {
      await navigator.clipboard.writeText(url)
      showToast('Client link copied')
    } catch {
      window.prompt('Copy this link', url)
    }
  }

  const duplicate = async () => {
    try {
      const copy = await db.duplicatePage(id)
      navigate(`/p/${copy.id}/edit`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not duplicate the page.')
    }
  }

  const remove = async () => {
    if (!page) return
    if (!window.confirm(`Delete “${page.title}”? This cannot be undone.`)) return
    try {
      await db.deletePage(id)
      navigate('/')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not delete the page.')
    }
  }

  if (error) {
    return (
      <main className="message-page">
        <h1>Page not found</h1>
        <p>{error}</p>
        <Link to="/" className="btn btn-dark">
          Back to all pages
        </Link>
      </main>
    )
  }

  return (
    <>
      {owner && !present && (
        <div className="toolbar no-print">
          <div className="toolbar-inner">
            <Link to="/" className="btn btn-ghost">
              <ArrowLeftIcon size={16} />
              <span className="btn-label">All pages</span>
            </Link>
            <div className="toolbar-actions">
              <button type="button" className="btn btn-ghost" onClick={startPresent} title="Present full screen">
                <ExpandIcon size={16} />
                <span className="btn-label">Present</span>
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => window.print()} title="Print or save as PDF">
                <PrintIcon size={16} />
                <span className="btn-label">Print / PDF</span>
              </button>
              <button type="button" className="btn" onClick={copyLink} title="Copy a link for your client">
                <LinkIcon size={16} />
                <span className="btn-label">Copy client link</span>
              </button>
              <Menu label={<MoreIcon size={16} />}>
                <button type="button" className="menu-item" role="menuitem" onClick={duplicate}>
                  <CopyIcon size={16} />
                  Duplicate page
                </button>
                <button type="button" className="menu-item menu-item-danger" role="menuitem" onClick={remove}>
                  <TrashIcon size={16} />
                  Delete page
                </button>
              </Menu>
              <Link to={`/p/${id}/edit`} className="btn btn-dark">
                <EditIcon size={16} />
                Edit
              </Link>
            </div>
          </div>
        </div>
      )}

      {page ? (
        <Proposal page={page} />
      ) : (
        <Splash />
      )}

      {present && owner && (
        <button type="button" className="present-exit no-print" onClick={exitPresent}>
          <CloseIcon size={14} />
          Exit · Esc
        </button>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  )
}
