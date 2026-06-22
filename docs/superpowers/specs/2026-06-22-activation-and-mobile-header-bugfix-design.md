# Activation And Mobile Header Bugfix Design

## Goal

Fix two regressions without changing Arcana's pricing, premium gates, routes, or
static-browser architecture:

1. Premium activation accepts either the Arcana developer key
   `ARCANA-FOUNDER-4F99-2026` or any valid Gumroad license key.
2. The homepage navigation labels `How It Works`, `Premium`, and `Journal`
   remain readable and correctly arranged on mobile.

Arbitrary or invalid activation text must continue to be rejected.

## Activation Design

The browser continues to send all entered activation keys to
`POST /api/activate`. It must not contain a developer-key allow-list.

The Cloudflare Worker will:

1. Normalize the submitted key consistently.
2. Compare its SHA-256 hash with a checked-in hash of the approved developer
   key.
3. Return a premium entitlement with source `developer` when it matches.
4. Otherwise continue through the existing Gumroad verification path.
5. Reject the key when neither verification path succeeds.

The plaintext developer key will not be added to browser JavaScript, templates,
or public UI copy. Successful activation will continue to use the existing
`arcana_subscription` local-storage record and entitlement rendering.

User-facing activation labels and messages will refer to an `activation key`
rather than implying that only Gumroad keys are accepted. Purchase copy may
continue to identify Gumroad as the source of customer license keys.

## Mobile Header Design

At the existing mobile breakpoint, the homepage header will use two rows:

- Row one contains the Arcana brand lockup and Settings button.
- Row two contains the three homepage section buttons in equal-width columns.

The navigation labels will remain centered, readable, and large enough for
mobile use. Existing button handlers, section IDs, focus states, and Settings
behavior remain unchanged.

Only homepage-scoped rules in `src/premium-theme.css` will change. The generated
`css/premium.css` will be rebuilt and committed.

## Testing

Regression coverage will be added before implementation:

- Worker activation accepts the approved developer key without calling Gumroad.
- Worker activation still accepts valid Gumroad keys.
- Invalid keys remain rejected.
- Browser activation copy supports both developer and Gumroad keys.
- Homepage CSS contains the intended two-row mobile header contract.

Verification will include:

- `npm run build`
- `npm test`
- syntax checks for edited JavaScript
- `git diff --check`
- visible browser inspection at a 390-by-844 viewport
- confirmation that the three labels do not overlap, clip, or cause horizontal
  overflow
- confirmation that external and embedded templates remain synchronized

## Scope Boundaries

- No arbitrary-key premium unlock.
- No browser-side activation secret or allow-list.
- No pricing, route, storage-key, premium-gate, or reading-flow changes.
- No unrelated homepage redesign.
