import type { SVGProps } from 'react'

/** The Innovatif "V" mark: two tapered wedges with sharp tips meeting at a point. Traced from the brand logo. */
export const LOGO_PATH = 'M8 20 L50 81 L92 20 L50 62 Z'

export function LogoMark({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" focusable="false" {...props}>
      <path d={LOGO_PATH} fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
