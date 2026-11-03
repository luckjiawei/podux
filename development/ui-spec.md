# UI Specification

## Technology Stack, Entry Point, and Theme

The application UI under `site/` uses React 19, TypeScript, and Vite 7 together with Radix Themes, Tailwind CSS 4, Iconify, Framer Motion, Recharts, Sonner, and react-i18next; it does not use Vue. Vue is used only by the VitePress site under `docs/`.

`site/src/main.tsx` loads Radix CSS, `index.css`, and i18n in that order, then wraps the application in `ThemeProvider`, `LanguageProvider`, and Radix `<Theme>`. Theme settings are `accentColor="indigo"`, `grayColor="slate"`, and `radius="large"`. Appearance is light/dark, initially taken from the system `prefers-color-scheme` and then stored in `localStorage.theme`. `index.css` is the entry point for Tailwind and global status-dot styles. `App.css` is an unused Vite template remnant not imported by `App.tsx`; do not treat it as the current UI baseline.

## Design Tokens in Use

The project has no custom token file. It primarily consumes Radix CSS variables and component size/gap scales directly.

| Category | Verified values/usage |
| --- | --- |
| Brand/accent | Radix indigo mappings `--accent-2/3/4/6/9/10/11` and `--accent-a3`; do not hard-code a new "Podux blue" |
| Neutrals/surfaces | Slate mappings `--gray-1..12`, alpha gray, `--color-background`, and `--color-panel-solid`; main page background is `--gray-2` |
| Status colors | Radix green/red/amber/orange/blue/purple scales; online dot `--green-9`, offline dot `--red-9`, unknown dot `--gray-9` |
| Typography | No project font family; inherits Radix/browser. Body text commonly uses `<Text size="1|2|3|4">`, page titles use `<Heading size="6">`, and section titles commonly use size 3/4 |
| Spacing | Prefer Radix `gap/mb/px/py` scales and Tailwind (for example px-4, sm:px-6, lg:px-8); local values commonly include 8/12/16/20/24/32px |
| Radius | Radix global `large`; variables `--radius-2/3`; local 8/12/16/24px and full circles |
| Borders | Usually `1px solid var(--gray-5|6)`; highlighted areas use `--accent-6` |
| Shadows | A few local `0 4px 12px rgba(0,0,0,.05/.2)` and `0 4px 16px rgba(0,0,0,.1)` values; prefer Card/Dialog defaults |
| Stacking | Sticky top bar uses `z-50`; full-screen Loading uses `z-index: 9999`; otherwise prefer component overlay defaults |

Hard-coded values such as `#22c55e`, `#E5484D`, `#30A46C`, and `#6b7280` remain scattered through charts/status implementations. Prefer existing Radix tokens. Cleanup requires a separate task that verifies SVG chart compatibility; do not replace these values in bulk during ordinary feature work.

## Layout and Component Patterns

- Application shell: reuse `layouts/MainLayout.tsx`. Desktop uses a sticky top bar with logo, Dashboard/Servers/Proxies navigation, and controls on the right. Below `760px`, mobile uses bottom navigation. Content uses `max-w-7xl`, supports a minimum viewport width of 320px, and reserves space for the mobile bottom bar.
- Page titles: reuse `components/PageHeader.tsx`, keeping title, description, and right-side actions at a consistent hierarchy. Reuse `SectionHeading` for section titles.
- Forms: prefer Radix `TextField/Select/Switch/Button`; reuse `FormItem` for labels and required markers. Keep page state and submission logic in hooks/index files and layout in views.
- Cards and statistics: use Radix `Card` for general content. Reuse `StatCard` and `AnimateNumber` for dashboard value cards rather than duplicating animation/color decisions.
- Lists: Servers/Proxies establish the desktop-table + mobile-card, search, pagination, Badge, and DropdownMenu pattern. Prefer it for new resources of the same kind.
- Dialogs: use Radix `AlertDialog` for delete confirmation and Radix `Dialog` for editing, passwords, and similar tasks. Mark dangerous actions red, separate cancel and confirm, and prevent duplicate submissions during async work.
- Charts: reuse `LatencyChart/ProbeHistory` for latency trends and Dashboard `TopologyChart` for topology. Containers must be responsive, with sufficient contrast in both themes.
- Latency-axis layout: [LatencyChart](../site/src/components/LatencyChart.tsx) keeps a non-negative left chart margin and uses `YAxis width="auto"` so the full formatted tick, including `ms`, fits inside the SVG and reveal-animation clipping bounds. For regression checks, use probe-history values up to 280ms, 1200ms, and 12000ms at 320px mobile and desktop widths in both themes; check the rendered tick bounds, not only their text content. Repeat after a data refresh changes the number of digits. Keep the reveal animation and chart clipping enabled.
- Notifications: prefer `sonner` toast for operation success/failure (global top-center with richColors). Do not add alerts; the existing `alert` in ProfileSettings is technical debt.
- Empty/loading/error: reuse `EmptyState` for empty lists and `Loading` for route/page loading. Errors should explain the problem and offer a recovery action. There is no unified ErrorState/ErrorBoundary yet; before adding one, assess whether it should become a shared component.

## Reference Pages

- Dashboard: `site/src/pages/Dashboard/DashboardPage.view.tsx` combines `PageHeader`, `StatCard`, Radix Grid/Card, and `TopologyChart`; data orchestration is in `useDashboard.ts`.
- Servers/Proxies: `site/src/pages/Servers/ServersPage.view.tsx` and `site/src/pages/Proxies/ProxiesPage.view.tsx` are the primary references for responsive lists, status badges, action menus, and AlertDialog. Their forms are under the corresponding `*FormPage` directories.
- Settings: `site/src/pages/Settings/SettingsPage.view.tsx` and `SettingsPage.css` use a 240px sidebar, active accent state, and content area. `GeneralSettings.tsx` demonstrates `FormItem`, loading, and save toast; `ProfileSettings.tsx` demonstrates profile cards and security sections.

## Responsiveness, Themes, Internationalization, and Accessibility

- Responsiveness: the actual application-shell breakpoint is `max-width: 760px` (the 640px comment is stale). Test at least 320px mobile and desktop widths. On mobile, table content must use cards or controlled scrolling and must not require hover for actions.
- Themes: new colors should use `var(--accent-*)`, `var(--gray-*)`, and semantic colors. Avoid fixed white backgrounds/black text. Check charts, overlays, borders, and focus states in light and dark themes.
- Internationalization: route all user-facing text through `t()` and update both `locales/zh.json` and `en.json`. LanguageContext/localStorage owns language selection; do not use hard-coded Chinese or English as fallback UI.
- Accessibility: use semantic Radix components. Icon-only buttons need accessible names/tooltips; images need alt text; form labels must associate with controls; keyboard focus must remain visible. `index.css` currently forces the Recharts surface outline off and must be limited to non-interactive charts; reassess it if keyboard chart interaction is added.
- Motion: the standard page transition is `PageTransition` at 0.3s cubic-bezier; titles use 0.5s easeOut; status dots loop every 1.6–2.5s. Lightweight hover/tap effects are acceptable but must not block interaction. Only the unused Vite-template `App.css` currently observes `prefers-reduced-motion`; actual Framer/status-dot animations do not support it consistently and remain technical debt.

## Reuse and Addition Rules

1. Check Radix Themes first, then `site/src/components/`, then neighboring page view/hook patterns.
2. Extract a shared component only when a semantically stable pattern spans at least two pages; keep page-specific compositions in the page directory.
3. New shared components must use tokens, support `className` and necessary props, cover loading/disabled/error states, and be verified in both themes and mobile layouts.
4. Local styles are acceptable for third-party charts, complex layouts, or states difficult to express with Radix props/Tailwind. Scope names to the page/component and avoid global selectors and `!important`. Existing `!important` usage in Settings CSS is a compatibility condition, not a pattern for new styles.
5. Do not restore or extend unused `App.css` template styles. Put necessary global rules in `index.css` and document their impact.

## Technical Debt

- There is no centralized project-owned set of spacing, shadow, z-index, or motion tokens; the UI relies on Radix scales mixed with local pixel values.
- Settings has only a desktop 240px sidebar, with no dedicated mobile adaptation rules found; verify on a real device.
- Error state, ErrorBoundary, and form-error presentation do not yet follow a unified shared pattern.
- ProfileSettings uses native `alert`, Loading defaults to English `Loading...`, and internationalization remains inconsistent.
- Actual interaction animations do not yet systematically honor `prefers-reduced-motion`.
