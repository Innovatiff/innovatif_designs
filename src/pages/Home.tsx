import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Page } from '../types'
import { useAuth } from '../lib/auth'
import { db } from '../lib/db'
import { pluralize } from '../lib/format'
import { seedPage } from '../lib/normalize'
import { PageCard } from '../components/PageCard'
import { Wordmark } from '../components/Wordmark'
import { CloseIcon, LogoutIcon, PlusIcon, SearchIcon } from '../components/icons'

function matches(page: Page, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = [page.title, page.client, page.reference, ...page.services.map((s) => s.name)]
    .join(' ')
    .toLowerCase()
  return words.every((w) => haystack.includes(w))
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable))
}

export default function Home() {
  const { enabled, signOut } = useAuth()
  const navigate = useNavigate()
  const [pages, setPages] = useState<Page[] | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [seeding, setSeeding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = 'Innovatif Designs'
    let alive = true
    db.listPages()
      .then((list) => alive && setPages(list))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Could not load your pages.'))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '/' && !isTypingTarget(event.target) && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const filtered = useMemo(() => (pages ?? []).filter((p) => matches(p, query)), [pages, query])

  const addExample = async () => {
    setSeeding(true)
    try {
      const page = await db.createPage(seedPage())
      navigate(`/p/${page.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the example page.')
      setSeeding(false)
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Wordmark />
          <div className="topbar-actions">
            {enabled && (
              <button type="button" className="btn btn-ghost" onClick={() => signOut()} title="Sign out">
                <LogoutIcon size={16} />
                <span className="btn-label">Sign out</span>
              </button>
            )}
            <Link to="/new" className="btn btn-dark">
              <PlusIcon size={16} />
              New page
            </Link>
          </div>
        </div>
      </header>

      <main className="home">
        <div className="search-wrap">
          <label className="search">
            <SearchIcon size={20} />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, clients or services"
              aria-label="Search pages"
              autoComplete="off"
            />
            {query ? (
              <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                <CloseIcon size={16} />
              </button>
            ) : (
              <kbd>/</kbd>
            )}
          </label>
          {pages && pages.length > 0 && (
            <p className="search-count">
              {query ? `${filtered.length} of ${pluralize(pages.length, 'page')}` : `${pluralize(pages.length, 'page')} · newest first`}
            </p>
          )}
        </div>

        {error && (
          <div className="notice notice-error" role="alert">
            {error}
          </div>
        )}

        {pages === null && !error && (
          <div className="grid" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div className="card card-skeleton" key={i} />
            ))}
          </div>
        )}

        {pages && pages.length === 0 && (
          <div className="empty">
            <h2>No pages yet</h2>
            <p>Create a page for a client, or start from an example to see how a finished page looks.</p>
            <div className="empty-actions">
              <Link to="/new" className="btn btn-dark btn-lg">
                <PlusIcon size={16} />
                Create a page
              </Link>
              <button type="button" className="btn btn-lg" onClick={addExample} disabled={seeding}>
                {seeding ? 'Adding…' : 'Add an example page'}
              </button>
            </div>
          </div>
        )}

        {pages && pages.length > 0 && filtered.length === 0 && (
          <div className="empty">
            <p>No pages match “{query}”.</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="grid">
            {filtered.map((p) => (
              <PageCard key={p.id} page={p} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
