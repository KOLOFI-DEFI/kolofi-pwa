# Kólófi PWA

An installable web app for Kólófi. Users save in USDT straight from Naira and join on-chain ajo circles. The app copies the 22 screens on the design boards (`design/boards`) in light and dark mode.

Its sister repo is **kolofi-mobile** (Expo React Native). Both apps run on the same `src/core`, and this repo owns it.

## Quick start

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173. The app starts at the intro. In mock mode the OTP code is `123456`.

To jump straight to any screen, open http://localhost:5173/dev/kit. Tap **Unlock app routes** to skip sign-up. The kit page also shows every colour token and UI component, and has a light/dark switch.

| Script | What it does |
|---|---|
| `npm run dev` | Starts the Vite dev server. |
| `npm run build` | Typechecks, then builds to `dist/` with a service worker and manifest. |
| `npm run preview` | Serves the production build. Use this to test install and offline. |
| `npm test` | Runs Vitest on the formatters and the mock API contract. |
| `npm run visual` | Uses Playwright to screenshot every screen in light and dark, then diffs each one against `design/frames`. |

## Environment

Copy `.env.example` to `.env`:

| Var | Values |
|---|---|
| `VITE_API_MODE` | `mock` (default): in-memory backend that returns the design data. `http`: the real API. |
| `VITE_API_BASE_URL` | Base URL of the REST API, used only when the mode is `http`. |

## Project layout

```
design/
  boards/          original design exports (light + dark rows)
  frames/          one 430×932 crop per screen, used by `npm run visual`
src/
  core/            SHARED with kolofi-mobile. Platform-free TypeScript only.
    tokens.ts      colours (light/dark), type scale, radii, spacing
    theme.ts       system/light/dark resolution
    types.ts       domain models (amounts are integer minor units)
    format.ts      ₦ / USDT / dates / addresses / countdown
    icons.ts       icon geometry (rendered by <svg> here, react-native-svg there)
    api/           KolofiApi contract, mock adapter + fixtures, http adapter
    data.ts        TanStack Query hooks. Screens use only these.
  app/             router (route table + sign-up guard), ThemeProvider
  state/           zustand stores: theme preference, session/sign-up stage
  ui/              design-system components (index.tsx), charts, TabBar
  screens/         one folder per area: onboarding, auth, home, money, save, circles, profile, dev
e2e/               visual comparison suite
```

## Screens and routes

| # | Board | Route |
|---|---|---|
| 01–03 | Intro: Save / Circles / On-chain | `/intro/save`, `/intro/circles`, `/intro/onchain` |
| 04 | Phone number | `/auth/phone` |
| — | OTP (**not on the boards**; added in the same style) | `/auth/otp` |
| 05 | BVN / NIN | `/auth/kyc` |
| 06 | Wallet ready | `/auth/wallet-ready` |
| 07 | Link bank & auto-save | `/auth/auto-save` |
| 08 | Home | `/home` |
| 09 | Add money | `/money/add` |
| 10 | Withdraw | `/money/withdraw` |
| 11 | Save | `/save` |
| 12 | New goal | `/save/new-goal` |
| 13 | Locked savings | `/save/locked` |
| 14 | Circles (join) | `/circles` |
| 15 | Deposit & pick turn | `/circles/:id/join` |
| 16 | Circle detail | `/circles/:id` |
| 17 | Your turn: pot collected | `/circles/:id/payout` |
| 18 | Notifications | `/notifications` |
| 19 | Missed payment | `/circles/:id/missed` |
| 20 | Profile (plus an **Appearance** row: System / Light / Dark) | `/profile` |
| 21 | Trust score | `/trust` |
| 22 | WhatsApp | `/whatsapp` |

How sign-up gates the app:

- App routes stay locked until sign-up reaches `stage = ready`. `/` sends the user back to wherever they left off.
- The payout and missed-payment screens open from the circle detail's **⋯** menu, and also from notifications.

## Design system rules

- **Use tokens only.** Colours come from `core/tokens.ts`. `ThemeProvider` turns them into CSS variables such as `--sig`, `--surface2` and `--on-sig`. Don't hard-code hex values in screens. The one exception is the always-dark ink cards (`--ink`).
- **Use the type roles.**
  - Young Serif: balances and titles.
  - Figtree: UI text.
  - DM Mono: eyebrows, amounts in rows, addresses, and the countdown.
- **Mind the units.** The boards are 430×932 at 1pt = 1px. The gutter is 24px, buttons are 56px tall and fields are 60px.
- **Theme.** The app follows the phone's setting by default. Users can override it under Profile → Appearance, and the choice is saved in `localStorage` as `kolofi.theme`. A script in `index.html` applies the theme before first paint, so there's no flash.

## Adding a screen

1. If the screen needs new data, add the model to `core/types.ts` and the method to `core/api/contract.ts`. Then implement it in **both** `mock.ts` (with fixtures) and `http.ts` (add the route).
2. Add a hook to `core/data.ts`.
3. Build the screen in `src/screens/<area>/` from `@/ui` components.
4. Register the route in `src/app/router.tsx`.
5. If there's a design frame for it, add it to `e2e/screens.ts`.
6. Run `npm run sync:core` in kolofi-mobile and port the screen there with the same component names.

## Moving to the real backend

- Switch with `VITE_API_MODE=http`. Screens don't change.
- `src/core/api/http.ts` holds the proposed REST route table. Share it with the backend team as the contract, and edit only that file if their paths differ.
- Errors come back as `ApiError(status, code, message)`.
- Auth sends a bearer token from the session store.
- Amounts are integer minor units: USDT cents and Naira kobo.

Open items for the backend:

- Kólófi's WhatsApp number (`KOLOFI_WHATSAPP` in `screens/profile/Profile.tsx`).
- The block explorer to link to. It currently points at basescan.org.
- The rules for spot dates and fees. The mock uses a 1% contribution fee and a 0.5% pot fee.

## Checking fidelity

```bash
npm run visual
```

This writes `e2e/__diff__/NN-name-{light,dark}.{app,diff}.png` for every screen. The design frames include the phone bezel and status bar, so a small vertical offset is expected. Fix any layout drift you see in the diffs.

## Deploying

- `npm run build` produces a static `dist/` folder. Host it on any static host (Vercel, Netlify, Cloudflare Pages, S3 + CloudFront).
- Set up an SPA fallback so every path serves `index.html`.
- The service worker precaches the app shell, so the app opens offline. Data still needs the network.
- To test installing, run `npm run preview` and open it in Chrome on Android, or use "Add to Home Screen" in Safari on iOS.

## Sharing `core` with mobile

For now, `kolofi-mobile` copies `src/core` with `npm run sync:core`. Each copied file is stamped as generated, so edit `core` **here** only. When the API settles, publish `core` as a private `@kolofi/core` package (npm or GitHub Packages) and depend on it from both apps.
