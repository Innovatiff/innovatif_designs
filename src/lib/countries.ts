// Countries Stripe Checkout accepts for shipping addresses (from the Stripe API spec).
const CODES = [
  'AC AD AE AF AG AI AL AM AO AQ AR AT AU AW AX AZ BA BB BD BE BF BG BH BI',
  'BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CD CF CG CH CI CK CL CM CN CO',
  'CR CV CW CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FO FR GA',
  'GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HN HR HT HU ID',
  'IE IL IM IN IO IQ IS IT JE JM JO JP KE KG KH KI KM KN KR KW KY KZ LA LB',
  'LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MK ML MM MN MO MQ MR MS MT',
  'MU MV MW MX MY MZ NA NC NE NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK',
  'PL PM PN PR PS PT PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL',
  'SM SN SO SR SS ST SV SX SZ TA TC TD TF TG TH TJ TK TL TM TN TO TR TT TV',
  'TW TZ UA UG US UY UZ VA VC VE VG VN VU WF WS XK YE YT ZA ZM ZW',
]
  .join(' ')
  .split(' ')

export const SHIPPING_COUNTRIES: ReadonlySet<string> = new Set(CODES)

let names: Intl.DisplayNames | null | undefined

/** "US" → "United States" (falls back to the code). */
export function countryName(code: string): string {
  if (names === undefined) {
    try {
      names = new Intl.DisplayNames(['en'], { type: 'region' })
    } catch {
      names = null
    }
  }
  try {
    return names?.of(code) ?? code
  } catch {
    return code
  }
}

/** Splits "us, ca;MA" into ["US", "CA", "MA"], keeping unknown codes so they can be reported. */
export function parseCountryList(value: unknown): string[] {
  const parts = Array.isArray(value) ? value.map(String) : String(value ?? '').split(/[\s,;]+/)
  const out: string[] = []
  for (const part of parts) {
    const code = part.trim().toUpperCase()
    if (code && !out.includes(code)) out.push(code)
  }
  return out
}
