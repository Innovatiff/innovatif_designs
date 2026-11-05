import { defaultDeps } from '../lib/deps'
import { createStatusHandler } from '../lib/handlers'

// GET /.netlify/functions/checkout-status?id=…[&session_id=…]  →  payment state of an order
export default createStatusHandler(defaultDeps)
