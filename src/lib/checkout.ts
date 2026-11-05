import type { CheckoutInput, CheckoutItem } from '../types'
import { fromMinor, roundMinor, toMinor } from './money'

export interface CheckoutLine {
  item: CheckoutItem
  unitMinor: number
  /** List price per unit, never below the selling price. */
  listUnitMinor: number
  lineMinor: number
  savingsMinor: number
}

export interface CheckoutTotals {
  lines: CheckoutLine[]
  /** Sum of all quantities. */
  itemCount: number
  subtotalMinor: number
  listTotalMinor: number
  savingsMinor: number
  savingsPct: number
  shippingMinor: number
  taxMinor: number
  totalMinor: number
  subtotal: number
  listTotal: number
  savings: number
  shipping: number
  tax: number
  beforeTax: number
  total: number
}

type TotalsInput = Pick<CheckoutInput, 'items' | 'currency' | 'shipping' | 'taxRate'>

/** Order math in minor units. The browser and the payment function both use this. */
export function checkoutTotals(checkout: TotalsInput): CheckoutTotals {
  const currency = checkout.currency || 'USD'
  const lines = checkout.items.map((item): CheckoutLine => {
    const unitMinor = toMinor(item.price, currency)
    const listUnitMinor = Math.max(toMinor(item.listPrice, currency), unitMinor)
    return {
      item,
      unitMinor,
      listUnitMinor,
      lineMinor: unitMinor * item.quantity,
      savingsMinor: (listUnitMinor - unitMinor) * item.quantity,
    }
  })
  const itemCount = lines.reduce((sum, l) => sum + l.item.quantity, 0)
  const subtotalMinor = lines.reduce((sum, l) => sum + l.lineMinor, 0)
  const listTotalMinor = lines.reduce((sum, l) => sum + l.listUnitMinor * l.item.quantity, 0)
  const savingsMinor = listTotalMinor - subtotalMinor
  const shippingMinor = toMinor(checkout.shipping, currency)
  const taxMinor = checkout.taxRate > 0 ? roundMinor((subtotalMinor * checkout.taxRate) / 100, currency) : 0
  const totalMinor = subtotalMinor + shippingMinor + taxMinor
  const major = (minor: number) => fromMinor(minor, currency)
  return {
    lines,
    itemCount,
    subtotalMinor,
    listTotalMinor,
    savingsMinor,
    savingsPct: savingsMinor > 0 && listTotalMinor > 0 ? Math.round((savingsMinor / listTotalMinor) * 100) : 0,
    shippingMinor,
    taxMinor,
    totalMinor,
    subtotal: major(subtotalMinor),
    listTotal: major(listTotalMinor),
    savings: major(savingsMinor),
    shipping: major(shippingMinor),
    tax: major(taxMinor),
    beforeTax: major(subtotalMinor + shippingMinor),
    total: major(totalMinor),
  }
}

export function formatRate(rate: number): string {
  return String(Math.round(rate * 1000) / 1000)
}
