# Innovatif Designs

Client-facing pages that make your offer the obvious choice, and let clients pay on the spot.

There are two kinds of pages. The home screen is just a search bar and every page you have created.

- **Pricing page.** The services or products you are selling, a short description of each, an
  illustration or your own image, **your price** and the **market price**. The client sees the
  difference (how much they save and by what percentage), one clear total, and a call to action.
- **Checkout.** An Amazon-style order page: products with image, description, quantity and price,
  an optional crossed-out list price, shipping, tax, and an order summary with a **Pay** button.
  Payment runs on **Stripe**. You see each order's status (paid, processing, awaiting payment).

Also included:

- Black and white surfaces, royal blue only where it helps the sale.
- Fifteen built-in line illustrations: product, design, software, social media, branding,
  marketing, website, mobile app, photo & video, content, strategy, print, e-commerce, SEO, other.
  You can also upload your own images.
- Live preview while you edit, print / save as PDF, full-screen presenting, shareable client links.
- Data lives in **Firestore**; the site is a static build on **Netlify**, with Netlify Functions
  for the Stripe calls.

## Run it locally

```bash
npm install
npm run dev          # http://localhost:5173 — uses Firestore (see setup below)
npm run dev:demo     # same app, but pages are kept in this browser only (no Firebase needed)
npx netlify dev      # app + payment functions together, reads STRIPE_SECRET_KEY from .env
```

`npm run build` type-checks and produces the production bundle in `dist/`. In demo mode the Pay
button explains that payments are off; everything else works.

## Firebase setup (one time)

The Firebase web configuration for the project `innovatif-designs` is in `src/lib/firebase-config.ts`.
Three things need to exist in the [Firebase console](https://console.firebase.google.com/project/innovatif-designs):

1. **Firestore Database** → Create database (any region, production mode is fine).
2. **Firestore Database → Rules** → paste the contents of `firestore.rules` → Publish.
   (Or run `firebase deploy --only firestore:rules` with the Firebase CLI.)
   These rules let anyone with a page or checkout link open it, while only a signed-in user can
   list, create, edit or delete. **Publish them again whenever `firestore.rules` changes**: the
   checkout feature added a `checkouts` collection, and checkouts can't be saved or paid until
   the new rules are live.
3. **Authentication → Sign-in method** → enable **Email/Password**, then
   **Authentication → Users → Add user** and create your own login.
   Also open **Authentication → Settings → User actions** and turn off *Enable create (sign-up)*
   so nobody else can register an account.

Sign in with that email and password on the home screen.

Images you upload are downscaled in the browser and stored in Firestore (collection `images`),
so no Firebase Storage or paid plan is required. Each image is capped at roughly 600 KB after
compression.

## Deploy on Netlify

1. Push this repository to GitHub and create a new Netlify site from it.
2. `netlify.toml` already sets the build command (`npm run build`), the publish directory
   (`dist`), the functions folder (`netlify/functions`), Node 22, and the single-page-app redirect.
3. After the first deploy, add your Netlify domain (for example `innovatif-designs.netlify.app`)
   under **Firebase console → Authentication → Settings → Authorized domains** so sign-in works
   from the live site.

## Stripe payments (checkouts)

1. Create a Stripe account, then open **Developers → API keys** in the Stripe Dashboard and copy
   the **Secret key**. Start in test mode (`sk_test_...`).
2. In Netlify open **Site configuration → Environment variables**, add `STRIPE_SECRET_KEY` with
   that value, then redeploy (**Deploys → Trigger deploy**). Functions only see new variables
   after a deploy.
3. Make sure the latest `firestore.rules` are published (see above).
4. Open a checkout and press **Pay**. In test mode use card `4242 4242 4242 4242`, any future
   expiry date and any CVC. The owner toolbar shows *Test mode* until you switch keys.
5. When you are ready for real money, replace the variable with your live key (`sk_live_...`)
   and redeploy.

Payments, refunds and payouts are managed in your Stripe Dashboard. Optional: set `OWNER_EMAILS`
(comma separated) so only those signed-in accounts can list payment statuses.

How it stays safe:

- The Pay button sends only the checkout's id. The function reads the order from Firestore and
  builds the Stripe line items itself, so a buyer cannot change prices or quantities.
- Card details are entered on Stripe's own page and never touch this site.
- Paid status comes from Stripe. A checkout that is already paid shows *Paid* and cannot be paid
  twice by accident.
- Your secret key lives only in Netlify's environment variables, never in the repository or the
  browser.

## Using it

- **New page** (top right) lets you choose a **Pricing page** or a **Checkout**.
- Pricing page: fill in the title, client, introduction, cover illustration, currency and validity
  date; add services with a description, your price and the market price; finish with your call
  to action, name and contact details.
- Checkout: add products with an image (upload or illustration), description, quantity, price
  and an optional list price. A list price above the price shows as a crossed-out sale price with
  the saving. A price of 0 with a list price adds a free bonus item. Add an optional shipping fee,
  a tax rate, and turn on *Ask for a delivery address* for physical products.
- The preview on the right updates as you type, and `Ctrl/⌘ + S` saves.
- In descriptions, lines that start with `- ` become checklist items.
- The **contact** field accepts something like `hello@studio.com · +1 555 010 2030 · studio.com`.
- On a page: **Print / PDF**, **Copy client link**, and under `…` **Duplicate** or **Delete**.
  Pricing pages also have **Present** (full screen, `Esc` to leave). Clients who open a link see
  only the page.
- Your currency, name and contact details are remembered for the next page.

## Project layout

```
src/
  pages/        Home, Editor + PageView (pricing pages), CheckoutEditor + CheckoutView (checkouts)
  components/   Proposal and CheckoutPage (what clients see), PageCard, ArtPicker, Login, …
  lib/          money and checkout math, formatting, normalization, Firestore / local storage,
                auth, payments client, illustrations
netlify/
  functions/    checkout-create, checkout-status, checkout-payments, image
  lib/          Stripe session builder, Firestore REST reader, Firebase token check, handlers
firestore.rules Firestore security rules
netlify.toml    Netlify build and functions configuration
.env.example    Variables for local testing with `npx netlify dev`
```
