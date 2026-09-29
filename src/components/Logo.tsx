import type { SVGProps } from 'react'

/** The Innovatif "V" mark: symmetric outer edges, a heavier left arm and a lighter right arm. */
export const LOGO_PATH = 'M10 22 L16 22 L51.5 62 L87 22 L90 22 L50 80 Z'

export function LogoMark({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" focusable="false" {...props}>
      <path d={LOGO_PATH} fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
