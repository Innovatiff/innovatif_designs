import type { CSSProperties, ReactNode } from 'react'
import type { IllustrationKey } from '../types'

export const ILLUSTRATIONS: { key: IllustrationKey; label: string }[] = [
  { key: 'product', label: 'Product' },
  { key: 'design', label: 'Design' },
  { key: 'software', label: 'Software' },
  { key: 'social', label: 'Social media' },
  { key: 'branding', label: 'Branding' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'web', label: 'Website' },
  { key: 'mobile', label: 'Mobile app' },
  { key: 'video', label: 'Photo & video' },
  { key: 'content', label: 'Content' },
  { key: 'strategy', label: 'Strategy' },
  { key: 'print', label: 'Print' },
  { key: 'ecommerce', label: 'E-commerce' },
  { key: 'seo', label: 'SEO' },
  { key: 'other', label: 'Other' },
]

export function illustrationLabel(key: IllustrationKey): string {
  return ILLUSTRATIONS.find((i) => i.key === key)?.label ?? 'Other'
}

// Accent (royal blue) and knockout background are CSS variables so the same
// drawing works on black and on white art boards.
const A = 'var(--accent, #2F52E0)'
const BG = 'var(--art-bg, #FFFFFF)'
const dot = { fill: 'currentColor', stroke: 'none' } as const

type Draw = (sw: number) => ReactNode

const drawings: Record<IllustrationKey, Draw> = {
  product: () => (
    <>
      <path d="M80 26 L130 51 L130 109 L80 134 L30 109 L30 51 Z" />
      <path d="M30 51 L80 76 L130 51" />
      <path d="M80 76 V134" />
      <path d="M55 38.5 L105 63.5" />
      <path d="M44 90 L60 98 V114 L44 106 Z" fill={A} stroke="none" />
    </>
  ),

  design: () => (
    <>
      <path d="M34 114 C 52 40, 108 118, 126 46" />
      <path d="M34 114 L52 40" strokeDasharray="3 5" opacity="0.6" />
      <path d="M126 46 L108 118" strokeDasharray="3 5" opacity="0.6" />
      <circle cx="52" cy="40" r="4.5" fill={BG} />
      <circle cx="108" cy="118" r="4.5" fill={BG} />
      <rect x="28.5" y="108.5" width="11" height="11" fill={BG} />
      <rect x="120.5" y="40.5" width="11" height="11" fill={A} stroke="none" />
    </>
  ),

  software: (sw) => (
    <>
      <rect x="22" y="34" width="116" height="92" rx="9" />
      <path d="M22 56 H138" />
      <circle cx="35" cy="45" r="2.6" {...dot} />
      <circle cx="45" cy="45" r="2.6" {...dot} />
      <circle cx="55" cy="45" r="2.6" {...dot} />
      <path d="M62 76 L48 91 L62 106" />
      <path d="M98 76 L112 91 L98 106" />
      <path d="M86 72 L74 110" stroke={A} strokeWidth={sw * 2} />
    </>
  ),

  social: () => (
    <>
      <rect x="50" y="22" width="60" height="116" rx="13" fill={BG} />
      <path d="M72 32 H88" />
      <path d="M108 54 H134 A8 8 0 0 1 142 62 V80 A8 8 0 0 1 134 88 H118 L110 96 V88 H108 A8 8 0 0 1 100 80 V62 A8 8 0 0 1 108 54 Z" fill={BG} />
      <path
        transform="translate(111.5 62) scale(0.8)"
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={A}
        stroke="none"
      />
      <path d="M25 86 H51 A7 7 0 0 1 58 93 V107 A7 7 0 0 1 51 114 H50 V122 L42 114 H25 A7 7 0 0 1 18 107 V93 A7 7 0 0 1 25 86 Z" fill={BG} />
      <path d="M28 96 H48" />
      <path d="M28 104 H40" />
    </>
  ),

  branding: () => (
    <>
      <path d="M66 104 L58 138 L80 128 L102 138 L94 104" fill={BG} />
      <circle cx="80" cy="70" r="42" fill={BG} />
      <circle cx="80" cy="70" r="33" strokeDasharray="2 6" />
      <path
        d="M80 56 L83.5 65.1 L93.3 65.7 L85.7 71.9 L88.2 81.3 L80 76 L71.8 81.3 L74.3 71.9 L66.7 65.7 L76.5 65.1 Z"
        fill={A}
        stroke="none"
      />
    </>
  ),

  marketing: (sw) => (
    <>
      <path d="M26 72 V88 A6 6 0 0 0 32 94 H44 L88 114 V46 L44 66 H32 A6 6 0 0 0 26 72 Z" />
      <path d="M46 94 L52 124 H64 L60 96" />
      <path d="M100 66 A22 22 0 0 1 100 94" />
      <path d="M110 54 A38 38 0 0 1 110 106" stroke={A} strokeWidth={sw * 1.6} />
    </>
  ),

  web: () => (
    <>
      <rect x="20" y="30" width="120" height="100" rx="9" />
      <path d="M20 52 H140" />
      <circle cx="33" cy="41" r="2.6" {...dot} />
      <circle cx="43" cy="41" r="2.6" {...dot} />
      <circle cx="53" cy="41" r="2.6" {...dot} />
      <rect x="32" y="64" width="40" height="54" rx="4" fill={A} stroke="none" />
      <path d="M84 68 H128" />
      <path d="M84 82 H120" />
      <path d="M84 96 H124" />
      <rect x="84" y="106" width="26" height="12" rx="4" />
    </>
  ),

  mobile: () => (
    <>
      <rect x="50" y="18" width="60" height="124" rx="13" />
      <path d="M72 28 H88" />
      <rect x="61" y="44" width="11" height="11" rx="3" />
      <rect x="75" y="44" width="11" height="11" rx="3" />
      <rect x="89" y="44" width="11" height="11" rx="3" fill={A} stroke="none" />
      <rect x="61" y="58" width="11" height="11" rx="3" />
      <rect x="75" y="58" width="11" height="11" rx="3" />
      <rect x="89" y="58" width="11" height="11" rx="3" />
      <rect x="61" y="72" width="11" height="11" rx="3" />
      <rect x="75" y="72" width="11" height="11" rx="3" />
      <rect x="89" y="72" width="11" height="11" rx="3" />
      <rect x="61" y="106" width="39" height="12" rx="6" />
    </>
  ),

  video: () => (
    <>
      <rect x="22" y="52" width="116" height="78" rx="11" />
      <path d="M54 52 L62 38 H98 L106 52" />
      <circle cx="80" cy="91" r="23" />
      <circle cx="80" cy="91" r="12" fill={A} stroke="none" />
      <circle cx="120" cy="66" r="3" {...dot} />
    </>
  ),

  content: (sw) => (
    <>
      <path d="M38 22 H94 L122 50 V138 H38 Z" />
      <path d="M94 22 V50 H122" />
      <path d="M54 74 H106" />
      <path d="M54 90 H106" stroke={A} strokeWidth={sw * 3} />
      <path d="M54 106 H90" />
      <path d="M54 122 H98" />
    </>
  ),

  strategy: () => (
    <>
      <circle cx="80" cy="86" r="44" />
      <circle cx="80" cy="86" r="27" />
      <circle cx="80" cy="86" r="11" fill={A} stroke="none" />
      <path d="M80 86 L126 40" />
      <path d="M126 40 V26" />
      <path d="M126 40 H140" />
    </>
  ),

  print: () => (
    <>
      <rect x="42" y="30" width="76" height="100" rx="2" />
      <path d="M34 30 H24" />
      <path d="M42 22 V12" />
      <path d="M126 30 H136" />
      <path d="M118 22 V12" />
      <path d="M34 130 H24" />
      <path d="M42 138 V148" />
      <path d="M126 130 H136" />
      <path d="M118 138 V148" />
      <rect x="54" y="44" width="52" height="36" rx="3" fill={A} stroke="none" />
      <path d="M54 94 H106" />
      <path d="M54 106 H96" />
      <path d="M54 118 H84" />
    </>
  ),

  ecommerce: (sw) => (
    <>
      <path d="M40 58 H120 L113 126 A10 10 0 0 1 103 135 H57 A10 10 0 0 1 47 126 Z" />
      <path d="M62 58 V48 A18 18 0 0 1 98 48 V58" />
      <path d="M64 98 L75 109 L98 86" stroke={A} strokeWidth={sw * 2} />
    </>
  ),

  seo: (sw) => (
    <>
      <circle cx="70" cy="70" r="38" />
      <path d="M97 97 L130 130" strokeWidth={sw * 2} />
      <rect x="52" y="76" width="9" height="14" rx="2" />
      <rect x="66" y="64" width="9" height="26" rx="2" />
      <rect x="80" y="52" width="9" height="38" rx="2" fill={A} stroke="none" />
    </>
  ),

  other: () => (
    <>
      <path d="M74 40 C 76 64, 88 76, 112 78 C 88 80, 76 92, 74 116 C 72 92, 60 80, 36 78 C 60 76, 72 64, 74 40 Z" />
      <path d="M118 34 C 119 44, 124 49, 134 50 C 124 51, 119 56, 118 66 C 117 56, 112 51, 102 50 C 112 49, 117 44, 118 34 Z" fill={A} stroke="none" />
      <path d="M44 112 C 44.5 118, 47.5 121, 54 122 C 47.5 123, 44.5 126, 44 132 C 43.5 126, 40.5 123, 34 122 C 40.5 121, 43.5 118, 44 112 Z" />
    </>
  ),
}

export function Illustration({ k, size = 120, className, style }: { k: IllustrationKey; size?: number; className?: string; style?: CSSProperties }) {
  // Keep strokes visually consistent: ~1.5px on small thumbnails, a little heavier when large.
  const px = Math.min(2.2, Math.max(1.5, size / 130))
  const sw = (px * 160) / size
  const draw = drawings[k] ?? drawings.other
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 160 160"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {draw(sw)}
    </svg>
  )
}
