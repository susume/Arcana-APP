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
