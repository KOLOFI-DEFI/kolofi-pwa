# Kólófi PWA

The Kólófi web app: save in USDT, earn daily interest, and join ajo circles where nobody can run with the pot. It runs against the Kólófi API (`kolofi-backend`, `/api/v1`) and installs as a PWA.

Every screen has two real layouts, not one stretched one:

- **Phone (<768px):** the mobile design from the boards (`design/frames`, `design/Hackathon project help`): full-screen pages, sticky actions, the floating tab bar.
- **Tablet (768–1099px):** an icon rail on the left and two-column grids.
- **Desktop (≥1100px):** a full side navigation and desktop compositions: dashboards on a 12-column grid, tables for history, forms beside a live summary panel, detail pages with a side panel of facts and actions, dialogs for confirmations, and a split-screen sign-in.

Its sister repo is **kolofi-mobile** (Expo React Native), which copies `src/core` from here.

## Quick start

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173. With the default mock API, sign in as `ada@example.com` / `Kolofi2026!`. The transaction PIN is `482915` and the email code is `123456`.

To use the real API, start the backend (`php artisan serve`, or Herd) and run with `VITE_API_MODE=http` (see Environment). The dev server proxies `/api` to it, so there's no CORS setup in development.

| Script | What it does |
|---|---|
| `npm run dev` | Starts the Vite dev server. |
| `npm run build` | Typechecks, then builds to `dist/` with a service worker and manifest. |
| `npm run preview` | Serves the production build. Use this to test install and offline. |
| `npm test` | Runs Vitest on the formatters and the mock API. |
| `npm run visual` | Screenshots every screen at phone (430×932) and desktop (1440×900) size in light and dark, and diffs the phone shots against `design/frames`. |

## Environment

Copy `.env.example` to `.env`:

| Var | Values |
|---|---|
| `VITE_API_MODE` | `mock` (default): in-memory API with demo data. `http`: the real Kólófi API. |
| `VITE_API_BASE_URL` | API root in http mode. `/api/v1` in development (proxied); the full URL in production, e.g. `https://api.kolofi.ng/api/v1`. |
| `KOLOFI_API_PROXY` | Where the dev server sends `/api` requests. Default `http://127.0.0.1:8000`. |

In production the API must allow the app's origin in CORS (`config/cors.php` in the backend; Laravel's default allows all origins on `api/*`).

## Project layout

```
src/
  core/            SHARED with kolofi-mobile. Platform-free TypeScript only.
    types.ts       API response shapes (money is a decimal string, e.g. "74.5")
    api/           KolofiApi contract, http adapter (every route), mock adapter
    data.ts        TanStack Query hooks. Screens use only these.
    format.ts      money / dates / addresses
    tokens.ts      colours (light/dark), type scale, radii, spacing
    icons.ts       icon geometry
  app/             router (route table + set-up guards), ThemeProvider
  state/           zustand stores: session (token, user), theme
  ui/              design system (index.tsx), responsive shell (Shell.tsx), charts, tab bar
  screens/         auth, home, wallet, activity, save, circles, profile
e2e/               visual suite
```

## Screens and routes

| Area | Routes |
|---|---|
| Sign-in and set-up | `/welcome`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/verify` (email code), `/auth/pin` (transaction PIN) |
| Home | `/home` |
| Wallet | `/wallet`, `/wallet/add` (deposit address), `/wallet/withdraw`, `/wallet/withdrawals/:id` |
| Activity | `/activity` (history and statements) |
| Save | `/save`, `/save/new`, `/save/:id` |
| Circles | `/circles`, `/circles/packages/:id` (join), `/circles/join-code`, `/circles/:id`, `/circles/market` (waitlist, seats for sale, transfers) |
| Account | `/profile`, `/notifications`, `/reputation` |

How set-up gates the app (`state/session.ts`, `stageOf`): no token → welcome/login; email not verified → `/auth/verify`; no transaction PIN → `/auth/pin`; otherwise the app. A 401 from the API signs the member out.

Every money move asks for the transaction PIN in a dialog (`usePin()` in `ui/index.tsx`). Money routes send an `Idempotency-Key` automatically.

Features the API marks `coming_soon` (Naira funding and withdrawals, BVN/NIN, phone verification, push, WhatsApp, crypto swap) are shown as disabled "Coming soon" options.

## Design system rules

- **Use tokens only.** Colours come from `core/tokens.ts`; `ThemeProvider` turns them into CSS variables such as `--sig`, `--surface2` and `--on-sig`. The exceptions are the always-dark ink cards and the lime next-payment card.
- **Type roles.** Young Serif for balances and titles, Figtree for UI text, DM Mono for eyebrows, amounts in rows, addresses and codes.
- **Two layouts per screen.** Write layout in each screen's CSS module with `@media (min-width: 768px)` and `@media (min-width: 1100px)` blocks. `screens/home` is the reference: the phone list becomes a desktop table, quick-action tiles become header buttons, and a side column appears only on desktop. Don't ship a phone layout centred on a desktop page.
- **Theme.** The app follows the system setting by default; members can override it in the sidebar or under Profile → Appearance. The choice is saved as `kolofi.theme`, and a script in `index.html` applies it before first paint.

## Adding a screen

1. If it needs new data, add the shape to `core/types.ts`, the method to `core/api/contract.ts`, and implement it in `http.ts` (the route) and `mock.ts` (demo data).
2. Add a hook to `core/data.ts`.
3. Build the screen in `src/screens/<area>/` from `@/ui` components, with phone and desktop layouts.
4. Register the route in `src/app/router.tsx` (inside `AppShell` for signed-in pages).
5. Add it to `e2e/screens.ts`.

## Deploying

- `npm run build` produces a static `dist/`. Host it on any static host with an SPA fallback so every path serves `index.html`.
- Build with `VITE_API_MODE=http` and `VITE_API_BASE_URL` set to the API's public URL.
- The service worker precaches the app shell, so the app opens offline. Data still needs the network.
