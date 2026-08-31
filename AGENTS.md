# Prototype Instructions

## Repository layout

- Keep the React/Vite application under `frontend/`.
- Keep the NestJS/Prisma application under `backend/`.
- Keep deployment, CI/CD, Docker, `scripts/`, `tests/`, `worker/`, and `.openai/` at the repository root.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `frontend/src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## CartIA product direction

- Prioritize exceptional UI and UX: clear hierarchy, generous spacing, accessible controls, excellent mobile behavior, and realistic interaction states.
- Use the insight-first analytics composition as the dashboard home.
- Keep live table-service requests persistently discoverable without competing with the analytics hierarchy.
- Use the visual menu preview as the separate Carta editing experience.
- Preserve the warm editorial hospitality direction: ivory, charcoal, forest green, saffron, and deep wine, with serif display type paired with a clean sans-serif.
- Treat the physical-phone menu journey as a primary acceptance path: mobile-first layout, fast vertical dish video, clear search/categories, and persistent but unobtrusive table-service actions.
- Restaurant owners must be able to manage dishes, prices, availability, visual styles, and optional waiter/bill actions themselves; admin changes should be immediately verifiable in the guest menu preview.
- Make the Instagram-style vertical reel feed the primary guest-menu format: one looping dish video per swipe, muted autoplay, and clear add/price details over the media.
- Preserve the list menu as a first-class alternative; tapping a list dish must open that dish's corresponding video reel.
- Ship the first restaurant beta on the user's Hostinger Agency plan using a static React build plus PHP and MariaDB/MySQL; do not require a persistent Node process.
- Store beta dish videos in the Hostinger account with strict MP4 validation and long-lived asset caching. Cloudflare/R2 is reserved for a later version.
- Every restaurant table must have a unique, non-guessable QR token. Orders, waiter calls, and bill requests must resolve to that exact table.
- Version 1 has no subscriptions, payments, transactional email, or public self-registration. CartIA staff create restaurant accounts.
