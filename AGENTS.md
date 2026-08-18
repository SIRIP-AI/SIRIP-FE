# SIRIP Frontend

React 19 and Vite web application for the Landing / Cold-Chain Operations Coordinator. The dashboard provides operational visibility and configuration; WhatsApp remains the AI interaction channel.

## Documentation Routing

Read only the documents relevant to the task, then use `SIRIP AI Master.md` to resolve broader product intent.

| Task | Read first |
| --- | --- |
| Product scope, actors, or terminology | `../docs/SIRIP AI Master.md` |
| Screens, navigation, visual design, responsive behavior, or UX copy | `../docs/SIRIP AI UIUX.md` |
| User flows, lifecycle, telemetry, quality, plans, or operational rules | `../docs/SIRIP AI Flow.md` |
| Browser-to-ESP32 provisioning protocol | `../docs/SIRIP BLE Provisioning.md` |
| API models, fields, relationships, or statuses | `../docs/SIRIP AI Data.md` |
| AI states, planning/replanning behavior, or WhatsApp actions | `../docs/SIRIP AI Agent.md` |

When documents overlap, preserve the explicit MVP rules in the most task-specific document and flag material conflicts rather than inventing behavior.

## Stack

- Tailwind CSS for styling and design tokens.
- shadcn/ui for accessible UI primitives; keep generated primitives in `src/components/ui`.
- React Router for routes and navigation.
- TanStack Query for server state, caching, and request lifecycle.
- Axios through the shared client in `src/lib/axios.js`.
- Zod for validating untrusted API data and form input.
- GSAP for intentional animation that CSS cannot express cleanly; scope and clean up animations and respect reduced motion.

Do not add parallel libraries for responsibilities already covered by this stack.

Use Tailwind utilities by default for component layout, spacing, responsive behavior, and interaction states. Keep handwritten CSS for global tokens, base styles, keyframes, and cases that Tailwind cannot express clearly.

Use shadcn/ui primitives for standard interactive controls rather than hand-rolling dialogs, selects, buttons, inputs, and similar components. Keep generated primitives in `src/components/ui` and adapt them through variants, tokens, and composition rather than editing around them with duplicate controls.

Use GSAP for deliberate entrance, exit, sequencing, and state-transition motion, not simple hover or focus effects. Scope animations to component refs, revert them on cleanup, prefer transforms and opacity, and skip nonessential motion when `prefers-reduced-motion` is enabled.

Migrate legacy UI incrementally when touching a component. Do not perform unrelated bulk styling rewrites solely for consistency.

## Architecture

Use a feature-sliced file structure. Product behavior belongs under:

`src/features/<feature>/`

A feature may own its `api`, `components`, `hooks`, `pages`, and `schemas`. Keep files directly in the feature until subfolders improve navigation; do not scaffold every possible folder.

Application-wide code belongs outside feature slices:

- `src/app/`: application composition, providers, and route definitions.
- `src/components/ui/`: shadcn/ui primitives.
- `src/components/`: genuinely reusable composed UI.
- `src/lib/`: framework and service infrastructure such as Axios and query configuration.
- `src/assets/`: static assets imported by the application.

Features may import app-independent shared code. Shared code must not import feature internals, and one feature must not reach into another feature's internals. Expose a small public entry point only when cross-feature reuse is actually required.

Define API calls and query options in the owning feature. Use TanStack Query for remote state and local React state for transient UI state. Validate data at the API boundary with Zod when the backend response is not already trusted by construction.

Use routes to compose feature pages rather than placing product behavior in `App.jsx`. Build responsive, accessible interfaces that follow the UI guide, never communicate status by color alone, and keep proposed AI actions visually distinct from active plans.

## Development

- `npm run dev`: run Vite locally.
- `npm run lint`: run ESLint.
- `npm run build`: create a production build.
- `npm run preview`: preview the production build.

Do not start dev servers, open browsers, or run browser automation unless explicitly requested. Run lint and a production build for shared setup or routing changes. Update the routed documentation when behavior, contracts, architecture, or setup changes.
