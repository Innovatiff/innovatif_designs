import { useEffect, useState } from 'react'
import { db } from '../lib/db'

const cache = new Map<string, Promise<string | null>>()

/** Remember a freshly uploaded image so it renders without a round-trip. */
export function primeImage(ref: string, dataUrl: string) {
  cache.set(ref, Promise.resolve(dataUrl))
}

export function resolveImage(ref: string | null | undefined): Promise<string | null> {
  if (!ref) return Promise.resolve(null)
  if (!ref.startsWith('img:')) return Promise.resolve(ref)
  let pending = cache.get(ref)
  if (!pending) {
    pending = db.getImage(ref.slice(4)).catch(() => null)
    cache.set(ref, pending)
  }
  return pending
}

export function useImageSrc(ref: string | null | undefined): string | null {
  const [src, setSrc] = useState<string | null>(() => (ref && !ref.startsWith('img:') ? ref : null))
  useEffect(() => {
    let alive = true
    resolveImage(ref).then((value) => {
      if (alive) setSrc(value)
    })
    return () => {
      alive = false
    }
  }, [ref])
  return src
}

interface Props {
  src: string | null | undefined
  className?: string
  alt?: string
}

/** Renders uploaded images (`img:<id>`) and plain URLs alike. */
export function Img({ src, className, alt = '' }: Props) {
  const resolved = useImageSrc(src)
  if (!resolved) return <div className={`img-pending${className ? ` ${className}` : ''}`} aria-hidden="true" />
  return <img src={resolved} className={className} alt={alt} loading="lazy" />
}
