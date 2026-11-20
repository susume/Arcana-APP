# Arcana AI Proxy

Arcana should not ship the Google API key in browser JavaScript. Use a small server-side proxy instead.

## Cloudflare Worker setup

1. Create a Cloudflare Worker.
2. Use `server/cloudflare-worker.js` as the Worker code.
3. Arcana's Gumroad product ID is already baked into the Worker fallback: `HOp54WHc-rZtK8nTrqtFcg==`. You can still override it with a Worker variable named `GUMROAD_PRODUCT_ID` if Gumroad changes the product.
   Gumroad's seller ID is also baked in for webhook validation: `dNW90VHgyFlXSIHD7Xr6Sw==`. Override with `GUMROAD_SELLER_ID` only if the seller account changes.
4. Bind a Cloudflare KV namespace named `ARCANA_LICENSES`. It is required for webhook idempotency and license status records.
5. Add Worker secrets named `ARCANA_ENTITLEMENT_SECRET` and `GUMROAD_WEBHOOK_SECRET`. The first signs browser entitlement metadata; the second authenticates Gumroad events. Never place either secret in the static app.
6. Add a Worker secret named `GOOGLE_API_KEY` only if you want to keep the Arcana-hosted AI proxy fallback.
7. Add a Worker variable named `ARCANA_ALLOWED_ORIGINS` when the production site uses a different origin. Values are comma-separated exact origins; unknown browser origins are rejected.
8. Configure a Cloudflare Rate Limiting binding named `ARCANA_RATE_LIMITER` for distributed production limits. The Worker keeps only a best-effort isolate-local fallback when the binding is unavailable.
9. Deploy the Worker.
10. Copy the Worker URL into `js/config.js`:

```js
const ARCANA_AI_PROXY_URL = 'https://your-worker.your-subdomain.workers.dev';
```

The GitHub repository secret `GOOGLE_API_KEY` is useful for automated deployment workflows, but the static browser app cannot read GitHub secrets at runtime. The live backend/proxy must also have the key as a runtime secret.

The Worker enforces exact-origin CORS, body and prompt limits, JPEG/PNG/WebP image
validation, upstream timeouts, and route-specific rate limits. It stores only
hashed license identifiers and minimal event metadata in KV; raw license keys,
emails, and webhook payloads are never persisted.

## Founder activation

`POST /api/activate` verifies the approved founder key by its SHA-256 digest
before the Gumroad path. It issues the same signed entitlement token, records
only hashed metadata, and never forwards founder credentials to Gumroad. Invalid
keys remain rejected. `ARCANA_ENTITLEMENT_SECRET` is required for both paths.

The server-side `ARCANA_FOUNDER_LICENSE_HASH` variable can override the approved
digest for rotation. Setting it to an empty value disables founder activation.
Never put an activation key or digest allow-list in browser JavaScript.

## Hosted AI rollout

The web client exchanges its signed Gumroad activation receipt for a 15-minute
hosted AI session. Android receives the same session from Play purchase
verification or the existing reviewer and tester verification flows. The new
`POST /api/ai/v2` endpoint requires that session before it forwards any content.

Deploy the shared Worker with the Durable Object binding and SQLite migration in
`server/wrangler.jsonc`. Add the existing production KV and rate-limit bindings
to the deployment configuration before using it to update the live Worker.
Retain the deployed Worker secrets. The file in this repository defines only
the new binding and serves as the local Worker configuration.

| Variable | Purpose |
| --- | --- |
| `ARCANA_AI_MONTHLY_BUDGET_USD` | Monthly ceiling for estimated Gemini model charges in USD. Hosted AI stays unavailable until a positive ceiling is set. |
| `ARCANA_AI_PLAN_START` | UTC instant at which the new 30-request allowance applies to Gumroad sales. |
| `ARCANA_PLAY_AI_PLAN_START` | UTC instant at which the new 30-request allowance applies to completed Play purchases. |
| `ARCANA_AI_LEGACY_UNTIL` | Optional UTC expiry for legacy app compatibility. The old endpoints require a signed session after this instant. |

Configure each cutoff when its purchase offer changes. Purchases before the
relevant cutoff retain their previous allowance. The allowance resets at the
start of each UTC calendar month. The meter reserves one request and estimated
spend before the Gemini call, rejects duplicate request IDs, and reconciles
the spend when Gemini returns token counts. A request with an unknown outcome
keeps its reservation. The application sends no poster artwork or poster
rendering work to Gemini. Metrics record operation, model, token counts and
finish reason without logging prompts, card photos, or purchase credentials.

## Google Play purchases and Android reading reports

1. Enable **Google Play Android Developer API** in Google Cloud. Give the
   service account Play Console access to `com.arcanaguide.app` and the billing
   permissions to view financial data and manage orders. The app uses the
   one-time product `arcana_premium_lifetime`.
2. Put the complete service-account JSON into the Worker secret
   `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`. Keep `ARCANA_ENTITLEMENT_SECRET` configured
   and retain the existing browser origins, including
   `https://www.arcanaguide.com`. The Android app uses that origin for its bundled
   WebView and does not receive the service-account credentials.
3. Bind a Cloudflare KV namespace as `ARCANA_REPORTS` to accept Android AI
   reading reports. The value contains only the user-selected reason, the
   submitted reading text, and its report time. Reports expire after 90 days.
4. Deploy the Worker. `POST /api/play/status` checks OAuth configuration before
   the app offers checkout. `POST /api/play/verify` checks Google ownership,
   acknowledges completed purchases, and returns signed Premium metadata.
   Pending or revoked purchases cannot unlock Premium. The app rechecks
   ownership when opened, resumed, or explicitly restored with Play.
   `POST /api/reading-report` records a report only when the user submits it.

Use a Play license tester to verify that Google grants the service account
the needed permissions for both purchase lookup and acknowledgement.
The Worker never stores Play purchase tokens. A purchase that completes after
the user leaves is processed when the app next checks Play ownership.

## Android tester access

`POST /api/android/tester` verifies the digest in the
`ARCANA_ANDROID_TESTER_CODE_HASH` secret and signs a tester pass using
`ARCANA_ENTITLEMENT_SECRET`. The same route rechecks passes. Removing the
digest disables the tester endpoint. Rotating the digest invalidates the old
code and its passes. See [Android tester setup](../android/README.md) for the
internal build and code-generation commands.

The public Android app exchanges Google Play review codes at
`POST /api/android/review`. Its digest is `ARCANA_ANDROID_REVIEW_CODE_HASH`, and
the Worker signs review passes separately with `ARCANA_ENTITLEMENT_SECRET`.
See [public review setup](../android/README.md#prepare-public-review-access-and-disclosures).
