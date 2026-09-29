# CHRONOS — Production Implementation Specification

**Source of truth:** `chronos_appointment_scheduling_ui.html` (Alpine.js + Tailwind CDN demo, 1,411 lines)
**Target repo:** existing monorepo (`apps/web` Next.js 16.3 · `apps/api` NestJS · `prisma/` · `packages/*`)
**Audience:** a coding agent or dev team implementing the product end-to-end.

---

## 0. How to read this document

### 0.1 Provenance tags
Every non-trivial statement is tagged so you know how much freedom you have.

| Tag | Meaning | Freedom |
|---|---|---|
| **[D]** | Derived directly from the demo (markup, classes, JS) | None. Reproduce exactly. |
| **[I]** | Inferred from the demo (implied by structure/labels) | Low. Follow unless it conflicts with [D]. |
| **[P]** | Required for production but absent from the demo | Must be built; UX must feel identical to the demo. |
| **[R]** | Technical recommendation | Medium. Change only with a stated reason. |
| **[X]** | Demo defect / placeholder that must NOT be copied | Fix as specified. |

### 0.2 Precedence rules
1. Demo visuals/UX **[D]** override everything, including the redesign already present in `apps/web` (the earlier dark "Chronos" pass, `#080D18`).
2. Existing backend domain logic (Prisma compare-and-set booking, timezone package) overrides demo data shapes. The demo is frontend-only; its JS objects are illustrations, not contracts.
3. Where the demo contradicts itself, section 2.4 states the resolution.

### 0.3 Facts about the current repo (from `PROJECT_CONTEXT.md`)
- Web builds on Next 16.3.0 after a clean reinstall. API build is **not verified**. Tests/lint **not run**.
- Postgres is not running; `.env` `DATABASE_URL` (localhost:5432) conflicts with docker-compose (port 5433, user `chronos`). Both must be reconciled before any live-data work (Phase 0).
- Two DB access paths exist: Prisma (bookings) and raw `pg` Pool (availability). Section 9.2 removes the Pool.
- I have **not** seen `prisma/schema.prisma`. Entity fields in section 10 are the target; the implementer must diff them against the real schema and write a migration, not overwrite blindly.

---

## 1. Product overview

Chronos is a multi-workspace SaaS appointment scheduler **[D]**: a provider (e.g. "Dr. Sarah Jenkins") defines event types and weekly availability; clients book through a public page; the provider manages appointments, clients, calendar, integrations, and (later) billing/reports.

**Actors**
| Actor | Surfaces | Source |
|---|---|---|
| Provider / workspace member | Authenticated app (dashboard, calendar, ...) | [D] |
| Client (unauthenticated) | Public booking flow, confirmation, cancel/reschedule links | [D] + [P] |
| Workspace admin | Settings, billing, integrations, members | [I] (workspace switcher, "Pro Workspace") |
| System | Reminder jobs, calendar sync, email | [P] |

**Product pillars**
1. Timezone-safe booking (repo's stated goal). The demo hard-codes "EDT"; production must never do this (section 12).
2. Zero double booking (existing compare-and-set transaction is kept).
3. A polished dark-first UI with a full light theme **[D]** (`darkMode` default `true`).

---

## 2. Demo audit

### 2.1 Screen inventory [D]

| # | Demo `currentTab` | Screen | Production route | Exists in repo? |
|---|---|---|---|---|
| 1 | `dashboard` | Executive Dashboard | `/dashboard` | yes (rebuild to match) |
| 2 | `calendar` | Interactive Calendar | `/calendar` | yes |
| 3 | `appointments` | Appointments Directory | `/appointments` | yes |
| 4 | `event-types` | Event Types | `/event-types` | yes |
| 5 | `availability` | Availability Schedules | `/availability` | yes |
| 6 | `clients` | Clients CRM | `/clients` | yes |
| 7 | `public-booking` | Public booking simulation (4 steps) | `/[handle]` and `/[handle]/[eventSlug]` (public, **no app shell**) | partial (`/book/[provider]`) |
| 8 | `settings` | Settings (6 tabs, 2 built) | `/settings/[tab]` | yes |
| 9 | `reports` | in nav, **no screen** | `/reports` | no |
| 10 | `billing` | in nav, **no screen** (Settings tab also named Billing) | `/billing` | no |
| 11 | `analytics` | in nav, **no screen** | `/analytics` | no |

Overlays [D]: Command palette (⌘K), Appointment details drawer, New Appointment modal, Notifications dropdown, User dropdown, Workspace switcher dropdown, Toasts, Mobile sidebar overlay.

### 2.2 Global behaviors [D]
- Single-page tab switching, no URL changes (`currentTab`). Production uses real routes (section 5).
- Every screen root uses Alpine `x-transition` (fade + slight scale, ~150ms in / 75ms out). Reproduce with a 150ms opacity+scale-95 enter on route content.
- Body `transition-colors duration-200` on theme change.
- "Demo Empty States" toggle in sidebar forces zeros/empty views. Production: **remove the toggle**; empty states are driven by real data. Keep the visual output identical (section 15). [X]

### 2.3 Demo defects that must not be copied [X]

| # | Defect in demo | Production fix |
|---|---|---|
| X1 | Mini calendars render days 1–31 with no weekday offset/no leading blanks; month hard-coded "October 2026"; prev/next chevrons do nothing | Real month grid, Sunday-first (header `S M T W T F S` is [D]), leading/trailing blanks, working navigation |
| X2 | "Today" is hard-coded to 2026-10-28 / "Wednesday, Oct 28, 2026" | Use the viewer's/provider's current date in the workspace timezone |
| X3 | Week grid header hard-coded `Mon 28 … Sun 4`, rows are 21 anonymous cells, 2 events pinned to cell indexes | Real week/month/day grids driven by appointments (section 6.2) |
| X4 | Public time slots hard-coded (`09:00 AM … 04:00 PM`) and labelled "(EDT)" | Slots from API, labelled with the viewer's IANA zone, with a zone picker |
| X5 | Public date picker allows any day 1–31, including past days and unavailable days | Disable past days, days outside booking window, and days with 0 slots |
| X6 | Availability timezone options carry fixed GMT offsets in labels ("GMT-4") which are wrong half the year | Compute offset labels at runtime via `Intl.DateTimeFormat` for the selected date |
| X7 | Buffer / Minimum notice `<select>`s are unbound and have no save path | Bound, persisted fields (section 6.5) |
| X8 | "Block Out Time" only fires a toast | Real modal + `TimeBlock` entity (section 6.1, 10) |
| X9 | `copyBookingLink` calls `document.execCommand('copy')` with nothing selected | `navigator.clipboard.writeText(url)` with fallback; toast only on success |
| X10 | Search palette input has no logic; shortcuts `N` and `A` are labels only | Implement search + shortcuts (section 8.1) |
| X11 | New-appointment modal ignores event type, always creates "1-on-1 Strategy Call", 30 min, fixed avatar | Add event type select (section 8.3) |
| X12 | Public flow: selecting a time instantly jumps to step 3 with no confirmation | Keep the auto-advance [D] but preserve selection when going Back |
| X13 | Time formats are inconsistent (`10:00 AM` vs `03:00`, `2026-10-28`) | One canonical ISO-8601 UTC instant on the wire; format at the edge (section 12) |
| X14 | `getStatusBadgeClass` has no case for `completed` / `rescheduled` although filter pills exist for them | Add badge styles (section 4.5) |
| X15 | Nav "Analytics" reuses the Dashboard icon (`fa-chart-line`) | Use a distinct icon (section 4.7) |
| X16 | Nav badge `5` on Appointments is a literal | Dynamic count of pending appointments |
| X17 | `emptyStateMode`-style KPIs: "4 hours busy", "Next at 10:00 AM", "vs. 124 last month", "30 paid bookings" are literals | Computed by API (section 11, `/dashboard/summary`) |
| X18 | Cancel is one click, no confirm, no reason | Confirm dialog with optional reason (section 8.2) |
| X19 | Settings: only Profile + Integrations built; Notifications/Branding/Security/Billing tabs are empty | Build in phases (section 6.8, 25) |
| X20 | Profile inputs use `value=` with no binding/save | Controlled forms + real save |
| X21 | Client card has a "Profile" button and card `@click` but no profile view exists (`openClientDetails` is undefined) | Client detail drawer/route (section 6.6) |
| X22 | `openEditEventTypeModal`, `openNewEventTypeModal`, `openClientDetails` are referenced but **not defined** | Implement (sections 6.4, 6.6) |
| X23 | Calendar `Today`, prev/next buttons, Event Types filter checkboxes do nothing | Functional |
| X24 | Unsplash avatar URLs hot-linked | Uploaded avatars in object storage; initials fallback |
| X25 | `x-if` on the nav badge `<span>` (not a `<template>`) | React conditional |

### 2.4 Conflicts between the demo and the current repo, and resolutions

| Topic | Repo today | Demo | Decision |
|---|---|---|---|
| Theme | Dark only | Light + dark, toggle in header, default dark | **Demo wins.** Implement both. [D] |
| Page bg (dark) | `#080D18` | `slate-950 = #0b0f19` | **Demo wins:** `#0b0f19`. |
| Card bg (dark) | `#0F172A` | `slate-900 = #0f172a` | Same. |
| Accent | `#6366F1` | `brand-500 = #6366f1` | Same. Adopt full `brand` 50–900 scale. |
| Icons | Lucide | Font Awesome 6.5.1 | **[R] Keep Lucide** (already installed, tree-shakes); use the mapping in 4.7. If pixel-parity with FA is contractually required, use `@fortawesome/react-fontawesome` + free-solid/regular/brands instead. |
| Public booking | `/book/[provider]` inside app | Simulation inside admin shell | Public route with its own minimal layout; keep `/book/[provider]` as a redirect alias. |
| Routing | Next routes | tab state | Real routes. |

---

## 3. Functional requirements (summary)

| ID | Requirement | Tag |
|---|---|---|
| F1 | Authenticate providers; multi-workspace membership; workspace switcher | [I]+[P] |
| F2 | Dashboard: greeting, 4 KPIs, today's schedule, booking handle card, recent activity | [D] |
| F3 | Calendar with Month/Week/Day/Agenda, mini calendar, event-type filters | [D] |
| F4 | Appointment list with text search + 6 status filters, detail drawer, cancel | [D] |
| F5 | Manual appointment creation | [D] |
| F6 | Event type CRUD, active toggle, copy link | [D]+[P] |
| F7 | Weekly hours builder, multi-slot per day, timezone, buffer, minimum notice, date overrides | [D]+[P] |
| F8 | Client directory with search, stats, detail | [D]+[P] |
| F9 | Public 4-step booking: type → date/time → details → confirmation | [D] |
| F10 | Notifications dropdown with unread dot and mark-all-read | [D] |
| F11 | Command palette (⌘K / Ctrl+K, Esc closes) | [D] |
| F12 | Settings: Profile, Integrations, Notifications, Branding, Security, Billing | [D] (2 built) |
| F13 | Integrations: Google Calendar (sync + conflict check), Zoom (auto-links) | [D] |
| F14 | Emails: confirmation with calendar invite, reminders, cancellation | [D] ("calendar invitation and confirmation email have been sent") |
| F15 | Reports, Analytics, Billing pages | [I] (nav only) |
| F16 | Paid event types (price shown; "Payment Received" notification) | [I] |

---

## 4. Design system (pixel spec) [D]

Implement as Tailwind v4 tokens in `apps/web/src/app/globals.css`. Do not hand-pick colours in components.

### 4.1 Tokens

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: "Inter", system-ui, -apple-system, sans-serif;

  --color-brand-50:#eef2ff; --color-brand-100:#e0e7ff; --color-brand-200:#c7d2fe;
  --color-brand-300:#a5b4fc; --color-brand-400:#818cf8; --color-brand-500:#6366f1;
  --color-brand-600:#4f46e5; --color-brand-700:#4338ca; --color-brand-800:#3730a3;
  --color-brand-900:#312e81;

  --color-slate-850:#151f32;   /* defined in demo config, unused in markup; keep for parity */
  --color-slate-950:#0b0f19;   /* dark page background */
}
```
Load Inter via `next/font/google` (weights 400–800; the demo uses medium/semibold/bold). `<html class="dark">` by default; theme persisted (section 9.4).

### 4.2 Colour roles

| Role | Light | Dark |
|---|---|---|
| Page bg | `slate-50` | `slate-950` (#0b0f19) |
| Surface (sidebar, header, cards, modals) | `white` | `slate-900` (#0f172a) |
| Border | `slate-200` | `slate-800` (cards sometimes `slate-800/80`) |
| Text primary | `slate-900` (body `slate-800`) | `white` / `slate-100` |
| Text secondary | `slate-500` | `slate-400` |
| Text muted | `slate-400` | `slate-400` |
| Input bg | `slate-50` | `slate-800` |
| Input border | `slate-200` | `slate-700` |
| Subtle fill (pills, kbd wells) | `slate-100` | `slate-800` (`/60` `/40` variants for panels) |
| Primary | `brand-600`, hover `brand-700`, focus/hover-border `brand-500` | same |
| Overlay | `slate-950/60` + `backdrop-blur-sm` | same |
| Success / Warning / Danger / Info | emerald / amber / rose / sky | tinted `-950` backgrounds, `-300/-400` text |

### 4.3 Typography [D]
| Use | Classes |
|---|---|
| App/header page title | `text-lg font-bold` |
| Screen H2 (dashboard greeting) | `text-2xl font-bold tracking-tight` |
| Section H3 (Event Types, Clients Directory, Availability) | `text-xl font-bold` |
| Card title | `text-base font-bold` (dense cards `text-sm font-bold`) |
| Body / table | `text-xs sm:text-sm` |
| Helper/meta | `text-xs`, `text-[11px]`, `text-[10px]` |
| KPI label | `text-xs font-semibold uppercase tracking-wider` |
| KPI value | `text-2xl font-bold` |
| Badge | `text-[10px] font-bold` (table: `text-xs font-bold`) |
| Mono | `font-mono` (booking handle, calendar hour labels, kbd) |

### 4.4 Shape, elevation, spacing [D]
| Element | Radius | Shadow |
|---|---|---|
| Cards/panels | `rounded-2xl` | `shadow-sm`; interactive cards `hover:shadow-md transition` |
| Buttons, inputs, selects, pills | `rounded-xl` (small chips/inline buttons `rounded-lg`) | primary: `shadow-md shadow-brand-500/20` |
| Modals & public booking container | `rounded-3xl` | `shadow-2xl` / `shadow-xl` |
| Dropdowns | `rounded-2xl` (workspace menu `rounded-lg`) | `shadow-xl` (`shadow-lg`) |
| Avatars/toggles/dots | `rounded-full` | avatars carry `ring-2 ring-brand-500/30` |

Layout: sidebar `w-64`; header `h-16`; `<main>` padding `p-4 sm:p-6 lg:p-8`; section gaps `space-y-6`; grid gaps `gap-4` (KPI) / `gap-6` (panels). Scrollbars: 6px, transparent track, thumb `rgba(156,163,175,.4)` (hover `.6`), fully rounded.

### 4.5 Status badges (fix X14)
`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize`

| Status | Light | Dark | Filter-pill active |
|---|---|---|---|
| confirmed | `bg-emerald-100 text-emerald-700` | `bg-emerald-950 text-emerald-300` | `bg-emerald-600 text-white` |
| pending | `bg-amber-100 text-amber-700` | `bg-amber-950 text-amber-300` | `bg-amber-600` |
| cancelled | `bg-rose-100 text-rose-700` | `bg-rose-950 text-rose-300` | `bg-rose-600` |
| completed [R] | `bg-blue-100 text-blue-700` | `bg-blue-950 text-blue-300` | `bg-blue-600` |
| rescheduled [R] | `bg-violet-100 text-violet-700` | `bg-violet-950 text-violet-300` | `bg-violet-600` |
| All (pill) | n/a | n/a | `bg-brand-600 text-white` |

Inactive pill: `bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800`.

### 4.6 Motion [D]
- Buttons `transition` (150ms); "New Appointment" adds `active:scale-95`.
- Sidebar (mobile): `transition-transform duration-300`.
- Toggles: `duration-200 ease-in-out`.
- Overlays, dropdowns, screens: fade + scale-95→100 (Alpine default). Implement with `@starting-style`/CSS transitions or `framer-motion` if already a dependency; otherwise CSS only.
- Respect `prefers-reduced-motion` [P].

### 4.7 Icon mapping (FA → Lucide) [R]

| Usage | FA (demo) | Lucide |
|---|---|---|
| Logo | `fa-clock` | `Clock` (in 36px gradient tile `from-brand-600 to-indigo-400`, `shadow-md shadow-brand-500/20`) |
| Dashboard | `fa-chart-line` | `LineChart` |
| Calendar | `fa-calendar-days` | `CalendarDays` |
| Appointments | `fa-clock` (regular) | `Clock` |
| Event Types | `fa-layer-group` | `Layers` |
| Availability | `fa-calendar-check` | `CalendarCheck` |
| Clients CRM | `fa-users` | `Users` |
| Reports | `fa-chart-pie` | `PieChart` |
| Billing | `fa-credit-card` | `CreditCard` |
| Analytics [X15] | (dup) | `BarChart3` |
| Settings | `fa-gear` | `Settings` |
| Search / Bell / Sun / Moon | magnifying-glass / bell / sun / moon | `Search` / `Bell` / `Sun` / `Moon` |
| Plus / Close / Chevrons / Menu | plus / xmark / chevron-* / bars | `Plus` / `X` / `ChevronDown|Left|Right` / `Menu` |
| Video / Phone / Mail | video / phone / envelope | `Video` / `Phone` / `Mail` |
| Copy / Ban / Globe / External | copy / ban / globe / arrow-up-right-from-square | `Copy` / `Ban` / `Globe` / `ExternalLink` |
| Trash / Earth | trash-can / earth-americas | `Trash2` / `Globe2` |
| Check circle (toast) / Check | circle-check / check | `CheckCircle2` / `Check` |
| Empty calendar / folder / users | calendar-xmark / folder-open / users | `CalendarX` / `FolderOpen` / `Users` |
| Notification types | calendar-plus / dollar-sign | `CalendarPlus` / `DollarSign` |
| Profile / Sliders / Sign out | user / sliders / right-from-bracket | `User` / `SlidersHorizontal` / `LogOut` |
| Google / Zoom | brands google / video | inline brand SVGs (Lucide has no brand icons) |

---

## 5. App shell and navigation

### 5.1 Structure [D]
`AppShell` = flex row, `h-screen overflow-hidden`: `Sidebar` (w-64) + column (`Topbar` h-16 + scrolling `<main>`).

**Sidebar** (`fixed inset-y-0 left-0 z-40` below `md`, `static` from `md`; translate `-100%`→`0` when open):
1. Brand row: 36px gradient tile + "Chronos" (`font-bold text-base tracking-tight`) + "Pro Workspace" (`text-xs slate-500`); close `X` button visible `< md`.
2. Workspace switcher pill: green dot + active workspace name (truncate) + chevron; dropdown: label "WORKSPACES" (`text-[10px] uppercase tracking-wider`), workspace list (active = semibold), divider, "＋ New Workspace" (brand colour). Closes on outside click.
3. Nav (`flex-1 overflow-y-auto`, `space-y-1`): 10 items, each `px-3 py-2.5 rounded-lg text-sm`; active = `bg-brand-50 text-brand-700 font-semibold` / dark `bg-brand-500/15 text-brand-300`; inactive hover fills; icon `w-5` centred, active icon `brand-600/400`; optional right badge pill (`px-2 py-0.5 text-xs rounded-full font-bold`, default `bg-brand-100 text-brand-700` / dark `bg-brand-900/50 text-brand-300`).
4. Footer (`border-t p-3 space-y-2`): "Public Booking Page / Preview live client view" gradient card (`from-brand-500/10 to-indigo-500/10`, `border-brand-500/20`) linking to the **real** public page in a new tab (was in-app simulation), then (**remove** the Demo Empty States switch, X-note in 2.2).

Mobile overlay: `fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm md:hidden`; clicking a nav item closes the sidebar.

**Nav items (order fixed) [D]**
| Order | Label | Route | Badge |
|---|---|---|---|
| 1 | Dashboard | `/dashboard` | |
| 2 | Calendar | `/calendar` | |
| 3 | Appointments | `/appointments` | pending count (hide when 0) |
| 4 | Event Types | `/event-types` | |
| 5 | Availability | `/availability` | |
| 6 | Clients CRM | `/clients` | |
| 7 | Reports | `/reports` | "New" (`bg-brand-100…` default) |
| 8 | Billing | `/billing` | |
| 9 | Analytics | `/analytics` | |
| 10 | Settings | `/settings` | |

**Topbar [D]** (`h-16`, `px-4 sm:px-6`, bottom border):
- Left: hamburger (`< md`, bordered `p-1.5 rounded-lg`), page title = active nav label.
- Centre (`hidden md:flex max-w-md w-full`): search trigger button, placeholder "Search appointments, clients, event types...", `⌘K` kbd (show `Ctrl K` on non-Mac).
- Right: **New Appointment** (brand primary, label hidden `< sm`, icon only), Notifications bell (dot `w-2.5 h-2.5 bg-brand-500 ring-2 ring-white dark:ring-slate-900` when unread > 0), theme toggle (moon in light, amber sun in dark), avatar dropdown (w-56: name + email header, Profile Settings, Preferences → `/settings`, divider, Sign Out in rose).

### 5.2 Route map and guards [P]
```
(public)   /login  /signup  /forgot-password
(public)   /[handle]                    -> event-type list (step 1)
(public)   /[handle]/[eventSlug]        -> date/time -> details -> confirmation (steps 2-4)
(public)   /booking/[token]             -> manage booking (view / cancel / reschedule) via signed token
(app)      /dashboard /calendar /appointments /event-types /availability
           /clients /clients/[id] /reports /analytics /billing
           /settings/[profile|integrations|notifications|branding|security|billing]
```
`(app)` group is wrapped by `AppShell` and an auth guard (middleware checks the session cookie; unauthenticated → `/login?next=`). Reserved handles that must be rejected at slug creation: `login, signup, dashboard, calendar, appointments, event-types, availability, clients, reports, analytics, billing, settings, api, booking, book, _next, static` [P].

---

## 6. Screen specifications

Each screen lists: layout [D], data, interactions, states, acceptance.

### 6.1 Dashboard — `/dashboard`

**Header row** (`flex-col sm:flex-row justify-between gap-4`):
- H2 "Good morning, {firstName} 👋" (greeting by local hour: morning < 12, afternoon < 17, evening; the demo only shows morning [I]); sub "Here's your appointment schedule and performance overview for today."
- Buttons (white/`slate-900` bordered `rounded-xl text-xs font-semibold shadow-sm`): **Share Booking Link** (`Copy`, brand-500 icon) copies `https://{host}/{handle}`; **Block Out Time** (`Ban`, amber-500 icon) opens `BlockTimeModal` (fixes X8).

**KPI grid** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`. Card: `p-5 rounded-2xl border shadow-sm hover:shadow-md`; top row label + 36px icon tile; value row (value + trend); footnote `text-[11px] slate-400`.

| KPI | Icon tile colour | Value | Trend | Footnote (all API-computed, X17) |
|---|---|---|---|---|
| Total Appointments | brand | count this month | % vs previous month (emerald up-arrow; rose down-arrow if negative) | "vs. {prev} last month" |
| Upcoming Today | indigo | count today | "{n} hours busy" | "Next at {time}" or "Nothing else today" |
| Estimated Value | emerald | sum price of paid bookings this month, `$` | % vs previous month | "{n} paid bookings" |
| Occupancy Rate | sky | booked minutes / available minutes, % | delta in percentage points | "Optimal schedule load" [I: threshold copy: 70–95 % optimal, < 70 % "Room for more bookings", > 95 % "Near capacity"] |

**Split grid** `grid-cols-1 lg:grid-cols-3 gap-6`:
- **Today's Schedule** (`lg:col-span-2`, card `p-5`): header (title, subtitle = full date e.g. "Wednesday, Oct 28, 2026" in workspace tz, link "Full Calendar →" to `/calendar`), list of `TimelineAppointmentCard`s (`space-y-3`).
  - Card: `p-4 rounded-xl border hover:border-brand-500/50 hover:shadow-md cursor-pointer`; left time tile (`p-2 bg-brand-50 dark:bg-slate-800 rounded-lg min-w-[60px]`, time bold uppercase, duration `{n}m`); name (`font-semibold text-sm`, turns brand on hover) + status badge; event type name; meta row (location icon + text, mail icon + email). Right: **Join Meeting** button (`bg-brand-50 text-brand-600 rounded-lg text-xs font-semibold`) opens the meeting URL in a new tab (was toast); chevron. Card click opens drawer; button uses `stopPropagation`.
  - **Bug fix:** the demo renders *all* appointments here, not just today's. Production shows today's non-cancelled only, sorted by start.
  - Empty: dashed panel (`border-2 border-dashed rounded-xl py-12 text-center`), 48px circle with `CalendarX`, "No appointments scheduled for today", "Share your booking page with clients to fill up your schedule.", primary button "＋ Add Appointment".
- **Right column** `space-y-6`:
  - **Booking Handle card**: `bg-gradient-to-br from-brand-600 to-indigo-700 text-white rounded-2xl shadow-md overflow-hidden`, decorative calendar glyph bottom-right (`text-9xl opacity-10 -right-4 -bottom-4`), title "Your Booking Handle", copy text, inset row (`bg-white/10 backdrop-blur border-white/20 rounded-xl`) with mono `chronos.app/{handle}` and white **Copy** button.
  - **Recent Activity**: title + list of `{coloured dot w-2 h-2 mt-1.5, message font-medium, relative time text-[10px]}`. Dot colours: brand = booking, emerald = availability/payment, sky = sync. Show latest 8; empty: "No recent activity".

**States:** skeleton (KPI values + rows as pulsing `bg-slate-200 dark:bg-slate-800 rounded` bars, same dimensions), error (inline card with retry), empty (above). Auto-refresh every 60 s and on window focus [R].

**Acceptance**
- [ ] Visual diff ≤ 2 % vs demo at 1280×800 dark and light with the seed data in Appendix A.
- [ ] Booking a slot on the public page makes the appointment appear here within 60 s without reload (or immediately via SSE if enabled).
- [ ] Zero-data workspace shows `0`, `$0`, `0%` and the empty timeline panel exactly as in the demo's empty mode.

### 6.2 Calendar — `/calendar`

**Control bar** (`bg-white dark:bg-slate-900 p-4 border rounded-2xl`, `flex-col md:flex-row`): `Today` button (`px-3 py-1.5 border rounded-xl text-xs font-bold`), prev/next chevrons, range title (`text-base font-bold`, e.g. "October 2026"; week view shows "Oct 26 – Nov 1, 2026"), segmented control **Month | Week | Day | Agenda** (`bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold`; active segment `bg-white dark:bg-slate-900 shadow-sm`). Default view **Week** [D].

**Body** `grid lg:grid-cols-4 gap-6`:
- Left column (`space-y-4`): **Mini calendar** (card `p-4`; header month + chevrons; weekday initials; day buttons `h-7 rounded-lg`; selected = `bg-brand-600 text-white font-bold`; today gets a ring [R]); **Event Types filter** card (uppercase title; checkbox rows with 10px coloured dot). Colours are per event type: brand, emerald, sky, then amber, rose, violet cycling [I]. Checkboxes hide/show events.
- Right (`lg:col-span-3`, card `p-4 overflow-x-auto min-h-[500px]`):
  - **Week** [D]: 7-column grid with `gap-px` on a `bg-slate-200 dark:bg-slate-800` container (this produces the hairline grid), header cells `bg-slate-50 dark:bg-slate-900 p-2 text-center text-xs font-bold` ("Mon 28"), body cells `min-h-[90px] p-1.5`, hour labels in `text-[10px] font-mono slate-400` turning brand on hover. Event chip: `mt-1 p-1.5 border-l-2 rounded text-xs`; colours by event type (`bg-brand-50 border-brand-500`, `bg-emerald-50 border-emerald-500`, dark `-950/80`); title line `font-bold truncate` "10:00 AM – Michael Vance", sub `text-[10px]` event type short name. [R] Replace the demo's 3-row fake grid with a real time-axis (08:00–20:00, 60 px/hour) and absolutely positioned chips sized by duration; keep the chip styling.
  - **Month** [D uses same grid]: [R] true 6×7 month grid; days show up to 3 chips + "+N more" popover.
  - **Day** [I]: single column time axis.
  - **Agenda** [D]: list; row `p-4 border rounded-xl hover:bg-slate-50`; left time block (`w-16` time `text-sm font-bold`, duration `{n} min`), divider, client name + event type; right **View Details** bordered button.
- Interactions: click empty cell → New Appointment modal prefilled with that date/time; click chip → drawer (`stopPropagation`); `Today` navigates and toasts nothing (remove demo toast); keyboard: `T` today, `←/→` prev/next, `M/W/D/A` view [P].
- Blocked time renders as hatched `bg-amber-500/10 border-l-2 border-amber-500` chips [P].
- Mobile (`< lg`): sidebar column stacks above; week view scrolls horizontally inside the card (`overflow-x-auto`, min column width 120 px).

**States:** loading skeleton grid; empty range → grid with a centred muted "No appointments in this range"; error retry banner.

**Acceptance**
- [ ] Navigating months/weeks fetches only the visible range (`from`/`to` in UTC, section 11).
- [ ] An appointment at 23:30 in America/Los_Angeles appears on the correct calendar day for a provider whose workspace tz is Asia/Kolkata (DST-safe; add unit test).

### 6.3 Appointments — `/appointments`

- Toolbar (`flex-col sm:flex-row justify-between gap-4`): search input (`max-w-md`, left search icon at `left-3.5 top-3`, placeholder "Filter by name, email, or service...", `pl-9 pr-4 py-2 rounded-xl`, focus `border-brand-500`), status pills (`overflow-x-auto`): All, Confirmed, Pending, Cancelled, Completed, Rescheduled.
- Table card (`rounded-2xl overflow-hidden shadow-sm`, inner `overflow-x-auto`): thead `bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold`; columns **Client** (32px avatar + name bold + email `text-[11px]`), **Event Type**, **Date & Time** (date bold + "10:00 AM (30m)"), **Location** (chip `bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1` + video icon), **Status** (badge), **Actions** (right, "Manage" bordered button). Rows `py-3.5 px-4`, `divide-y`, whole row clickable → drawer; Manage uses `stopPropagation`.
- Empty row: `colSpan=6`, `FolderOpen` icon 2xl, "No appointments match your filters."
- [P] Server-side pagination (default 25/page), sorting by date (default: upcoming ascending, then past descending), debounce 300 ms on search; filters and page persisted in the URL query (`?status=&q=&page=`).
- [P] Rows show date/time in the **workspace timezone** with a small tz abbreviation in the tooltip.
- Mobile: the table scrolls horizontally; `min-w-[720px]`.

**Acceptance:** search matches name, email, event type (demo matches name and event type only; email is required by the placeholder text [I]); filter counts equal API totals.

### 6.4 Event Types — `/event-types`

- Header: H3 "Event Types" + sub "Configure appointment types and booking links for your client base." + primary **＋ New Event Type**.
- Grid `md:grid-cols-2 lg:grid-cols-3 gap-6`. Card `p-5 rounded-2xl hover:shadow-md flex-col justify-between group`: duration pill (`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-600`, "30 Mins"), active toggle (`h-4 w-7`, on = `bg-emerald-500`), title (`font-bold text-base`, brand on hover), description (`line-clamp-2`), divider row (location icon + text; price `font-bold` or "Free"), footer: **Copy Link** bordered button (`/{handle}/{slug}`) and text button **Edit**.
- **Event Type modal** (create/edit; not in demo [X22], so reuse New Appointment modal styling, `max-w-lg`): fields below.

| Field | Control | Validation |
|---|---|---|
| Title | text | required, 2–80 chars |
| Slug | text, prefix `chronos.app/{handle}/` | required, `^[a-z0-9]+(?:-[a-z0-9]+)*$`, 3–60, unique per provider |
| Description | textarea | ≤ 500 chars |
| Duration | select 15/30/45/60/90/120 + custom | integer 5–480, multiple of 5 |
| Location type | select: Google Meet, Zoom Video, Phone Call, In person, Custom link | required; Meet requires Google integration, Zoom requires Zoom integration (inline helper linking to Settings) |
| Price | number `$` | ≥ 0, ≤ 10000, 2 dp; 0 = "Free" |
| Colour | swatch picker | one of the calendar colours |
| Active | toggle | default on |

  Edit modal adds a destructive "Delete event type" (blocked with explanation if future bookings exist; offer "Deactivate" instead) [P].
- Toggle change is optimistic with rollback + toast (`"{title} activated"` / `"{title} deactivated"`) [D].
- Empty: dashed panel "Create your first event type" + primary button [P].
- Inactive types are hidden from the public page but still bookable through existing links? **No**: inactive → public link shows "This event type is not available" [P].

### 6.5 Availability — `/availability` (container `max-w-4xl mx-auto`)

1. Header: H3 "Availability Schedules", sub "Set your weekly recurring hours and holiday overrides for client bookings.", **Save Changes** (brand). Button shows spinner while saving; disabled when form is pristine [P]. Toast "Availability settings saved".
2. **Timezone bar** (card `p-4 flex justify-between text-xs`): globe icon + "Active Timezone" + select. Options: full IANA list grouped by region, searchable; labels `"(GMT-04:00) America/New_York"` computed at runtime (fix X6). Demo's four values are the default shortlist. Default = browser zone at first setup.
3. **Weekly Hours** card (`p-5 space-y-4`, title with bottom border): per weekday (Monday first [D]) a row `flex-col sm:flex-row justify-between gap-3 py-2 border-b`: [toggle `h-5 w-9` on = `bg-brand-600`] + capitalised day name (`w-32`); centre: "Unavailable" italic muted when off, otherwise stacked slot rows (`<input type="time">` – `-` – `<input type="time">` + trash icon hover rose); right: "＋ Add Slot" link-button (new slot defaults to `09:00–17:00` [D]; [R] default to 1 h after the last slot's end).
4. Two cards `md:grid-cols-2 gap-4`: **Buffer Time** (options 0/5/10/15/30/45/60 minutes before/after; default demo option order: 15, 30, No buffer) and **Minimum Booking Notice** (options: 1 h, 2 h, 4 h, 12 h, 24 h, 48 h, 7 days; demo lists 4/24/48 h). [R] Superset of the demo options with the demo's order kept for the ones it shows.
5. [P] **Date overrides** card ("holiday overrides" is promised in the copy): list of dates with either "Unavailable" or custom hours; "＋ Add override" opens a small modal with a date range picker.
6. [P] Booking window: "Book up to N days ahead" (default 60).

**Validation:** `start < end` (same day, 15-minute granularity); slots on the same day must not overlap (inline rose error `text-[11px]` under the row and Save disabled); at least one active day, else warning banner "Clients won't be able to book you". Changing the timezone shows a confirm dialog: "Your hours will now be interpreted in {tz}. Existing appointments are not moved."

**Persistence:** PUT `/availability` replaces rules atomically; the API regenerates future `Slot` rows (section 12.3). Slots already `BOOKED` are never deleted.

### 6.6 Clients CRM — `/clients` and `/clients/[id]`

- Header: H3 "Clients Directory" + sub "View and manage contact profiles, booking history, and revenues." + search (`w-full sm:w-72`, placeholder "Search clients...", matches name, company, email).
- Card grid `md:grid-cols-2 lg:grid-cols-3 gap-6`. Card `p-5 rounded-2xl hover:shadow-md cursor-pointer group`: 48px avatar (`ring-2 ring-slate-100 dark:ring-slate-800`) + name (brand on hover) + company; contact lines (`Mail`, `Phone`, `w-4` icons, `text-xs`); footer `border-t pt-3`: **BOOKINGS** count (label `text-[10px] uppercase`), **TOTAL SPENT** (`text-emerald-600 dark:text-emerald-400`, `$`), "Profile" button (`bg-slate-100 dark:bg-slate-800 rounded-lg`).
- Empty: `col-span-full` dashed panel, `Users` icon 3xl, "No clients found."
- [P] Client detail (`/clients/[id]`, or right-hand drawer with the same chrome as the appointment drawer): header (avatar, name, company), contact, notes (editable), booking history table, lifetime value, tags. Clients are auto-created/updated on booking by email (case-insensitive unique per workspace).
- [P] Pagination (24/page), sort by last booking desc. [P] "Export CSV".
- Avatars: uploaded image else initials on `bg-brand-100 text-brand-700` circle.

### 6.7 Public booking — `/[handle]/[eventSlug]` (see 7)

### 6.8 Settings — `/settings/[tab]` (container `max-w-4xl mx-auto`)

Tab strip: `flex gap-2 border-b pb-3`; each tab `px-3 py-1.5 border-b-2 text-xs`; active `border-brand-600 text-brand-600 dark:text-brand-400 font-bold`, inactive `border-transparent text-slate-500`. On mobile the strip scrolls horizontally [P]. Tab is in the URL.

| Tab | Status in demo | Content |
|---|---|---|
| Account Profile | built [D] | 64px avatar (`ring-2 ring-brand-500`) + **Change Photo** (JPG/GIF/PNG, 1 MB max, [P] cropped square); Full Name; Email; **Custom Booking Slug** (joined input: prefix segment `bg-slate-100 border-r-0 rounded-l-xl` "chronos.app/", input `rounded-r-xl`); **Save Profile**. Grid `sm:grid-cols-2 gap-4`. |
| Integrations | built [D] | Rows (`p-5 rounded-2xl flex justify-between`): Google Calendar (red Google mark; "Sync appointments and check for double bookings in real time."; **Connected** emerald pill / **Connect** button), Zoom ("Automatically generate unique Zoom meeting links for new bookings."; **Connect**). Connected rows get a "Disconnect" text button and last-sync time [P]. |
| Notifications | empty [X19] | [P] Matrix: events (new booking, cancellation, reschedule, reminder, payment) × channels (email, in-app); reminder offsets (24 h, 1 h) for client and provider. |
| Branding | empty | [P] logo, accent colour (limited to the brand-500 palette), public page headline/tagline (the demo public header shows the title "Senior Strategy Consultant & Technical Advisor"), remove-badge for paid plans. |
| Security | empty | [P] change password, active sessions, 2FA (TOTP), delete account. |
| Billing | empty | [P] plan, invoices, payment method (Stripe customer portal). Also reachable as `/billing`; `/billing` is the full page, the tab deep-links to it. |

Slug validation: same regex as event slugs, 3–30 chars, uniqueness checked with debounced `GET /handles/{slug}/availability` (green check / rose message), reserved list in 5.2. Changing the slug warns that old links stop working (keep a 90-day redirect) [P].

### 6.9 Reports — `/reports` and Analytics — `/analytics` [P]
Not designed in the demo. Constraints: reuse KPI card, panel card, segmented control and table styles verbatim.
- **Reports** (badge "New"): date-range segmented control (7d/30d/90d/12m/Custom), tables: bookings by event type, revenue by event type, cancellations by reason, client retention; **Export CSV**.
- **Analytics:** line/bar charts (Recharts, styled with brand-500/emerald-500/sky-500, gridlines `slate-200/800`, no chart borders): booking volume, conversion (page views → bookings), peak hours heatmap, occupancy trend.
- Until built, render `ComingSoon` (uses the empty-state dashed panel with `PieChart`/`BarChart3` icon, "This report is coming soon.") — never a 404 [P].

### 6.10 Billing — `/billing` [P]
Plan card (`brand` gradient like the Booking Handle card), usage meters (bookings/month), invoice table (table style of 6.3), "Manage payment method" → Stripe Customer Portal.

---

## 7. Public booking flow (`/[handle]/[eventSlug]`) [D]

Container: `max-w-3xl mx-auto`, card `rounded-3xl shadow-xl overflow-hidden`. Page uses its own layout: no sidebar/topbar; centered on `bg-slate-50 dark:bg-slate-950`; theme follows OS by default, provider branding can override the accent [P].

**Header** `bg-gradient-to-r from-brand-600 to-indigo-700 p-6 text-white text-center`: 64px avatar (`ring-4 ring-white/30 shadow-md`), name `text-xl font-bold`, headline `text-xs text-brand-100`.

| Step | Route state | Content [D] |
|---|---|---|
| 1 | `/[handle]` | "SELECT A MEETING TYPE" (`text-sm font-bold uppercase tracking-wider text-center`); one card per **active** event type: `p-4 border rounded-2xl hover:border-brand-500 hover:bg-brand-50/30`, title (brand on hover) + duration chip (`px-2 py-0.5 text-[10px] bg-slate-100 rounded-md`, "30 min"), description, right: price or "Free", chevron. |
| 2 | `/[handle]/[slug]` | Top bar: "← Back" (brand, `text-xs font-semibold`) + event title. Two columns (`md:grid-cols-2 gap-6`): **1. Select Date** (bordered month calendar `p-3 rounded-2xl`, month title centred, day buttons `h-8 rounded-lg`, selected `bg-brand-600 text-white font-bold`) and **2. Select Time ({tz})** (`space-y-2 max-h-64 overflow-y-auto pr-1`; each slot a full-width `py-2 rounded-xl text-xs` button, selected = `bg-brand-600 text-white font-bold`, else bordered with `hover:border-brand-500`). Choosing a time advances to step 3. |
| 3 | `?step=details` | Top bar: "← Change Date/Time" + "{date} at {time}". Form `space-y-4 text-xs`: **Your Full Name** (required, placeholder "e.g. Eleanor Vance"), **Email Address** (required, "eleanor@example.com"), **Phone Number** (optional, "+1 (555) 000-0000"), **Notes / What would you like to discuss?** (textarea `rows=3`, "Brief details about your project or topics..."), full-width submit "Confirm & Book Appointment" (`py-3 bg-brand-600 rounded-xl font-bold shadow-md shadow-brand-500/20`). Inputs `p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:border-brand-500`. |
| 4 | `/booking/[token]?confirmed=1` | `p-8 text-center`: 64px emerald circle with check, "Appointment Confirmed!", "A calendar invitation and confirmation email have been sent to your inbox.", summary panel (`bg-slate-50 dark:bg-slate-800/60 rounded-2xl max-w-sm text-left`) rows Meeting / Date & Time / Location (brand bold; copy "Google Meet (Link sent)"), buttons **Add to Google Calendar** (`bg-slate-900 dark:bg-slate-100` inverse) and **Book Another**. |

**Production additions [P]**
- **Timezone selector** in step 2, defaults to `Intl.DateTimeFormat().resolvedOptions().timeZone`; the slot list header reads "Select Time (Eastern Time, EDT)"; changing it refetches/relabels slots without changing the selected instant.
- Date picker: past days, days beyond the booking window, and days with zero slots are disabled (`opacity-40 cursor-not-allowed`), days with slots show a small brand dot; month navigation.
- Slot state: loading skeleton (5 pulsing `py-2 rounded-xl` bars); empty: "No times available on this day. Try another date."; error: `AvailabilityError` with Retry (existing component).
- Slot taken race: on submit conflict (`409 SLOT_TAKEN`) show inline rose banner "That time was just booked. Please pick another." and return to step 2 with the list refreshed, keeping the form data.
- Paid event types: after step 3, step "Payment" (Stripe Elements) before confirmation; price line in summary.
- Add-to-calendar: Google link, and `.ics` download; confirmation email attaches `.ics` (with `METHOD:REQUEST`).
- Manage link in the email → `/booking/[token]`: view details, **Reschedule** (reopens step 2 with slot swap in one transaction), **Cancel**.
- Honeypot field + rate limit (section 18).
- Accessibility: steps announced with `aria-live="polite"`; focus moves to the step heading on change.

---

## 8. Overlays

### 8.1 Command palette [D]+[P]
`fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/60 backdrop-blur-sm`; panel `max-w-xl rounded-2xl shadow-2xl`. Input row (`p-4 border-b`, search icon, borderless input "Type a command or search appointments..."). Groups: **Quick Actions** (label `text-[10px] font-bold uppercase slate-400`): "Create New Appointment" `N`, "Manage Availability Schedule" `A` [D]; [P] additional: Go to Dashboard `G D`, Calendar `G C`, Toggle theme, Copy booking link. When text is typed, add groups **Appointments**, **Clients**, **Event Types** (top 5 each from `GET /search?q=`), arrow keys move an active row (`bg-slate-100 dark:bg-slate-800`), Enter runs it. Open with ⌘K / Ctrl+K, `/` when not typing; Esc or outside click closes. Focus trap; return focus to trigger.

### 8.2 Appointment drawer [D]
Right drawer, `max-w-md`, `border-l shadow-2xl p-6`, backdrop click closes, slide-in 200 ms [R]. Sections:
1. Header: status badge + client name (`text-lg font-bold`) + close `X`.
2. Summary panel (`p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl`, rows label slate-400 / value bold): Meeting Type, Date & Time, Duration ("30 minutes").
3. **Contact Details:** Email (`mailto:`), [P] phone.
4. **Client Notes:** italic panel; fallback "No custom notes provided."
5. Footer (`pt-4 border-t space-y-2`): **Join Video Call** (brand, full width; opens meeting URL; if none/phone → "Call {phone}" or disabled with "No meeting link") ; **Cancel Appointment** (rose outline).
- **Cancel flow [P, fixes X18]:** confirm dialog (same modal chrome) "Cancel this appointment?", optional reason textarea, checkbox "Notify client" (default on); on success: status → cancelled, slot released, toast "Appointment cancelled", drawer closes.
- [P] Extra actions: **Reschedule** (opens slot picker), **Mark completed** (past confirmed), copy meeting link, activity timeline.
- Deep-linkable: `?appointment={id}` opens the drawer on any list screen.

### 8.3 New Appointment modal [D]
Backdrop centred, `max-w-md rounded-3xl p-6 space-y-4 shadow-2xl`; header "Create New Appointment" + `X`; fields (`text-xs`, inputs `p-2 rounded-xl`): Client Name*, Client Email*, Date*, Time* (2-column row `grid-cols-2 gap-2`), [P, fixes X11] Event Type select (prefills duration/location), Notes; submit **Schedule Appointment** (`py-2.5 bg-brand-600 rounded-xl font-bold mt-2 shadow-md`). Date/time are interpreted in the workspace timezone. Validation: not in the past (admin may override with a confirm), no overlap with confirmed appointments/blocks (409 → inline error naming the conflict), valid email. Toast "Appointment created!".

### 8.4 Block Out Time modal [P, fixes X8]
Fields: Title (optional, default "Blocked"), Date range, All-day toggle, Start/End time, Repeat (none/daily/weekly). Creates a `TimeBlock`; overlapping **existing bookings are listed** and the user must confirm to proceed (bookings are not auto-cancelled). Toast "Time blocked on calendar".

### 8.5 Notifications dropdown [D]
`w-80 sm:w-96 rounded-2xl shadow-xl py-2`; header "Notifications" + "Mark all read" (`text-xs text-brand-600 hover:underline`); scroll list `max-h-72` with `divide-y`; item `p-3 flex gap-3`, unread bg `bg-brand-50/50 dark:bg-brand-950/20`; 32px round icon (default `bg-brand-100 text-brand-600`, payment = emerald), title `font-medium`, description, relative time. Toast "All notifications marked as read". Empty: "You're all caught up" [P]. Clicking an item marks it read and navigates (booking → drawer). Real-time delivery: SSE `/notifications/stream` [R].

### 8.6 Toasts [D]
`fixed bottom-5 right-5 z-50 space-y-2`; each `px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold flex gap-3`, **inverse colours** (`bg-slate-900 text-white` light theme, `bg-slate-100 text-slate-900` dark theme), leading `CheckCircle2` (`text-emerald-400` light / `text-emerald-600` dark); auto-dismiss 3.5 s. [P] Error variant: rose icon, 6 s, and `role="alert"`; success uses `role="status"`. Max 3 stacked.

### 8.7 Dropdowns
Workspace, notifications, user menus close on outside click and Esc; arrow-key navigation [P].

---

## 9. Frontend architecture

### 9.1 Stack [R unless noted]
Next.js 16.3 App Router, React, TypeScript strict, Tailwind v4 (**[D]** classes), `lucide-react`, Inter. Add: **TanStack Query** (server state), **Zustand** (tiny UI store), **React Hook Form + Zod** (forms/validation; Zod schemas live in `packages/contracts` and are shared with the API), **date-fns + date-fns-tz** or the existing `packages/time` (prefer the latter if it exposes tz conversion), **Recharts** (analytics), **Radix UI primitives** (Dialog, DropdownMenu, Popover, Switch, Tabs, Toast) restyled with the classes in section 4 so a11y is correct by default, `cmdk` for the palette.

### 9.2 Folder structure
```
apps/web/src/
  app/
    (public)/[handle]/page.tsx                 # step 1
    (public)/[handle]/[eventSlug]/page.tsx     # steps 2-4
    (public)/booking/[token]/page.tsx
    (auth)/login|signup|forgot-password
    (app)/layout.tsx                           # AppShell + auth guard
    (app)/dashboard|calendar|appointments|event-types|availability|clients|reports|analytics|billing|settings/...
    layout.tsx  globals.css  not-found.tsx  error.tsx
  components/
    shell/      AppShell Sidebar Topbar WorkspaceSwitcher NavItem MobileOverlay
    ui/         Button Card Input Select Textarea Switch Badge StatusBadge Avatar Kbd
                Modal Drawer Dropdown Toast Tabs SegmentedControl EmptyState Skeleton
                DataTable Pagination FormField
    dashboard/  KpiCard TimelineAppointmentCard BookingHandleCard ActivityFeed
    calendar/   CalendarToolbar MiniCalendar EventTypeFilter WeekGrid MonthGrid DayGrid AgendaList EventChip
    appointments/ AppointmentFilters AppointmentsTable AppointmentDrawer NewAppointmentModal CancelDialog
    event-types/ EventTypeCard EventTypeModal
    availability/ TimezoneBar WeeklyHours DayRow TimeSlotRow BufferCard NoticeCard OverridesCard
    clients/    ClientCard ClientDrawer
    booking/    BookingHeader EventTypeList DatePicker SlotList DetailsForm Confirmation TimezoneSelect
    overlays/   CommandPalette NotificationsMenu BlockTimeModal
  lib/  api.ts (fetch wrapper) query-keys.ts format.ts (all date/currency formatting) cn.ts
  hooks/ useAppointments useEventTypes useAvailability useClients useNotifications useTheme useHotkeys ...
  stores/ ui.store.ts (sidebar, palette, drawer id)
```
Existing components (`EmptyState`, `SkeletonRow`, `AvailabilityError`, `EmptyAvailability`, `TimeDisplay`, `BookingConfirmation`, `BookingSuccess`, `PageShell`) are **kept and restyled** to the specs above; do not maintain two versions.

### 9.3 State management
| State | Where |
|---|---|
| Server data (appointments, event types, clients, availability, notifications, KPIs) | TanStack Query; keys `['appointments', filters]`, etc.; invalidation on mutations |
| Sidebar open, palette open, selected appointment id (also in URL), theme | Zustand + URL/localStorage |
| Forms | React Hook Form |
| Public booking wizard | URL + a small reducer (`step`, `eventType`, `selectedInstantUtc`, `timezone`, `form`) persisted in `sessionStorage` so refresh keeps progress |
| Filters/search/page | URL search params |

Demo state → production mapping: `currentTab`→route; `darkMode`→`useTheme`; `mobileSidebarOpen`/`searchOpen`/`appointmentDrawerOpen`→ui store; `toasts`→Toast provider; `emptyStateMode`→**removed**; `calendarView`→`?view=`; `settingsTab`→route; `publicBookingStep`→route/reducer.

### 9.4 Theme
`useTheme` stores `light|dark|system` in `localStorage("chronos-theme")`; default `dark` for authenticated app [D]; an inline script in `<head>` sets `class="dark"` before hydration to avoid flash; the header toggle switches light↔dark only (system is exposed in Settings › Preferences) [P].

### 9.5 API client
`lib/api.ts` (`apiFetch`, already exists): base `NEXT_PUBLIC_API_URL`; credentials `include`; JSON; parses the error envelope (section 11.1) into `ApiError {status, code, message, fieldErrors}`; 401 → redirect to login; retries GET twice with backoff. Types come from `packages/contracts` (single source of truth; see 11.4).

---

## 10. Domain model and database

Prisma is the only DB access layer (remove the raw `pg` Pool in `availability.controller.ts`, resolving the open question in PROJECT_CONTEXT). Postgres 16. All instants `timestamptz` (UTC). Existing models named in PROJECT_CONTEXT: `Provider`, `AvailabilityRule`, `Slot`, `Booking`, `Client`, `EventType`, `ReminderJob`; reconcile below.

| Entity | Key fields (target) | Notes |
|---|---|---|
| **User** [P] | id, email (citext unique), passwordHash?, name, avatarUrl, locale, timezone, createdAt | login identity |
| **Workspace** [D/I] | id, name, plan (`free|pro|team`), timezone (IANA), createdAt | switcher; "Acme Advisory Team", "Personal Booking" |
| **WorkspaceMember** [I] | workspaceId, userId, role (`owner|admin|member`) | |
| **Provider** (existing) | id, workspaceId, userId, handle (unique, citext), displayName, headline, avatarUrl, brandColor?, timezone, bufferBeforeMin, bufferAfterMin, minNoticeMin, bookingWindowDays | headline = "Senior Strategy Consultant & Technical Advisor" |
| **EventType** (existing) | id, providerId, slug (unique per provider), title, description, durationMin, priceCents, currency, locationType (`GOOGLE_MEET|ZOOM|PHONE|IN_PERSON|CUSTOM`), locationValue?, color, active, position, createdAt | price stored in cents, shown as `$50` / "Free" |
| **AvailabilityRule** (existing) | id, providerId, weekday 0-6, startMinute, endMinute | many per weekday (multi-slot) |
| **AvailabilityOverride** [P] | id, providerId, date, kind (`UNAVAILABLE|CUSTOM`), startMinute?, endMinute? | holiday overrides |
| **TimeBlock** [P] | id, providerId, startsAt, endsAt, title, recurrence? | Block Out Time |
| **Slot** (existing) | id, providerId, startsAt, endsAt, status (`OPEN|HELD|BOOKED|BLOCKED`), version | compare-and-set target; unique (providerId, startsAt) |
| **Client** (existing) | id, workspaceId, name, email (citext), phone, company, notes, tags[], avatarUrl?, createdAt; unique (workspaceId, email) | `totalBookings`, `totalSpent` are **computed** aggregates, not columns |
| **Booking** (existing) | id, providerId, eventTypeId, clientId, slotId, startsAt, endsAt, guestTimezone, status (`PENDING|CONFIRMED|CANCELLED|COMPLETED|RESCHEDULED`), locationSnapshot (type+url), notes, priceCents, paymentStatus (`NONE|REQUIRED|PAID|REFUNDED`), cancelReason?, cancelledBy?, rescheduledFromId?, manageTokenHash, externalEventId?, createdAt, updatedAt | statuses = the 5 demo filters; snapshot fields keep history stable when event types are edited |
| **Notification** [D/P] | id, userId, type, title, body, entityType, entityId, readAt?, createdAt | dropdown |
| **ActivityLog** [D/P] | id, workspaceId, actorId?, type, message, entityId?, createdAt | "Recent Activity"; colour derived from type |
| **Integration** [D/P] | id, workspaceId/userId, provider (`GOOGLE|ZOOM`), status, accessToken (encrypted), refreshToken (encrypted), scopes, expiresAt, lastSyncAt, externalAccountId | |
| **ReminderJob** (existing) | id, bookingId, kind (`24H|1H|CUSTOM`), runAt, status, attempts | |
| **Payment** [P] | id, bookingId, provider (`STRIPE`), intentId, amountCents, status | |
| **Session/AuditLog** [P] | standard | security tab |

Indexes: `Booking(providerId, startsAt)`, `Booking(clientId)`, `Booking(status, startsAt)`, `Slot(providerId, startsAt, status)`, `Client(workspaceId, lower(email))`, trigram GIN on `Client.name`, `Booking` search columns if the search endpoint needs it. Exclusion constraint (`btree_gist`) on `Slot`/`Booking` to make overlap impossible at the DB level: `EXCLUDE USING gist (providerId WITH =, tstzrange(startsAt, endsAt) WITH &&) WHERE status IN ('CONFIRMED','PENDING')` [R].

---

## 11. API contract

### 11.1 Conventions
Base `/api/v1`. JSON. Auth by httpOnly `SameSite=Lax` session cookie (or `Authorization: Bearer` for tokens). Dates: ISO-8601 UTC (`2026-10-28T14:00:00.000Z`) + separate `timezone` IANA where relevant. Money: integer cents. IDs: UUID/cuid strings (demo integers are illustrative).
Pagination: `?page=1&pageSize=25` → `{ data: [], meta: { page, pageSize, total } }`.
Errors (uniform):
```json
{ "error": { "code": "SLOT_TAKEN", "message": "That time was just booked.", "fieldErrors": { "email": ["Invalid email"] }, "requestId": "..." } }
```
Codes: `VALIDATION_FAILED 400`, `UNAUTHENTICATED 401`, `FORBIDDEN 403`, `NOT_FOUND 404`, `SLOT_TAKEN 409`, `CONFLICT 409`, `RATE_LIMITED 429`, `INTERNAL 500`.

### 11.2 Endpoints

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/auth/signup` `/auth/login` `/auth/logout` `/auth/forgot` `/auth/reset` | session mgmt | public |
| GET | `/me` | user + workspaces + active workspace | user |
| PATCH | `/me` | profile (name, email, avatar) | user |
| GET/POST | `/workspaces` · POST `/workspaces/{id}/switch` | switcher | user |
| GET | `/dashboard/summary?tz=` | KPIs, next appointment, occupancy | user |
| GET | `/dashboard/today` | today's non-cancelled appointments | user |
| GET | `/activity?limit=8` | recent activity | user |
| GET | `/appointments?status&q&from&to&page&pageSize&sort` | list | user |
| GET | `/appointments/{id}` | detail | user |
| POST | `/appointments` | manual create | user |
| PATCH | `/appointments/{id}` | notes, status→completed | user |
| POST | `/appointments/{id}/cancel` `{reason, notifyClient}` | cancel + release slot | user |
| POST | `/appointments/{id}/reschedule` `{newStartsAt}` | atomic move | user |
| GET | `/calendar?from&to&eventTypeIds` | events + blocks in range | user |
| GET/POST | `/event-types` · PATCH/DELETE `/event-types/{id}` | CRUD; PATCH accepts `{active}` | user |
| GET/PUT | `/availability` | weekly rules + tz + buffer + notice + window | user |
| GET/POST/DELETE | `/availability/overrides` | date overrides | user |
| GET/POST/DELETE | `/time-blocks` | Block Out Time | user |
| GET | `/clients?q&page` · GET/PATCH `/clients/{id}` | CRM | user |
| GET | `/clients/{id}/appointments` | history | user |
| GET | `/notifications` · POST `/notifications/read-all` · POST `/notifications/{id}/read` · GET `/notifications/stream` (SSE) | | user |
| GET | `/search?q=` | palette (appointments, clients, event types) | user |
| GET | `/integrations` · POST `/integrations/{provider}/connect` · DELETE `/integrations/{provider}` · GET `/integrations/google/callback` | OAuth | user |
| GET | `/handles/{slug}/availability` | slug check | user |
| POST | `/uploads/avatar` (signed URL) | avatar | user |
| GET | `/reports/*`, `/analytics/*` | phase 3 | user |
| GET/POST | `/billing/*` (`/billing/portal`, `/billing/invoices`) + `POST /webhooks/stripe` | phase 3 | user / signed |
| GET | `/public/providers/{handle}` | profile + active event types | public |
| GET | `/public/providers/{handle}/event-types/{slug}/slots?from&to&tz` | available instants | public |
| POST | `/public/bookings` | create booking | public (rate-limited, idempotent) |
| GET | `/public/bookings/{token}` · POST `.../cancel` · POST `.../reschedule` | manage link | token |
| GET | `/public/bookings/{token}/ics` | calendar file | token |
| GET | `/health` `/ready` | infra | public |

### 11.3 Key payloads

`GET /public/providers/dr-sarah/event-types/strategy-30/slots?from=2026-10-01&to=2026-10-31&tz=America/New_York`
```json
{ "timezone": "America/New_York",
  "days": [ { "date": "2026-10-28", "slots": [ { "startsAt": "2026-10-28T13:00:00.000Z", "endsAt": "2026-10-28T13:30:00.000Z", "slotId": "slt_..." } ] } ] }
```
`POST /public/bookings` (header `Idempotency-Key`)
```json
{ "handle": "dr-sarah", "eventTypeSlug": "strategy-30", "slotId": "slt_...", "startsAt": "2026-10-28T13:00:00.000Z",
  "guestTimezone": "America/New_York",
  "client": { "name": "Eleanor Vance", "email": "eleanor@example.com", "phone": "+15550000000" },
  "notes": "…", "website": "" }
```
→ `201 { "bookingId":"...", "manageToken":"...", "status":"CONFIRMED", "startsAt":"...", "location": { "type":"GOOGLE_MEET", "url":"..." } }`; `409 SLOT_TAKEN`; `422` validation.

`GET /dashboard/summary` →
```json
{ "totalAppointments": { "value": 142, "previous": 124, "changePct": 14.2 },
  "today": { "count": 2, "busyMinutes": 240, "nextStartsAt": "2026-10-28T14:00:00.000Z" },
  "estimatedValue": { "cents": 485000, "previousCents": 395918, "changePct": 22.5, "paidBookings": 30 },
  "occupancy": { "pct": 88, "deltaPoints": 5 } }
```
`PUT /availability`
```json
{ "timezone":"America/New_York", "bufferBeforeMin":15, "bufferAfterMin":15, "minNoticeMin":240, "bookingWindowDays":60,
  "weekly": { "monday":[{"start":"09:00","end":"17:00"}], "saturday":[] } }
```

### 11.4 Contract source of truth
`packages/contracts` holds Zod schemas + inferred TS types for every request/response above; the API validates with them (Nest `ZodValidationPipe`) and the web imports the same types. Generate an OpenAPI 3.1 document from them (`@asteasolutions/zod-to-openapi`) and serve it at `/api/docs` [R]. This closes the "no shared API client/types" gap in PROJECT_CONTEXT §6.

---

## 12. Booking engine and timezone rules [P]

1. **Storage:** every instant is UTC `timestamptz`. Provider working hours are stored as (weekday, minute-of-day) in the provider's IANA zone, never as UTC.
2. **Rule expansion:** for each date in the horizon, take the provider-local date, build local start/end via `zonedTimeToUtc`; the offset is resolved *per date* so DST transitions are correct. Nonexistent local times (spring forward) are skipped; ambiguous times (fall back) resolve to the first occurrence and a test asserts it.
3. **Slot generation (`Slot` table, existing design):** a job materialises `OPEN` slots for `bookingWindowDays` ahead in `durationMin` steps per active event-type granularity (step = event duration, or a configurable 15-min grid [R]), removes slots overlapping `TimeBlock`s, overrides and external Google busy time, applies buffers (a booking blocks `[start - bufferBefore, end + bufferAfter]`) and `minNotice`. Regenerated on rule/override/block/integration changes; a nightly job extends the horizon. `BOOKED` slots are immutable.
4. **Booking transaction (keep the existing compare-and-set):**
   ```
   BEGIN
     UPDATE Slot SET status='BOOKED', version=version+1 WHERE id=:id AND status='OPEN' AND version=:v
     -- 0 rows -> ROLLBACK, return 409 SLOT_TAKEN
     UPSERT Client (workspaceId, lower(email))
     INSERT Booking (..., status = price>0 ? 'PENDING' : 'CONFIRMED')
     INSERT ReminderJob rows, ActivityLog, Notification (outbox)
   COMMIT
   ```
   External side effects (Google event, Zoom meeting, emails) go through a transactional **outbox** processed by a worker; failures retry with backoff and never roll back the booking.
5. **Idempotency:** `Idempotency-Key` stored 24 h; repeated POST returns the original response.
6. **Cancel/reschedule:** slot returns to `OPEN` (if still in the future and not blocked); reschedule = book new slot + mark old `RESCHEDULED`, in one transaction.
7. **Display:** clients see instants in the timezone they picked; providers see the workspace timezone; emails render both when they differ. Format only through `lib/format.ts` / `packages/time`.
8. **Tests (mandatory):** DST spring/fall in `America/New_York`, `Europe/London`; half-hour zone `Asia/Kolkata`; date-line (`Pacific/Auckland`); provider zone ≠ viewer zone crossing midnight; concurrent double-book (two parallel POSTs → exactly one 201).

---

## 13. Authentication and authorization [P]

- **AuthN [R]:** email + password (argon2id) with email verification, plus Google OAuth (reuses the Google integration app). Sessions: server-side session id in an httpOnly, Secure, SameSite=Lax cookie, 30-day sliding, rotate on login. Rate-limited login (5/min/IP+email), lockout backoff. The current `NO_REAL_AUTH` env flag remains **dev-only** and must hard-fail if set when `NODE_ENV=production`.
- **AuthZ:** workspace-scoped multi-tenancy. Every query is filtered by `workspaceId` from the session (Nest guard + Prisma middleware/extension that injects it); no endpoint accepts a `workspaceId` from the body. Roles: `owner` (billing, delete workspace), `admin` (everything else), `member` (own provider's calendar/appointments; read-only on workspace settings).
- **Public/manage tokens:** 128-bit random, stored hashed; single purpose; expire 30 days after the appointment.
- Frontend guard: middleware + `(app)/layout.tsx` server check; 401s clear the query cache and redirect.

---

## 14. Validation rules (shared Zod schemas)

| Field | Rule |
|---|---|
| name | trim, 2–100 |
| email | RFC-valid, lowercased, ≤ 254 |
| phone | optional, E.164 after normalisation (`libphonenumber-js`), placeholder "+1 (555) 000-0000" |
| notes | ≤ 2000 |
| date/time | valid instant, ≥ now + minNotice (public), ≤ now + bookingWindowDays |
| slug/handle | `^[a-z0-9]+(?:-[a-z0-9]+)*$`, event 3–60, handle 3–30, not reserved |
| duration | int 5–480, multiple of 5 |
| price | 0–1,000,000 cents |
| availability slots | HH:mm, start < end, no overlap per day, 15-min granularity |
| avatar | image/jpeg,png,gif ≤ 1 MB (demo copy), magic-byte verified |
| timezone | must be a valid IANA id (`Intl.supportedValuesOf('timeZone')`) |

UI: validate on blur then on change; inline error under the field (`text-[11px] text-rose-600 dark:text-rose-400`), input border `border-rose-500`; submit button disabled while submitting with a spinner; server `fieldErrors` mapped to fields.

---

## 15. Loading, empty, success, error states

| Screen | Loading | Empty [D copy] | Error |
|---|---|---|---|
| Dashboard | KPI/timeline skeletons | "No appointments scheduled for today" (+ Add Appointment) | card-level retry |
| Calendar | grid skeleton | "No appointments in this range" [P] | banner retry |
| Appointments | 6 `SkeletonRow`s | "No appointments match your filters." | row-level error with Retry |
| Event Types | 3 card skeletons | "Create your first event type" [P] | retry |
| Availability | row skeletons; existing `EmptyAvailability` for zero rules | "Unavailable" per day | `AvailabilityError` |
| Clients | 6 card skeletons | "No clients found." | retry |
| Public slots | 5 button skeletons | "No times available on this day." | `AvailabilityError` |
| Notifications | 3 skeleton rows | "You're all caught up" | "Couldn't load" + retry |

Success feedback is always a toast (texts in the demo are canonical: "Appointment created!", "Appointment cancelled", "Availability settings saved", "Profile saved successfully", "{title} activated/deactivated", "All notifications marked as read", "Time blocked on calendar", "Copied booking link: {url}"). Global `error.tsx` and `not-found.tsx` use the empty-state dashed panel style with a brand button.

---

## 16. Responsive behaviour [D unless tagged]

| Breakpoint | Behaviour |
|---|---|
| `< 640` (base) | Sidebar off-canvas; hamburger visible; search trigger hidden (palette via icon [P]); "New Appointment" is icon-only; KPI 1 col; header action buttons wrap below the greeting; dashboard split stacks (Booking Handle + Activity below the schedule); tables scroll horizontally; calendar week grid scrolls; drawer is `w-screen`; settings tabs scroll |
| `sm 640` | KPI 2 col; "New Appointment" label appears; greeting row goes horizontal; toolbars go horizontal |
| `md 768` | Sidebar static (permanent); search trigger visible; event/client grids 2 col; availability rows horizontal |
| `lg 1024` | KPI 4 col; dashboard 2/3 + 1/3 split; calendar 1/4 + 3/4; grids 3 col; main padding `p-8` |
| Public booking | Step 2 columns stack `< md`; whole flow fits 375 px with no horizontal scroll |

Touch targets ≥ 40 px on mobile for slot buttons, toggles (wrap in 40 px hit area), and nav items [P].

---

## 17. Accessibility (WCAG 2.2 AA) [P]

- Semantic landmarks: `<nav aria-label="Primary">`, `<main id="main">`, skip link.
- All icon-only buttons have `aria-label` (hamburger, close, bell "Notifications, {n} unread", theme toggle "Switch to light theme", chevrons).
- Toggles are `role="switch" aria-checked`; segmented control `role="tablist"`; filter pills `aria-pressed`; nav active `aria-current="page"`.
- Modals/drawers/palette: `role="dialog" aria-modal`, labelled, focus trap, Esc, focus return, background `inert`.
- Focus ring: the demo strips outlines (`focus:outline-none`) on many controls, so replace with `focus-visible:ring-2 ring-brand-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900`. [X]
- Colour contrast: verify `text-slate-400` on `slate-900` (ok) and on `white` (fails for body text). Muted text on light theme must be ≥ `slate-500`; decorative use only for `slate-400` [X].
- Calendar grids: `role="grid"`; chips are buttons with full accessible names ("10:00 AM, Michael Vance, Strategy Call, confirmed"). Colour is never the only status indicator (badge text is always present).
- Live regions: toasts (`role=status/alert`), booking step changes, slot list count updates.
- Time inputs get visible labels (`sr-only` acceptable) "Start time"/"End time".
- Automated: `axe` in Playwright on every route; zero serious/critical violations.

---

## 18. Security [P]

- **Transport/headers:** HTTPS only, HSTS, CSP (self + Stripe/Google as needed; no inline scripts except the nonce'd theme bootstrap), `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, frame-ancestors none (the public page may opt into embed later with an allowlist).
- **Input:** Zod validation everywhere; Prisma parameterises queries; sanitise/escape notes when rendering (React default) and in emails (HTML-escape).
- **CSRF:** SameSite=Lax cookies + double-submit token on state-changing browser requests; CORS allowlist = web origin only.
- **Abuse:** rate limits — public bookings 5/min/IP and 3/hour/email/provider, slots 60/min/IP, auth as above (Redis, `REDIS_URL` already in env). Honeypot field `website`; optional Turnstile after threshold.
- **Secrets:** OAuth tokens encrypted at rest (AES-256-GCM, key from KMS/env); never log tokens/PII; env names only in repo.
- **IDOR:** all IDs resolved through workspace-scoped queries; add authorisation tests for every endpoint.
- **Uploads:** signed URLs, content-type + size limits, re-encode images, serve from a separate domain/bucket.
- **Privacy:** data export & delete for clients (GDPR), unsubscribe links in reminders, retention policy for cancelled bookings.
- **Dependencies:** `pnpm audit` and Dependabot in CI.

---

## 19. Integrations [P]

| Integration | Behaviour | Notes |
|---|---|---|
| Google Calendar | OAuth (scopes `calendar.events`, `calendar.freebusy`); on booking create event with attendee + Meet link (`conferenceData`); busy time excluded from slot generation (push notifications via watch channel, poll fallback every 10 min); "Google Calendar sync completed" activity entry | matches demo copy "Sync appointments and check for double bookings in real time" |
| Zoom | OAuth; create meeting on booking, store `join_url` on `Booking.location`; delete on cancel | "Automatically generate unique Zoom meeting links" |
| Email | Resend/Postmark (or SES) with React Email templates: confirmation (+`.ics`), reminder 24 h/1 h, cancellation, reschedule; templates use the brand gradient header | |
| Payments | Stripe Payment Intents for priced event types; webhook flips `paymentStatus` → creates "Payment Received" notification ("$120.00 from Alex Chen for Tech Review") | phase 3 |
| Storage | S3-compatible bucket for avatars/logos | |

---

## 20. Background jobs [P]
BullMQ on Redis (already in env): `slot-generation`, `outbox-dispatch`, `reminders` (driven by `ReminderJob.runAt`), `calendar-sync`, `mark-completed` (confirmed bookings whose `endsAt` passed, hourly), `metrics-rollup`. Each job idempotent, retried with exponential backoff, dead-letter queue monitored.

---

## 21. Configuration and deployment

**Env (names only)**
Web: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_POSTHOG_KEY?`
API: `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, `ENCRYPTION_KEY`, `WEB_ORIGIN`, `GOOGLE_CLIENT_ID/SECRET`, `ZOOM_CLIENT_ID/SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `EMAIL_API_KEY`, `EMAIL_FROM`, `S3_*`, `SENTRY_DSN`, `NODE_ENV`, `NO_REAL_AUTH` (dev only).
Validate at boot with Zod; process exits on invalid config.

**Local dev (fix the current DB confusion)**
- Single source: `docker-compose.yml` (postgres:16-alpine on **5433**, DB `chronos`, user `chronos`; add Redis). `.env.example` must use `postgresql://chronos:<password>@localhost:5433/chronos`. Delete the stale 5432 URL. Commands: `docker compose up -d`, `pnpm --filter @chronos/api prisma migrate deploy`, seed script in `packages/db` (convert `003_seed_data.sql` to match Appendix A), `pnpm dev`.
- Decide one migration system: **Prisma Migrate** [R]; archive the raw SQL migrations in `packages/db/migrations` after diffing them against `schema.prisma` so both don't drift.

**Production [R]**
- Web: Vercel (or container). API + worker: containers (Fly.io/Render/ECS), separate `api` and `worker` processes from one image. Postgres: managed (Neon/RDS) with PITR; Redis: managed. CDN for assets.
- Environments: `dev` → `staging` (seeded, Stripe test mode) → `prod`. Preview deployments per PR.
- CI (GitHub Actions): install (pnpm cache) → typecheck → lint → unit → build → migrate on ephemeral Postgres → integration → Playwright (against preview) → deploy. Migrations run before the new API version (backwards-compatible, expand/contract).
- Docker healthchecks call `/health`; readiness `/ready` checks DB + Redis.

---

## 21b. Performance targets [P]
- Public booking page: LCP < 2.0 s on 4G, JS < 150 KB gzip on the route, slots endpoint p95 < 300 ms (indexed range query, cache per provider/day for 30 s, invalidated on booking).
- App: TTI < 3 s; route JS split per screen; dynamic import Recharts, cmdk, calendar grids.
- Lists paginated/virtualised above 100 rows; images `next/image` with fixed sizes (avatars 32/48/64).
- Font: `next/font` with `display: swap`, subset latin.
- API: N+1 checks via Prisma query logging in tests; dashboard summary computed with a single aggregate query and cached 30 s.

---

## 22. Testing strategy

| Layer | Tooling | Must cover |
|---|---|---|
| Unit | Vitest | `packages/time` (DST, half-hour zones), slot generation, buffers/notice, validators, formatters, KPI math |
| API integration | Jest/Vitest + Testcontainers Postgres | every endpoint incl. authz (cross-workspace access → 404), booking race (parallel POSTs), idempotency, cancel/reschedule, override/block interactions |
| Component | Vitest + Testing Library | StatusBadge variants, DayRow validation, DatePicker disabled days, forms |
| E2E | Playwright (Chromium + WebKit, 375/768/1280) | provider journey: login → create event type → set availability → public booking → appears on dashboard → cancel; public flow incl. tz change and slot-taken race |
| Visual regression | Playwright screenshots vs baselines captured from the demo HTML with Appendix A data (dark + light, 3 widths) | threshold 2 % pixel diff per screen |
| Accessibility | axe-playwright | every route, both themes |
| Load | k6 | slots endpoint 200 rps, bookings 20 rps with contention on one slot |

Quality gates: typecheck, lint, unit ≥ 80 % lines on `packages/time` and booking service (100 % on the compare-and-set path), all E2E green.

---

## 23. Logging, monitoring, analytics [P]
- Structured JSON logs (`pino`) with `requestId`, `workspaceId`, `userId` (no PII, no tokens). Request ID from a header, echoed in error envelopes.
- Sentry (web + API + worker) with release tagging and source maps.
- Metrics (OpenTelemetry → Grafana/Datadog): bookings created, `SLOT_TAKEN` rate, slot-generation duration, job queue depth/age, email failure rate, integration token-refresh failures, p50/p95 latency per route.
- Alerts: 5xx > 1 % for 5 min, queue age > 5 min, DB connections > 80 %, failed reminder jobs, Stripe webhook failures.
- Product analytics (PostHog): public funnel `view → date → slot → details → confirmed` (feeds the Analytics screen conversion metric).
- Audit log for security-sensitive actions (login, password/2FA change, integration connect/disconnect, member changes).

---

## 24. Scalability notes [R]
- Stateless API/web → horizontal scale; sessions in Redis.
- Slot table growth: ≈ (slots/day × 60 days) per provider; partition `Slot` by month or prune `OPEN` slots in the past nightly; keep `BOOKED` rows via `Booking`.
- Read-heavy public endpoints cached (Redis, per-provider-day keys; invalidate on write). CDN-cache `/[handle]` shell with ISR (60 s).
- Use PgBouncer / Prisma Accelerate pool for serverless connection limits.
- Fan-out work (emails, sync) only through queues; workers scale independently.
- Multi-region is out of scope; keep instants UTC so it stays possible.

---

## 25. Delivery plan (implementation order)

**Phase 0: Unblock (½–1 day).** Fix env (single DB URL/port), compose up Postgres + Redis, run migrations + seed, generate Prisma client, verify `bookings.controller` transaction against a real DB, get API `tsc` clean, run existing tests/lint and record the baseline. Remove the raw `pg` Pool path (port availability controller to Prisma). Create `packages/contracts` skeleton (Zod).

**Phase 1: Design system + shell (2–3 days).** Tokens/theme (section 4), `ui/*` primitives, `AppShell/Sidebar/Topbar`, theme toggle, toasts, routes for all 11 screens with `ComingSoon` for 3, auth guard stub. *Exit:* shell matches the demo at 3 widths in both themes.

**Phase 2: Core scheduling vertical slice (1–1.5 weeks).** Real auth; Event Types CRUD; Availability (rules, tz, buffers, notice, overrides) + slot generation; **public booking flow** (steps 1–4, tz selector, race handling, confirmation + `.ics`); Appointments list + drawer + cancel; Dashboard (KPIs, today, handle card, activity). Emails (confirm/cancel). *Exit:* end-to-end journey passes in Playwright.

**Phase 3: Management surfaces (1 week).** Calendar (all four views, mini calendar, filters, block time), New Appointment modal, Clients CRM + detail, notifications (+ SSE), command palette, Settings Profile + Integrations (Google Calendar two-way conflict check, Zoom links), reminders.

**Phase 4: Monetisation & insights (1–1.5 weeks).** Stripe checkout for paid event types, Billing + Settings tabs (Notifications, Branding, Security incl. 2FA), Reports, Analytics, workspace/member management.

**Phase 5: Hardening (ongoing/1 week).** Load tests, a11y audit, security review, observability dashboards, backup/restore drill, docs (`docs/ARCHITECTURE.md`, `docs/RUNBOOK.md`).

Parallel-backend rule [P]: web work in each phase codes against `packages/contracts`; until an endpoint ships, use an MSW mock generated from the same schemas so UI and API teams don't block each other. Contract changes are made in a PR that touches `packages/contracts` first.

---

## 26. Definition of done

**Global**
- [ ] Typecheck, lint, unit, integration, E2E, axe all green in CI.
- [ ] No demo-only artefact remains (empty-state toggle, hard-coded dates/times/KPIs/EDT, hot-linked images, `emptyStateMode`).
- [ ] Every screen visually matches the demo (dark and light) at 375/768/1280 within the 2 % visual-diff gate, using the Appendix A dataset.
- [ ] Every interactive element in sections 5–8 works with real data; every `[X]` item in 2.3 is resolved.
- [ ] Zero double bookings under the concurrency test; DST tests pass.
- [ ] Lighthouse (public booking, mobile): Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95.
- [ ] Secrets absent from repo and logs; `NO_REAL_AUTH` cannot be enabled in production.
- [ ] Runbook, `.env.example`, and README bring a new developer to a running stack in < 15 minutes.

**Per-screen acceptance** (each must also satisfy the loading/empty/error rows of section 15)
| Screen | Acceptance |
|---|---|
| Shell | Nav highlights the active route; mobile sidebar opens/closes with overlay and closes on navigation; ⌘K opens palette; theme persists across reloads with no flash |
| Dashboard | KPIs match the SQL truth for the seed data; Join Meeting opens the correct URL; Copy Link writes to clipboard |
| Calendar | Four views work; range fetch only; clicking an empty cell prefills the modal; filters hide chips; blocked time visible |
| Appointments | Search (name/email/event type) + 6 status pills + pagination in URL; drawer opens from row and Manage; cancel releases the slot (public page shows it again) |
| Event Types | Create/edit/delete rules enforced; toggle optimistic; Copy Link yields `/{handle}/{slug}` |
| Availability | Overlap and start<end validation; save regenerates slots; DST-correct labels |
| Clients | Search, aggregates equal DB sums, detail view shows history |
| Public booking | Works logged-out at 375 px; tz selector correct; `SLOT_TAKEN` handled; confirmation email + `.ics` received; manage link cancels/reschedules |
| Settings | Slug uniqueness feedback; photo ≤ 1 MB enforced; Google/Zoom connect/disconnect round-trips |

---

## 27. Open questions for the owner
1. **Auth model:** email/password + Google, or Google-only? Is multi-workspace membership required at launch, or only a single workspace with the switcher stubbed?
2. **Payments in v1?** Paid event types show prices in the demo; confirm Stripe scope for launch.
3. **Icon fidelity:** accept Lucide (recommended) or require Font Awesome for pixel parity?
4. **Reports / Analytics / Billing:** ship as `ComingSoon` in v1, or build in Phase 4 as specced?
5. **Slot strategy:** keep the materialised `Slot` table, or compute availability on demand? (Spec keeps the table because the existing booking transaction depends on it.)
6. **Light theme on the public page:** follow OS (spec) or force dark like the app default?
7. **Existing schema:** please provide `prisma/schema.prisma` so section 10 can be reconciled field by field.
8. **Deployment target** and email provider preferences.

---

## Appendix A — Demo seed data (use for seeding and visual-regression baselines)

**Provider:** Dr. Sarah Jenkins · `sarah@chronos.app` · handle `dr-sarah` · headline "Senior Strategy Consultant & Technical Advisor" · tz `America/New_York` · workspaces "Acme Advisory Team" (active), "Personal Booking".
**Reference "today":** Wednesday, Oct 28, 2026.

| Event type | Slug | Min | Price | Location | Colour | Description |
|---|---|---|---|---|---|---|
| 1-on-1 Strategy Call | `strategy-30` | 30 | $50 | Google Meet | brand | Deep dive strategic session to review roadmap & goals. |
| Technical Review | `tech-review-60` | 60 | $120 | Zoom Video | emerald | Comprehensive codebase audit and architecture planning. |
| Free Intro Chat | `intro-15` | 15 | $0 | Phone Call | sky | Brief introductory consultation to assess alignment. |

| Client | Company | Email | Phone | Bookings | Spent |
|---|---|---|---|---|---|
| Michael Vance | Vance Tech | michael@vance.io | +1 555-0192 | 4 | $200 |
| Alex Chen | Chen Enterprise | alex@chentech.com | +1 555-0143 | 2 | $240 |
| Sophia Martinez | Studio Design | sophia@martinez.org | +1 555-0188 | 1 | $0 |

| Appointment | Client | Type | Date | Time | Min | Status | Location | Notes |
|---|---|---|---|---|---|---|---|---|
| 101 | Michael Vance | Strategy Call | 2026-10-28 | 10:00 AM | 30 | confirmed | meet.google.com/abc-defg-hij | Interested in scaling team capacity. |
| 102 | Alex Chen | Technical Review | 2026-10-28 | 02:00 PM | 60 | confirmed | zoom.us/j/987654321 | Architecture overhaul for Q4. |
| 103 | Sophia Martinez | Free Intro Chat | 2026-10-29 | 11:15 AM | 15 | pending | Phone Call | Initial project inquiry. |

**Weekly hours:** Mon–Thu 09:00–17:00, Fri 09:00–15:00, Sat/Sun off.
**Notifications:** (unread) "New Booking — Michael Vance booked 1-on-1 Strategy Call, 10 mins ago"; (unread) "Payment Received — $120.00 from Alex Chen for Tech Review, 1 hour ago".
**Activity:** "New booking by Michael Vance" 12 mins ago (brand); "Updated Availability for Thursday" 2 hours ago (emerald); "Google Calendar sync completed" 5 hours ago (sky).
**KPI baseline:** 142 appointments (+14.2 %, vs 124), 2 today (4 hours busy, next 10:00 AM), $4,850 (+22.5 %, 30 paid bookings), 88 % occupancy (+5 %).
**Integrations:** Google Calendar connected; Zoom not connected.

---

## Appendix B — Class recipes to copy verbatim [D]

```
Card:            bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm
Card (hover):    + hover:shadow-md transition
Primary button:  px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20 transition
Secondary btn:   px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition
Ghost/outline:   px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold
Danger outline:  w-full py-2.5 border border-rose-200 text-rose-600 dark:border-rose-900/50 dark:text-rose-400 rounded-xl text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30
Input:           w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-brand-500   (+ focus-visible ring per section 17)
Search input:    pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm focus:border-brand-500
Toggle (lg):     h-5 w-9 rounded-full, on bg-brand-600 / off bg-slate-300 dark:bg-slate-700, knob h-4 w-4 bg-white shadow, translate-x-4
Toggle (sm):     h-4 w-7, on bg-emerald-500 (event types), knob h-3 w-3, translate-x-3
Icon tile:       w-9 h-9 rounded-xl bg-{tone}-50 dark:bg-{tone}-950/50 text-{tone}-600 dark:text-{tone}-400 flex items-center justify-center text-sm
Empty panel:     text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl  (icon circle w-12 h-12 bg-slate-100 dark:bg-slate-800)
Kbd:             px-1.5 py-0.5 text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-500 dark:text-slate-300 font-mono
Overlay:         fixed inset-0 bg-slate-950/60 backdrop-blur-sm
Gradient card:   bg-gradient-to-br from-brand-600 to-indigo-700 text-white rounded-2xl shadow-md
Public header:   bg-gradient-to-r from-brand-600 to-indigo-700 p-6 text-white text-center
Table head:      bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800
```
