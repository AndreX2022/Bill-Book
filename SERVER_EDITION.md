Original server-based edition documentation (not validated as part of the Android APK work).

# Completed Android APK edition

The standalone offline Android application and build instructions are in
`android-offline/`. Use the delivered `BillBook-1.2.apk` on Android 8.0+.
It works without the backend below. The original server-based project is
preserved as a separate edition and is not required by the APK.

# Billbook

A GST billing/invoicing app for Indian small businesses, in the spirit of myBillBook.
Backend + web + mobile, all working.

## Architecture

```
backend/   Express + TypeScript + Prisma (SQLite) — the API, and the only
           place that touches the database or does GST math authoritatively.
web/       Next.js (App Router) + Tailwind — talks to the backend over HTTP.
mobile/    Expo / React Native — talks to the same backend. See mobile/README.md
           for Android-specific setup, running on a device, and building an APK.
```

Separate projects on purpose: they run independently, and web + mobile share
the one backend without either needing to know about the other.

## Running it

### Backend

```bash
cd backend
npm install
cp .env.example .env   # set JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD before going further
npx prisma generate
npx prisma migrate dev --name init
npm run seed        # creates your admin login + a demo business, 2 customers, 2 items
npm run dev         # http://localhost:4000
```

Every route except `/api/auth/login`, `/api/auth/me` and `/health` requires a
bearer token now. Sign in with the `ADMIN_EMAIL`/`ADMIN_PASSWORD` from your
`.env` (whatever you set before running `npm run seed`).

> This sandbox's network couldn't reach `binaries.prisma.sh` to fetch Prisma's
> query engine, so `prisma generate`/`migrate` weren't run here. They'll work
> normally on your machine with regular internet access — nothing about the
> schema or code depends on the sandbox.

### Web

```bash
cd web
npm install
cp .env.local.example .env.local
npm run dev        # http://localhost:3000
```

Open `http://localhost:3000`. The seeded demo data (edit the business profile
via `PUT /api/business`, or just edit the seed and re-run it) makes the app
explorable immediately.

### Mobile

See `mobile/README.md` — covers install, running on an Android phone/emulator
via Expo Go, and building an installable APK with EAS Build.

## What's implemented

- **Authentication** — JWT-based login (`bcryptjs` + `jsonwebtoken`), a single
  admin user seeded from `.env`. Every API route except `/api/auth/*` and
  `/health` requires a valid bearer token; the web app redirects to `/login`
  without one and clears a rejected token automatically. No signup flow by
  design (single-business tool) — change the password by re-running the seed
  with a new `ADMIN_PASSWORD`, or add a small script if you'd rather not
  reseed the demo data.
- **Business profile, customers, items** — full CRUD, with per-item stock
  and a low-stock threshold.
- **Invoices** — line items with live GST preview as you type; the server
  always recomputes totals from raw line items before saving, never trusts
  the client. Auto CGST+SGST vs IGST based on business state vs customer
  state. Sequential numbering as `PREFIX/FY/0001` (e.g. `INV/25-26/0007`),
  Indian financial year (Apr–Mar). Draft → Sent → Partially paid/Paid →
  Overdue/Cancelled status flow. Stock decrements automatically when an
  invoice is created for a stocked item.
- **Payments** — record partial or full payments against an invoice; status
  updates automatically.
- **Print/PDF** — the invoice detail page has a print stylesheet; "Print /
  Save PDF" uses the browser's native print-to-PDF, so no PDF library
  dependency to maintain.
- **WhatsApp sharing** — a "Share on WhatsApp" button opens a `wa.me`
  click-to-chat link prefilled with the invoice summary (see limits below).
- **Reports** — sales summary, a GST summary formatted for filling in
  GSTR-1 by hand, stock levels with low-stock flags, and outstanding dues.
- **Mobile (Android-focused)** — Expo/React Native app covering the same
  flows (login, dashboard, invoices, customers, items, a condensed
  reports screen), sharing the same backend and GST logic. See
  `mobile/README.md` for running it on a phone/emulator and building an
  installable APK.

## Not built yet (the honest gaps in "everything")

These need real-world setup this environment can't do for you, or are
straightforward but sizeable next steps:

- **Auth hardening** — login has no rate limiting or lockout, there's one
  role (nothing to hide from yourself), and tokens can't be revoked before
  they expire (7 days). Fine for one owner running their own business;
  worth strengthening before handing logins to staff or exposing this
  beyond your own network.
- **GSTN e-filing** — actually submitting GSTR-1/3B to the government
  portal needs a GSP (GST Suvidha Provider) API account registered to your
  GSTIN. The GST summary report gives you the numbers in a filing-friendly
  layout; it doesn't submit them.
- **WhatsApp Business API** — true auto-attached-PDF sending needs Meta
  Business verification. The click-to-chat link is the honest substitute:
  it opens WhatsApp with the message pre-filled, but you attach the PDF by
  hand.
- **True offline mode / multi-device sync** — not implemented. The web app
  needs the backend reachable; there's no local-first storage or conflict
  resolution.
- **Multi-business / multi-tenant** — one business per deployment for now.
- **Payment gateway integration** (UPI/card auto-collection) — payments are
  recorded manually, not collected in-app.
- **Barcode scanning** — not implemented.
- **iOS build** — the mobile app is plain React Native/Expo, so
  `eas build --platform ios` works the same way in principle, but needs an
  Apple Developer account and hasn't been tested — `mobile/README.md` only
  documents the Android path, since that's what you asked for.
- **Input validation library** (e.g. zod) — routes do basic manual checks;
  worth hardening before this handles real money.

## Notes on the code

- `backend/src/lib/gst.ts` is the one place GST math happens on the
  server; `web/lib/gst.ts` and `mobile/src/lib/gst.ts` are hand-kept
  mirrors used only for live previews while building an invoice — the
  server is always authoritative. If a shared package gets added later,
  these three should merge into one.
- SQLite is the default for zero-config local dev. Switching to Postgres
  later is a one-line change to `backend/prisma/schema.prisma`'s
  `datasource` block plus a new `DATABASE_URL`.
- `Item.name` / `Customer.name` search (`?q=`) is case-sensitive under
  SQLite (`contains` doesn't support `mode: "insensitive"` there); it
  becomes case-insensitive automatically if you move to Postgres.
