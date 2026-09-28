# Личный кабинет — поверхность `/profile`

## Scope and authority

This is an ordinary extension of the existing working interface. Product authority is
`apps/web/PRODUCT.md`; visual authority is `apps/web/DESIGN.md`. Neither the global
system nor its sidecar is changed by this surface. No new imagery or assets are needed.

## Surface contract

- Keep the shared account identity, role, district or organization, registration date,
  overview/personal-data controls, notification settings, and sign-out.
- Resident: recent reports, actual contribution and reputation, the existing achievement
  catalogue, and links to reports, subscriptions, and missions.
- Operator: queue metrics, reports requiring attention, recent actions, and operational links.
- Contractor: organization task metrics, assigned work, recent actions, organization
  verification, and links to task states. Explain that results require verification.
- Administrator: account, organization, and mission metrics, recent actions, and management links.
- The display name and optional home address are editable here. Role and organization remain administrative facts.
- Home address has its own save, edit and remove actions in personal data. Search and map selection store an address with coordinates. Pending, failed and empty lookups preserve a clear retry path.
- The report location step offers the saved home address when present, device location on request, and another address via search or map. Switching sources cancels stale location responses; the location is retained in the user's draft.
- Show loading, retry, empty, validation, pending, and save-result states explicitly.
  Counts come from the account API, contribution from the profile API; do not invent metrics.

## Visual and responsive behavior

Use the existing lavender canvas, cream surfaces, violet actions, lime identity avatar,
Onest headings, semantic status badges, and shared buttons and fields. Statistics stay
neutral; attention counts use the existing danger ink. Working panels remain flat with
one-pixel separators and 16px corners. This composition is local to the account surface.

The desktop metric strip has four columns. The content becomes one main column below
1150px; the supporting panels then use two columns until 600px. At 600px and below,
metrics use two columns, support panels stack, actions fill available width, and personal
facts put labels above values. Long identity names and report titles wrap. Preserve
visible shared focus and touch targets of at least 44px; verify from 360px upward.

## Evidence checked

Compared `apps/web/src/pages/ProfilePage.tsx` and `apps/web/src/pages/account.css`
with the current global stylesheet, product contract, and design document. Inspected
the saved resident 360px Chrome and operator desktop Chrome first-viewport screenshots
under `.impeccable/review/account/`. Their palette, identity hierarchy, neutral metrics,
and navigation match the incumbent working interface. This documentation check does
not replace functional or overflow tests.

## Existing documentation drift

`apps/web/DESIGN.md` still declares lime secondary buttons in its frontmatter while its
current prose and the final global CSS use violet on a violet wash. Its primary-button
shadow description also predates the later flat-button override. These are pre-existing
system-documentation differences, left untouched in this scoped extension.
