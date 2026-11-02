import { defaultDeps } from '../lib/deps'
import { createImageHandler } from '../lib/handlers'

// GET /.netlify/functions/image?id=…  →  an uploaded image file (used for product photos on Stripe)
export default createImageHandler(defaultDeps)
