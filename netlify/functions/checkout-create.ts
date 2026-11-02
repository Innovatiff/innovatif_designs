import { defaultDeps } from '../lib/deps'
import { createCheckoutHandler } from '../lib/handlers'

// POST /.netlify/functions/checkout-create  { id }  →  { url } (Stripe Checkout page)
export default createCheckoutHandler(defaultDeps)
