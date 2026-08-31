# CartIA — Design QA

## Comparison target

- Source visual truth — dashboard: `D:\CodexData\generated_images\019fae8e-803e-7ac0-acb5-4206593114e4\call_IoF8O4RNIi8MSEoYFVK5lRLl.png`
- Source visual truth — Carta: `D:\CodexData\generated_images\019fae8e-803e-7ac0-acb5-4206593114e4\call_6Y48lDZQXAALh5DHViBzijja.png`
- Browser-rendered implementation — dashboard: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\implementation-dashboard-v2.png`
- Browser-rendered implementation — Carta: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\implementation-carta-v2.png`
- Browser-rendered implementation — mobile Carta: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\implementation-carta-mobile-v2.png`

## Normalization

- Desktop implementation viewport: 1440 × 1024 CSS px, device scale factor 1.
- Desktop implementation screenshots: 1440 × 1024 px.
- Source visuals: 1487 × 1058 px.
- For the full-view comparison, both source images were downsampled to 720 × 512 and placed beside implementation captures downsampled to the same dimensions. No browser chrome or device frame was included.
- Mobile implementation viewport and screenshot: 390 × 844 CSS/image px, device scale factor 1. Runtime metrics confirmed `innerWidth: 390`, document `scrollWidth: 390`, public menu width `358`, and the responsive bottom navigation visible.
- State — dashboard: La Oliva, live request rail visible, “Últimos 7 días”.
- State — Carta: La Oliva, “Entradas” active, edit mode off.

## Evidence

- Full-view comparison: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\qa-comparison-v2.png`
- Focused dashboard comparison: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\qa-dashboard-focus-v2.png`
- The focused comparison uses corresponding 1220 × 720 px content crops and scales each proportionally to 720 × 425 px. It verifies display typography, data-table rhythm, food crops, insight panel, controls, and semantic colors at a readable scale.
- A separate focused Carta crop was not needed: its hero, category navigation, product imagery, CTA, and performance rail are clearly readable in the full-view comparison. The responsive Carta received a separate 390 × 844 browser capture.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: the implementation uses bundled Cormorant Garamond for editorial display text and DM Sans for operational UI. Hierarchy, wrapping, optical weight, tracking, and small-label contrast are consistent with the selected direction.
- Spacing and layout rhythm: the persistent header, live service rail, left navigation, main data region, and recommendation rail maintain clear alignment and balanced density. The Carta keeps the same shell deliberately so restaurant owners do not lose operational context while editing.
- Colors and visual tokens: ivory, charcoal, forest green, saffron, and wine are consistently mapped to background, primary actions, live states, opportunities, and account/request status.
- Image quality and asset fidelity: all visible food photography is real generated raster imagery with valid natural dimensions, sharp crops, and no placeholder art. Dashboard images reported complete with natural widths between 1200 and 1536 px.
- Copy and content: restaurant-specific labels, menu items, attention metrics, request states, managed AI-video workflow, and administration text are coherent and realistic. No prompt text leaks into the UI.
- [P3] The implementation uses a tighter, card-based analytical table than the source’s more poster-like food strip. This is an intentional product adaptation: it keeps five products, two decision metrics, live status, and the recommendation CTA readable within the multi-tenant dashboard shell.

## Comparison history

### Iteration 1

- Earlier evidence: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\qa-comparison-v1-small.png`
- [P2] The first dashboard implementation added a KPI strip above the core table, reducing the visual focus on “qué está mirando tu salón”.
- [P2] Product photography was too small and did not carry enough hierarchy compared with the source.
- Fixes made: removed the extra KPI strip; enlarged and regridded food thumbnails; increased rank typography; aligned attention/election columns; increased the recommendation image; aligned the initial period and date copy with the source.
- Post-fix evidence: `qa-comparison-v2.png` and `qa-dashboard-focus-v2.png` show the corrected hierarchy, imagery, density, and matching state.

## Primary interactions tested

- Pending-request button opens and closes the live request drawer.
- “Mejorar este plato” opens the guided editor.
- Analytics period selector updates.
- Sidebar navigation opens Carta.
- Carta category tabs update.
- Carta edit mode toggles on and off.
- Adding the featured dish updates the guest selection.
- Optional “Llamar al mozo” and “Pedir la cuenta” actions are present.
- Administración opens and the new-client action returns visible feedback.
- Mobile navigation and layout render without horizontal overflow.
- Browser console and runtime exceptions checked: zero errors in the final run.

## Implementation checklist

- [x] Desktop source/implementation full-view comparison.
- [x] Focused dashboard comparison.
- [x] Responsive mobile capture at a real 390 px viewport.
- [x] Primary interaction path tested in Chrome.
- [x] Console checked.
- [x] Production build and Sites worker tests passed.

## Follow-up polish

- Optional P3: test one darker hero crop for restaurants whose brand is more nocturnal, while retaining the current high-contrast text overlay.

## Video and mobile-menu extension

### Comparison target and evidence

- Existing approved mobile Carta baseline: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\source-carta-mobile-baseline.png`
- New public mobile menu with published video: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\implementation-guest-menu-mobile.png`
- New administrative video workspace, desktop: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\implementation-video-admin-desktop.png`
- New administrative video workspace, mobile: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\implementation-video-admin-mobile.png`
- Same-input mobile comparison: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\qa-mobile-video-comparison.png`
- Source and implementation mobile captures are both 390 × 844 CSS/image px at device scale factor 1; no density normalization was required.
- The source state is the owner-facing Carta preview. The implementation state is the diner-facing public route, so removal of admin header, service rail, edit controls, and bottom admin navigation is intentional. Typography, palette, image treatment, food hierarchy, radii, and action language remain the fidelity surfaces being compared.

### Findings

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: Cormorant Garamond and DM Sans retain the approved editorial/operational hierarchy. The dish name is visible over the moving image in the first mobile viewport.
- Spacing and layout rhythm: the public experience uses a 390 px single-column flow, horizontal category pills, a large 9:16-compatible media surface, and a fixed one-handed action dock. Browser metrics confirmed no horizontal overflow.
- Colors and visual tokens: forest green, ivory, saffron, wine, muted stone, and semantic success/error colors remain consistent with the existing CartIA system.
- Image and video fidelity: the sample is a real 720 × 1280 H.264 MP4 with `faststart`, muted inline autoplay, loop, poster fallback, and no placeholder media. Food images retain sharp 1200–1536 px sources.
- Copy and content: the upload requirements, processing state, associated dish, publication state, client preview, waiter request, bill request, and selection state use restaurant-specific language.

### Iteration 2

- [P2] The first public mobile capture placed the featured dish name below the initial fold, leaving the first viewport dominated by media without enough product context.
- Fix made: added the dish name and “El más mirado” label directly over the video’s lower contrast area while preserving the detailed product block below.
- Post-fix evidence: `implementation-guest-menu-mobile.png` and `qa-mobile-video-comparison.png` show the dish identity, mute control, category state, and fixed service actions together in the first 390 × 844 viewport.

### Video-flow interactions tested

- Existing published sample loads in the administrative preview.
- A real MP4 file is assigned through the browser file input.
- Upload preparation reaches 100% and enables publication.
- “Publicar y ver como cliente” changes to the public mobile route.
- The public route renders the uploaded video with `playsInline`, muted autoplay, loop, and visible media dimensions.
- Adding the featured dish updates the selection counter.
- Calling the waiter returns visible confirmation.
- Admin mobile layout renders at 390 px with a 358 px workspace and no horizontal overflow.
- Browser console and runtime exceptions checked: zero errors.

final result: passed

## Guest reels and per-dish video extension

### Evidence

- Primary reel, first dish: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\implementation-guest-reels-first-mobile.png`
- Primary reel, second dish: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\implementation-guest-reels-second-mobile.png`
- Alternative video list: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\implementation-guest-video-list-mobile.png`
- List-to-reel destination: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\implementation-list-to-reel-mobile.png`
- Per-dish admin video library: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\implementation-video-library-all-dishes.png`
- Previous list-led experience and new reel-led experience, same 390 × 844 input: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\qa-list-to-reels-comparison.png`

### Behavior verified

- Reels are the default guest view and the list remains one tap away.
- Six visible dishes render six real MP4 video elements with `loop`, `muted`, and `playsInline`.
- Only the reel intersecting at 65% or more plays; the previous reel pauses.
- Vertical scroll advances from `1 / 6` to `2 / 6` and starts the correct next video.
- Tapping the second list card opens `2 / 6`, titled “Tartar de atún rojo”, and starts that video.
- Every list card has a visible “Ver video” affordance.
- The administrative library reports six published videos with loop active.
- Uploading a replacement MP4 for Burrata updates only Burrata's reel to the new blob source.
- Mobile document width remains exactly 390 px with no horizontal overflow.
- Browser console and runtime exceptions checked: zero errors.

final result: passed

## Catalog, theme, and guest-selection extension

### Evidence

- Desktop dish catalog: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\implementation-catalog-admin-desktop.png`
- Mobile dish catalog: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\implementation-catalog-admin-mobile.png`
- Mobile dish editor: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\implementation-dish-editor-mobile.png`
- Mobile guest menu: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\implementation-guest-menu-expanded-mobile.png`
- Mobile search: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\implementation-guest-search-mobile.png`
- Mobile selection sheet: `D:\CodexData\visualizations\2026\07\29\019fae8e-803e-7ac0-acb5-4206593114e4\implementation-guest-selection-mobile.png`

### Interactions and responsive checks

- Editing a dish updates its price and persists the catalog in local storage.
- Palette changes and optional table-service actions persist and immediately affect the guest route.
- Search returns the expected single matching dish.
- Adding a dish opens a quantity-aware selection sheet with a calculated total.
- Mobile catalog and mobile dish editor both render at 390 px with 390 px document width and no horizontal overflow.
- The editor save action remains visible on mobile.
- Final visual pass removed the duplicate mobile preview-bar gap and ensured the selection sheet is fully opaque above the menu.
- Browser console and runtime exceptions checked: zero errors.

final result: passed
