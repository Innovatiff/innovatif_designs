import type { Page, PageInput } from '../types'
import type { Backend } from './db'
import { newId, normalizeInput, normalizePage } from './normalize'

const PAGES_KEY = 'innovatif:pages'
const IMAGE_PREFIX = 'innovatif:image:'

function readPages(): Page[] {
  try {
    const raw = localStorage.getItem(PAGES_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown[]) : []
    return Array.isArray(parsed)
      ? parsed.map((p) => {
          const rec = p as Record<string, unknown>
          return normalizePage(rec, {
            id: String(rec.id ?? newId()),
            createdAt: String(rec.createdAt ?? ''),
            updatedAt: String(rec.updatedAt ?? ''),
          })
        })
      : []
  } catch {
    return []
  }
}

function writePages(pages: Page[]) {
  try {
    localStorage.setItem(PAGES_KEY, JSON.stringify(pages))
  } catch {
    throw new Error('This browser has run out of local storage space. Remove some images or pages.')
  }
}

const nowISO = () => new Date().toISOString()

export const localBackend: Backend = {
  name: 'local',

  async listPages() {
    return readPages().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async getPage(id) {
    return readPages().find((p) => p.id === id) ?? null
  },

  async createPage(input: PageInput) {
    const now = nowISO()
    const page: Page = { ...normalizeInput(input), id: newId(), createdAt: now, updatedAt: now }
    writePages([...readPages(), page])
    return page
  },

  async updatePage(id, input, createdAt) {
    const now = nowISO()
    const page: Page = { ...normalizeInput(input), id, createdAt: createdAt || now, updatedAt: now }
    const pages = readPages()
    const index = pages.findIndex((p) => p.id === id)
    if (index === -1) pages.push(page)
    else pages[index] = page
    writePages(pages)
    return page
  },

  async deletePage(id) {
    writePages(readPages().filter((p) => p.id !== id))
  },

  async uploadImage(dataUrl) {
    const id = newId(12)
    try {
      localStorage.setItem(IMAGE_PREFIX + id, dataUrl)
    } catch {
      throw new Error('This browser has run out of local storage space for images.')
    }
    return `img:${id}`
  },

  async getImage(id) {
    return localStorage.getItem(IMAGE_PREFIX + id)
  },
}
