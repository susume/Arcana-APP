# Search and AI discovery

## Implementation

- The initial homepage is generated from `templates/welcome.html` by the
  existing sync command. Public product copy, pricing, FAQs, and links are
  available before JavaScript runs.
- Startup preserves the homepage, loads the remaining screens, and enables
  app buttons after templates, spreads, and restored state are ready.
- `guide.html`, `faq.html`, `pricing.html`, and `privacy.html` are complete
  static pages with ordinary links, accessible headings, and the existing
  Quiet Atelier theme.
- Canonical URLs, Open Graph/Twitter cards, and product/FAQ structured data
  describe the same product and prices as the visible pages.
- `llms.txt` now describes hosted AI without a required user key and links to
  complete public pages. `robots.txt` permits crawling and links to the sitemap.
- No native Muse/Dots connector or compatibility certification is claimed.

## Validation

- `npm run build`: passed.
- `npm test`: passed, including the new search-discovery regressions.
- `node --check` for `js/app.js`, `js/ui.js`, and `js/reading-engine.js`: passed.
- `git diff --check`: passed.
- Source-level checks verify that the no-JavaScript homepage contains product
  information and working public links, all local public links/assets exist,
  sitemap URLs match canonical URLs, and FAQ schema matches visible answers.
- Startup tests cover a pre-rendered homepage, the older empty shell, file
  loading, a failed template fetch, repeated initialization, and delayed
  spread loading before buttons become active.
- Browser checks used 1365 x 900 desktop and 390 x 844 mobile viewports.
  The homepage and all four public pages had no horizontal overflow.
- The guided CTA opened the question screen; the home control returned to the
  homepage. Startup created only one welcome screen.
- Public navigation targets were at least 44px tall on mobile. The keyboard
  skip link focused the main content, and links had visible keyboard focus.
- No browser console errors or warnings were observed.
- Public-page spacing initially lost to the legacy unlayered CSS reset;
  the new scoped styles now follow that reset and were rechecked visually.
- Linked service privacy/terms pages returned HTTP 200 during validation.

## Production verification

The changes were published from main. GitHub Actions passed on Windows and
Linux, and the GitHub Pages build/deployment succeeded. Fresh HTTPS requests
returned HTTP 200 and matched the local committed contents for the homepage,
all four public pages, robots.txt, sitemap.xml, llms.txt, both changed runtime
scripts, and the generated stylesheet.

The homepage response now exposes 3,382 characters of text without executing
JavaScript, including hosted AI setup and the correct Premium minimum.

Screenshots are stored locally under:

`C:/Users/admin/.codex/visualizations/2026/11/05/01a1aa5a-b799-7222-a717-9cfcb7214ffb/arcana-seo/`

- `faq-desktop.jpg`
- `faq-mobile.jpg`
- `home-mobile.jpg`

The final startup guard changes button availability only before initialization;
its delayed-start behavior is covered by the regression suite.

## Search Console

Search Console indexing and traffic require the site owner's verified Google
property. This repository does not contain those account credentials or a
verification token.

1. Open the verified property for `www.arcanaguide.com`, or verify ownership.
2. Submit `https://www.arcanaguide.com/sitemap.xml`.
3. Inspect the homepage and the four public URLs, check the live rendered
   response, and request indexing.
4. Monitor Page Indexing and Search Performance after recrawling. Technical
   eligibility does not guarantee rankings or inclusion in AI-generated answers.

## HTTPS diagnosis

The apex DNS A records match GitHub Pages and the www CNAME points to
`susume.github.io`. The original approved certificate listed only
`www.arcanaguide.com`; both Python and Windows curl rejected the certificate
for `arcanaguide.com`. Re-saving the same Pages domain alone did not expand
certificate coverage. GitHub's documented recovery is to remove and re-add
the same custom domain to request HTTPS provisioning again.

Keep `www.arcanaguide.com` as the configured custom domain and canonical
host, retain HTTPS enforcement, and verify that the issued certificate covers
both names and that the apex redirects to www after provisioning.

The same domain was removed and re-added through the Pages API, then the
resulting CNAME-only commits were fast-forwarded into the local checkout.
The original www domain and HTTPS enforcement were restored and confirmed.
At the post-deployment check, GitHub still reported the approved www-only
certificate and the apex still failed hostname validation. Certificate
expansion remains unconfirmed; no security checks were bypassed.
