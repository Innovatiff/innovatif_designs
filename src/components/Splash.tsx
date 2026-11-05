import { useEffect, useState } from 'react'

/** Loading state that admits it is slow after a few seconds instead of spinning silently. */
export function Splash({ slowAfter = 6000 }: { slowAfter?: number }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), slowAfter)
    return () => window.clearTimeout(timer)
  }, [slowAfter])
  return (
    <div className="splash" role="status">
      <span className="spinner" aria-label="Loading" />
      {slow && <p className="splash-hint">Still loading… check your internet connection.</p>}
    </div>
  )
}
