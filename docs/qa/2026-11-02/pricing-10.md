# Premium minimum contribution — 2026-11-02

- Raised the one-time Premium lifetime minimum from US$5 to US$10, as requested.
  The optional US$20 suggested contribution and the same Premium features at
  every price are retained, including unlimited readings.
- Updated the homepage, Settings, upgrade dialog, embedded templates, pricing
  documentation, and existing pricing checks. The homepage offer now explicitly
  mentions unlimited readings.
- Saved the Gumroad product's amount/minimum as US$10 with US$20 suggested, and
  updated its pricing paragraph. Reloading the editor confirmed persistence;
  the public product page showed US$10+ and the matching description in USD.
- The product URL, product ID, activation flow, and existing licenses are kept.
  No purchase or license activation was performed during this pricing check.
- `npm run build`, `npm test`, JavaScript syntax checks, and `git diff --check`
  passed. No US$5 offer remains in runtime templates or JavaScript.
- At 1440 × 900 and 390 × 844, the upgrade price and purchase action are visible
  without horizontal document overflow. The mobile purchase button ends at
  y=426 within the 844px viewport. Settings displays the same US$10 offer;
  Escape closes the dialogs. Browser warning/error logs are empty.
- Visually inspected screenshots: `18-ten-dollar-upgrade-desktop.jpg`,
  `19-ten-dollar-upgrade-mobile.jpg`, and `20-ten-dollar-gumroad.jpg`.

App release status is tracked in GitHub Actions. Gumroad pricing was saved and
verified before publishing the matching app copy.
