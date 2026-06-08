# Arcana AI Proxy

Arcana should not ship the Google API key in browser JavaScript. Use a small server-side proxy instead.

## Cloudflare Worker setup

1. Create a Cloudflare Worker.
2. Use `server/cloudflare-worker.js` as the Worker code.
3. Add a Worker secret named `GOOGLE_API_KEY` with your new Google API key.
4. Deploy the Worker.
5. Copy the Worker URL into `js/config.js`:

```js
const ARCANA_AI_PROXY_URL = 'https://your-worker.your-subdomain.workers.dev';
```

The GitHub repository secret `GOOGLE_API_KEY` is useful for automated deployment workflows, but the static browser app cannot read GitHub secrets at runtime. The live backend/proxy must also have the key as a runtime secret.
