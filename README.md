# Innovatif Designs

Client-facing pricing pages that make your offer the obvious choice.

You create a **page** for a client: the services or products you are selling, a short description
of each, an illustration or your own image, **your price** and the **market price**. The page shows
the client the difference (how much they save and by what percentage), sums everything into one
clear number, and ends with a call to action. The home screen is just a search bar and the pages
you have created.

- Black and white surfaces, royal blue only where it helps the sale.
- Fifteen built-in line illustrations: product, design, software, social media, branding,
  marketing, website, mobile app, photo & video, content, strategy, print, e-commerce, SEO, other.
  You can also upload your own image for the cover or any service.
- Live preview while you edit, print / save as PDF, full-screen presenting, shareable client links.
- Data lives in **Firestore**; the site is a static build hosted on **Netlify**.

## Run it locally

```bash
npm install
npm run dev          # http://localhost:5173 — uses Firestore (see setup below)
npm run dev:demo     # same app, but pages are kept in this browser only (no Firebase needed)
```

`npm run build` type-checks and produces the production bundle in `dist/`.

## Firebase setup (one time)

The Firebase web configuration for the project `innovatif-designs` is in `src/lib/firebase.ts`.
Three things need to exist in the [Firebase console](https://console.firebase.google.com/project/innovatif-designs):

1. **Firestore Database** → Create database (any region, production mode is fine).
2. **Firestore Database → Rules** → paste the contents of `firestore.rules` → Publish.
   (Or run `firebase deploy --only firestore:rules` with the Firebase CLI.)
   These rules let anyone with a page link open that page, while only a signed-in user can list,
   create, edit or delete pages.
3. **Authentication → Sign-in method** → enable **Email/Password**, then
   **Authentication → Users → Add user** and create your own login.
   Also open **Authentication → Settings → User actions** and turn off *Enable create (sign-up)*
   so nobody else can register an account.

That's it. Sign in with that email and password on the home screen.

Images you upload are downscaled in the browser and stored in Firestore (collection `images`),
so no Firebase Storage or paid plan is required. Keep uploads reasonable; each image is capped at
roughly 600 KB after compression.

## Deploy on Netlify

1. Push this repository to GitHub and create a new Netlify site from it.
2. `netlify.toml` already sets the build command (`npm run build`), the publish directory
   (`dist`), Node 22, and the single-page-app redirect. No environment variables are needed.
3. After the first deploy, add your Netlify domain (for example `innovatif-designs.netlify.app`)
   under **Firebase console → Authentication → Settings → Authorized domains** so sign-in works
   from the live site.

## Using it

- **New page** (top right) opens the editor. Fill in the title, client, introduction, cover
  illustration, currency and validity date; add services with a description, your price and the
  market price; finish with your call to action, name and contact details. The preview on the
  right updates as you type. `Ctrl/⌘ + S` saves.
- In a service description, lines that start with `- ` become checklist items.
- The **contact** field accepts something like `hello@studio.com · +1 555 010 2030 · studio.com`.
  The email address becomes the *Accept proposal* button; the phone number becomes a call button.
- On a page: **Present** (full screen, `Esc` to leave), **Print / PDF**, **Copy client link**,
  and under `…` you can **Duplicate** or **Delete**. Clients who open the link see only the page.
- Your currency, name, contact, call to action and notes are remembered for the next page.

## Project layout

```
src/
  pages/        Home (search + pages), Editor (form + live preview), PageView (client page)
  components/   Proposal (the page itself), PageCard, ArtPicker, Login, …
  lib/          illustrations, formatting, normalization, Firestore / local backends, auth
firestore.rules Firestore security rules
netlify.toml    Netlify build configuration
```
