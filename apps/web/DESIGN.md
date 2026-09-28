---
name: "Пульс города"
description: "A fresh civic marketplace where bold color modules route each signal toward an accountable, verified result."
colors:
  action-violet: "#6547f5"
  action-violet-deep: "#4b2fc8"
  violet-ink: "#5638db"
  violet-soft: "#ece8ff"
  signal-lime: "#c9f269"
  lime-soft: "#effbcf"
  attention-coral: "#ff826f"
  coral-soft: "#ffe5df"
  map-cyan: "#68d9e8"
  cyan-soft: "#dff9fb"
  canvas-lavender: "#f3f0ff"
  surface-cream: "#fffdf7"
  pure-white: "#ffffff"
  surface-quiet: "#f8f6ff"
  surface-lavender: "#ece8fb"
  ink-navy: "#17243a"
  ink-muted: "#596375"
  lavender-line: "#ded9ee"
  map-cream: "#fff8e7"
  success-ink: "#3b6f26"
  success-wash: "#e9f9bc"
  warning-ink: "#b34939"
  warning-wash: "#ffe8df"
  danger-ink: "#bf3f54"
  danger-wash: "#ffe5e8"
typography:
  display:
    fontFamily: "Onest, Segoe UI Variable Text, Segoe UI, ui-sans-serif, sans-serif"
    fontSize: "clamp(28px, 2.4vw, 36px)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Onest, Segoe UI Variable Text, Segoe UI, ui-sans-serif, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Onest, Segoe UI Variable Text, Segoe UI, ui-sans-serif, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.28
    letterSpacing: "normal"
  body:
    fontFamily: "Segoe UI Variable Text, Segoe UI, ui-sans-serif, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Onest, Segoe UI Variable Text, Segoe UI, ui-sans-serif, sans-serif"
    fontSize: "12px"
    fontWeight: 780
    lineHeight: 1.2
    letterSpacing: "normal"
rounded:
  status: "8px"
  tag: "10px"
  field: "13px"
  control: "14px"
  working: "16px"
  feature: "18px"
  composition: "24px"
  continuous: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  module: "14px"
  md: "18px"
  lg: "24px"
  page: "42px"
components:
  button-primary:
    backgroundColor: "{colors.action-violet}"
    textColor: "{colors.pure-white}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "46px"
  button-primary-hover:
    backgroundColor: "{colors.action-violet-deep}"
    textColor: "{colors.pure-white}"
  button-secondary:
    backgroundColor: "{colors.signal-lime}"
    textColor: "{colors.ink-navy}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "46px"
  button-ghost:
    backgroundColor: "{colors.surface-cream}"
    textColor: "{colors.ink-navy}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "46px"
  field:
    backgroundColor: "{colors.surface-cream}"
    textColor: "{colors.ink-navy}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
    height: "46px"
  status-info:
    backgroundColor: "{colors.violet-soft}"
    textColor: "{colors.action-violet-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.status}"
    padding: "3px 7px"
  status-success:
    backgroundColor: "{colors.lime-soft}"
    textColor: "{colors.success-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.status}"
    padding: "3px 7px"
  status-warning:
    backgroundColor: "{colors.coral-soft}"
    textColor: "{colors.warning-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.status}"
    padding: "3px 7px"
  working-surface:
    backgroundColor: "{colors.surface-cream}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.working}"
    padding: "18px"
  module-violet:
    backgroundColor: "{colors.action-violet}"
    textColor: "{colors.pure-white}"
    rounded: "{rounded.working}"
    padding: "18px"
  module-lime:
    backgroundColor: "{colors.signal-lime}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.working}"
    padding: "18px"
  module-coral:
    backgroundColor: "{colors.attention-coral}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.working}"
    padding: "18px"
  module-cyan:
    backgroundColor: "{colors.map-cyan}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.working}"
    padding: "18px"
---

# Design System: Пульс города

## Overview

The existing civic palette and Onest identity remain. The September 2026 usability refinement makes working screens quieter: lavender canvas, cream surfaces, violet actions and small semantic status accents. Large promotional blocks do not belong in task lists or forms.

Page titles use a 28–36px scale, with 24px form titles on mobile. Related facts stay together and each task exposes one clear next action. Color supports navigation and status rather than assigning an arbitrary hue to each metric.

### Working surface rules

- Missions appear once, in divided rows: description and participation conditions on the left, actual community progress and action on the right. On mobile these stack. Personal contribution remains separate from the community total.
- The report form has one compact title bar and six labelled stages. The current stage is underlined; completed stages allow return. Draft restoration is a quiet inline status, never a success banner.
- Profile and operational statistics use neutral surfaces. The district overview uses a lime wash with a prominent score; coral signals attention, not generic section decoration.
- Map pins encode urgency: green for low, yellow for normal, orange for high, red for critical. Their white dot is centred in the pin head. Status stays in text, and map SDK layers stay beneath every application control.
- Notifications use cream surfaces with Russian status names. An unread blue dot sits in the upper-right corner of the icon; read notifications use a quieter surface.
- Beneath the map, district health, mission progress and actions form an aligned grid. The mission has its own labelled button; each useful action has a border, hover state and trailing arrow.
- Use plain Russian task labels. Remove ornamental heading kickers and redundant explanations; keep errors, deadlines, progress, and permissions explicit.
- Preserve 44px controls, visible focus, reduced motion, safe areas, and light appearance from 360px upward.

## Colors

The palette is intentionally vivid, but each hue owns a job. The frontmatter is the normative source for the light palette.

### Primary

- **Electric Action Violet:** Identity marks, primary actions, active view controls, progress steps, and selected navigation icons.
- **Deep Route Violet:** Hover, strong text emphasis, and supporting action states that need more contrast.
- **Violet Wash:** Informational statuses, quiet icon wells, and selected-support surfaces.

### Secondary

- **Signal Lime:** Active sidebar navigation, useful results, district health, and positive summary modules. The resident report action remains violet.
- **Attention Coral:** Assignment, consequence, resolved-summary modules, and warm attention surfaces.

### Tertiary

- **Map Cyan:** Cartographic identity, movement, verification stages, and map-adjacent modules.
- **Semantic Status Inks:** Green, warm brown, and red retain precise success, warning, and danger meaning inside chips and messages.

### Neutral

- **Lavender City Canvas:** The continuous app background behind every role workspace.
- **Cream Working Surface:** Forms, registers, sidebars, top bars, tables, and evidence panels.
- **Quiet Lavender Surface:** Secondary controls, table bands, and low-emphasis system regions.
- **Navy Ink / Muted Ink:** Primary information and supporting metadata.
- **Lavender Rule:** The one-pixel separator for dense operational structures.

### Named Rules

**The Four-Color Routing Rule.** Violet acts, lime advances, coral alerts, and cyan maps or verifies; do not swap these roles for novelty.

**The Status Still Speaks Rule.** Bright color accelerates scanning, but every status remains named in text or reinforced by a value and icon.

**The Warm Canvas Rule.** Cream surfaces sit on lavender; pure white is reserved for high-contrast controls inside saturated modules.

## Typography

**Display Font:** Onest (with Segoe UI Variable Text, Segoe UI, and sans-serif fallbacks)  
**Body Font:** Segoe UI Variable Text (with Segoe UI and sans-serif fallbacks)  
**Label Font:** Onest (with Segoe UI Variable Text, Segoe UI, and sans-serif fallbacks)

**Character:** Onest supplies the confident civic voice: compact, heavy, and highly legible at large sizes. Segoe carries descriptions and dense records with a calmer texture. The pairing creates deliberate contrast between public action and operational detail.

### Hierarchy

- **Display:** Large tightly tracked headings for page identity and major civic statements; the login signal headline expands beyond the shared display range as a signature composition.
- **Headline:** Strong compact section titles for panels, stages, and role workspaces.
- **Title:** Record and card titles that must stay readable inside dense modules.
- **Body:** Familiar system text for explanations, evidence, and discussion, usually constrained to roughly 72 characters.
- **Label:** Heavy Onest for buttons, tags, statuses, table labels, and steps; keep it short and literal.

### Named Rules

**The Big Civic Voice Rule.** Use oversized type for the current civic proposition or workspace purpose, never for routine metadata.

**The Tabular Evidence Rule.** Counts, identifiers, dates, deadlines, and changing measures align with tabular numerals.

## Layout

The system alternates modular compositions with dense working topology. Desktop auth uses a flexible showcase and a 360–430px violet access panel; the showcase itself combines a brand bar, large signal tile, living city-map tile, and three-stage flow. On mobile, the access panel moves ahead of the explainer, the signal tile's semantic button scrolls to that access panel with reduced-motion support, and the living-map tile remains as a compact identity module rather than disappearing. Product workspaces use a 260px cream rail, a sticky 76px top bar, fluid page gutters up to 42px, and a centered working area.

The resident canvas keeps a compact register synchronized with a fluid 2GIS map inside a 22px composite container. Selected rows and markers share a context sheet. At 1080px the shell tightens, at 960px the rail becomes a drawer, and at 760px the register and map become full-height switchable views. Without a 2GIS key, the useful register remains foregrounded. Resident bottom navigation stays in an isolated interaction plane above scrolling content.

Module grids collapse deliberately: two-column or four-column color summaries become two columns and then one; wide tables recompose into stacked records instead of overflowing. The recurring rhythm is 8px for tight internals, 12–14px between siblings, 18–24px inside modules, and up to 42px at page edges.

**Task hierarchy.** Use headings, alignment and spacing for orientation. Reserve large expressive compositions for auth; use quiet rows and surfaces for daily work.

**The Topology-Preserving Rule.** Responsive layouts change order and grouping before they shrink essential targets or force horizontal scrolling.

## Elevation & Depth

The marketplace is layered, not glossy. Working cards and registers remain flat with one-pixel rules. Violet primary actions, identity marks, the resident map/register canvas, and genuine overlays receive a single soft violet-tinted lift. The medium shadow belongs to sheets, drawers, and other surfaces that spatially overlap content.

### Shadow Vocabulary

- **Soft Module Lift:** A low-opacity violet shadow used on compact identity and floating controls.
- **Primary Action Lift:** A slightly stronger violet shadow that grows modestly on hover.
- **Composite Canvas Lift:** A broad, quiet halo under the synchronized resident workbench.
- **Overlay Lift:** The strongest diffuse shadow, reserved for sheets and drawers.

### Named Rules

**The One Soft Lift Rule.** A surface earns shadow only by acting, floating, or containing a composite product canvas; ordinary working cards stay flat.

## Shapes

The form language is friendly and modular. Statuses use compact 8px corners, tags use 10px, fields use 13px, controls use 14px, and working surfaces use 16px. Feature panels and map context rise to 18–22px, while major compositions such as login tiles use 24px. Continuous 999px geometry is reserved for roads, progress tracks, dots, and map-like lines.

One-pixel lavender-gray rules keep dense records precise. Rounded modules may be large, but they remain simple solids; shape never competes with status or content.

## Components

Components feel direct and optimistic: bold enough to guide, disciplined enough to operate.

### Buttons

- **Shape:** Confident rounded rectangles with a 46px minimum height and 14px corners; prominent auth actions rise to 48–52px.
- **Primary:** Electric violet with white text, 20px inline padding, and a soft action shadow.
- **Hover / Focus:** Hover deepens violet and slightly increases lift; active feedback compresses subtly. Focus adds a four-pixel violet halo, and reduced-motion mode removes authored reveal motion.
- **Secondary / Ghost:** Secondary uses violet ink on a pale violet surface. Ghost controls remain quiet. Lime is retained for identity and district health. Mobile navigation uses a quiet inactive state and violet for the current destination.

### Chips

- **Style:** Compact 8px status shapes with heavy labels and soft role-colored backgrounds.
- **State:** Violet is informational or in-process, lime is successful or useful, coral is warning or assignment, and red is disputed or dangerous. Priority and status remain readable without color.

### Cards / Containers

- **Corner Style:** Working cards use 16px; feature modules use 18–24px.
- **Background:** Cream for detailed work; solid violet, lime, coral, or cyan for summaries and civic orientation.
- **Shadow Strategy:** Working cards are flat; composite and floating surfaces follow the One Soft Lift Rule.
- **Border:** One-pixel lavender rule on dense working containers, none on saturated modules.
- **Internal Padding:** Usually 18–24px, increasing on large first-viewport compositions.

### Inputs / Fields

- **Style:** Cream or white field, navy text, lavender stroke, 13px corners, and a 46px minimum height.
- **Focus:** Border becomes action violet with a soft four-pixel violet halo.
- **Error / Disabled:** Errors use explicit copy with danger ink and wash; disabled controls preserve labels and reduce opacity.

### Navigation

- **Desktop:** A 260px cream rail with 46px rows, 14px corners, muted labels, and Lucide icons. The active destination is lime with a violet icon. Logout is isolated in a coral-soft action.
- **Responsive:** The rail becomes a drawer at 960px. Resident navigation becomes a fixed five-destination bottom bar; all inactive destinations are quiet, active destinations are violet, and the isolated z-index plane preserves tap access above long content.

### Operational Statistics

Use a neutral divided strip with readable labels and tabular values. Danger values retain semantic red. On mobile use two columns instead of four full-width decorative tiles.

### Operational Register

Working records use cream surfaces with explicit status, written priority, full title and address. Due dates and resident confirmations keep visible labels on every screen size; an absent deadline reads “Не назначен”. Selection uses a checkbox and violet border. Opening a record has a labelled action. User records show Russian roles, labelled reputation points, account status, and a separate block/unblock action; the current administrator is marked “Ваш аккаунт”.

### Living Map & Context Sheet

Auth uses abstract CSS map geometry as identity; product surfaces use the interactive 2GIS map. The real map and register are one composite canvas. Desktop selection opens an 18px elevated context sheet; mobile uses one content-sized preview with a 44px close button and an explicit link to the full report.

### Civic Auth Mosaic

The auth first view is a composed civic explainer, not a generic centered form: lime introduces the resident signal, coral carries the living-map scene, cyan explains the route to verification, and violet contains access. The signal CTA is a real button that scrolls to the access panel; on narrow screens the panel leads while the compact map remains visible below it, preserving the product's city context.

## Do's and Don'ts

### Do:

- **Do** preserve the four functional color roles across auth, shell, maps, and role workspaces.
- **Do** keep summary statistics neutral and reserve color for actions and semantic statuses.
- **Do** keep every status explicit in words, structure, and color together.
- **Do** preserve 44px touch targets, visible focus, reduced motion, safe areas, and the isolated mobile navigation plane.
- **Do** keep the register useful when 2GIS credentials or map loading are unavailable.
- **Do** stack or recompose dense desktop topology before allowing horizontal scroll.

### Don't:

- **Don't** revive the restrained municipal-blue ledger as the product's visual identity.
- **Don't** use violet, lime, coral, or cyan as interchangeable decoration or repeat a mission in a promotional banner.
- **Don't** place shadows on every working card or add gradients to the solid modular palette.
- **Don't** let abstract map geometry replace the real interactive 2GIS product map.
- **Don't** invent city metrics, outcomes, or SLA claims to fill a colorful module.


### Current mobile and profile rules

The app uses only the light palette, including native controls, regardless of saved or system preferences. Map previews have no resize handle or height modes. Their thumbnail has a fixed crop, titles wrap, and the full report opens through a labelled action. Achievements are a catalogue of 14 milestones with earned/in-progress filters, server-calculated progress and persistent earned dates.

The district score and district name always use dark ink on the cream overview. Every metric identifies its 100-point scale; labels and values occupy separate rows on phones. Muted text uses #596375 to retain contrast on lavender surfaces. Only one sidebar destination is current, including task-status query parameters.
- Resident navigation includes “Мои обращения”; its list is ordered by creation time, newest first. Notifications live in the top bar and show an indicator only when unread items exist.
- Achievements use compact rows. Completed achievements show their date; incomplete ones pair a short progress bar with a count on the same line.
- Map view, filters, location and problem actions retain visible text labels on mobile. Operator fields leave space between labels, focus rings and save actions.
