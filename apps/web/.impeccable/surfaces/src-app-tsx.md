---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/pages/ResidentPages.tsx","src/pages/CreateProblemPage.tsx","src/pages/ProblemDetailPage.tsx","src/pages/Workspaces.tsx"]
---

Scope: application-wide responsive web surface. Mode: Operate.

Audience and job: residents report and verify city problems; operators triage and assign; contractors execute and report; administrators audit. The next action must be visible within seconds.

Primary action: resident submits a grounded signal from the map; each role advances the same auditable lifecycle.

Proof/content: real API statuses, deadlines, confirmations, assignments, comments, reports, notifications and district indicators. Never invent shift metrics or outcomes.

Direction: fresh civic marketplace, candidate 7 from concept seed `c6ba6ea7`, approved B+C. Large functional color modules from `mocks/login-b-action-shelf.png` combine with the living map language from `mocks/login-c-living-map.png`. The same electric-violet, lime, coral and sky roles continue from auth into the shell, resident map and role workspaces. A compact civic shell opens into a synchronized problem register and 2GIS MapGL map; selected rows and markers share one context panel. Mobile keeps the map full-height and shows a compact content-sized preview with an explicit report link.

Approved comps: `mocks/login-b-action-shelf.png`, `mocks/login-c-living-map.png`.

Component grammar: high-confidence modules rather than generic dashboard cards; 12–16 px corners on working surfaces and larger 20–24 px composition containers; one soft offset shadow only for floating/overlaid surfaces; 1 px lavender-gray rules for dense registers; Onest variable with display weight 760–860, body 450–600, tabular data; controls remain at least 44 px.

Implementation inventory:

| Commitment | Medium | Translation |
| --- | --- | --- |
| Modular login mosaic | Semantic HTML/CSS | Lime signal tile, coral map tile, cyan three-stage flow |
| Living city map | CSS geometry for auth, 2GIS MapGL in product | Abstract geometry stays decorative; real map remains interactive |
| Primary login and report actions | Semantic controls | Violet action surface with explicit labels, focus and loading states |
| Role navigation | Lucide icons + semantic links | Light rail, lime active item, violet identity mark |
| Operational registers | Semantic rows/tables | White working surfaces with readable status chips; no unsupported metrics |
| Responsive behavior | CSS media queries | Mosaic stacks; resident map/list and mobile preview retain report navigation |

Constraints: preserve all role permissions and state-machine truth; Russian copy; WCAG AA; 320–1920 px; browser/Telegram/MAX safe areas; graceful state without 2GIS keys; no OSM/Leaflet fallback.

Unresolved: production domain restrictions and quota policy must be configured in the 2GIS Platform Manager.

Current user-approved refinement (September 2026): preserve the palette and general identity, simplify working screens. The old mission hero is removed; each mission is one row. Operational statistics and profile surfaces are neutral. Form navigation is compact, with a quiet draft note and explicit next-step labels. Large color modules and oversized icons are no longer a requirement on working screens. This instruction supersedes the older working-surface composition above; original login concept references remain historical.

Follow-up refinement: map pins use urgency colours (green, yellow, orange, red), a centred white dot and an isolated layer below controls. Notifications translate legacy status codes and use a visible blue unread dot in the icon corner. The district overview gains a lime wash and larger score, the mission layout stacks content above its action, and the three useful actions are separate bordered buttons.

Latest user instruction: remove dark appearance completely. The mobile “Сообщить” action uses a violet background and white text, regardless of the current destination; only the actual current page receives aria-current. The map preview has no height modes or handle. Profile achievements display the entire catalogue, completed and pending milestones, real progress and earned dates.

Working records use visible deadline, priority and confirmation labels on mobile and desktop. User cards translate roles, label reputation in points and separate account status from block/unblock actions. The district overview uses dark text and a violet score on cream, with a visible 100-point scale on each metric. Muted text has sufficient contrast on light tinted surfaces.
