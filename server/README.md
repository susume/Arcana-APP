# Arcana AI Proxy

Arcana should not ship the Google API key in browser JavaScript. Use a small server-side proxy instead.

## Cloudflare Worker setup

1. Create a Cloudflare Worker.
2. Use `server/cloudflare-worker.js` as the Worker code.
3. Arcana's Gumroad product ID is already baked into the Worker fallback: `HOp54WHc-rZtK8nTrqtFcg==`. You can still override it with a Worker variable named `GUMROAD_PRODUCT_ID` if Gumroad changes the product.
   Gumroad's seller ID is also baked in for webhook validation: `dNW90VHgyFlXSIHD7Xr6Sw==`. Override with `GUMROAD_SELLER_ID` only if the seller account changes.
4. Optional but recommended: bind a Cloudflare KV namespace named `ARCANA_LICENSES` so activation and webhook metadata can be stored.
5. Add a Worker secret named `GOOGLE_API_KEY` only if you want to keep the old Arcana-hosted AI proxy fallback.
6. Deploy the Worker.
7. Copy the Worker URL into `js/config.js`:

```js
const ARCANA_AI_PROXY_URL = 'https://your-worker.your-subdomain.workers.dev';
```

The GitHub repository secret `GOOGLE_API_KEY` is useful for automated deployment workflows, but the static browser app cannot read GitHub secrets at runtime. The live backend/proxy must also have the key as a runtime secret.
