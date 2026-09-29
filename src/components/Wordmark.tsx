import { Link } from 'react-router-dom'
import { LogoMark } from './Logo'

interface Props {
  /** Where the wordmark links to. `null` renders plain text (used inside pages). */
  to?: string | null
  tone?: 'dark' | 'light'
  /** Replace the default "Innovatif Designs" text (e.g. with the "prepared by" name). */
  label?: string
}

export function Wordmark({ to = '/', tone = 'dark', label }: Props) {
  const className = `wordmark wordmark-${tone}`
  const content = (
    <>
      <span className="wordmark-mark" aria-hidden="true">
        <LogoMark size={15} />
      </span>
      <span className="wordmark-text">
        {label ? (
          label
        ) : (
          <>
            Innovatif <span>Designs</span>
          </>
        )}
      </span>
    </>
  )
  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  )
}
