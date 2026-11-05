import { defaultDeps } from '../lib/deps'
import { createPaymentsHandler } from '../lib/handlers'

// GET /.netlify/functions/checkout-payments (owner only, Firebase ID token)  →  paid checkouts
export default createPaymentsHandler(defaultDeps)
