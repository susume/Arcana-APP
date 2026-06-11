# Monetization And Gemini Configuration Design

## Summary

Arcana will move from a hardcoded/local premium unlock to a one-time $29 Gumroad license-key model, while keeping the website itself static and premium-feeling. The existing Cloudflare Worker becomes the small backend API for activation and Gumroad event handling. Users bring their own Google Gemini API key for AI readings and photo identification, with the key stored locally in the browser.

## Goals

- Sell Arcana Premium as a lifetime unlock for a one-time $29 payment.
- Let Gumroad issue a unique license key per purchase.
- Verify license keys server-side before marking a browser as premium.
- Keep premium feature gating on the current `isPremium()` and `requestPremiumFeature()` path.
- Let users save, test, replace, and remove their own Gemini API key in Settings.
- Add a beginner-friendly guide for getting a free Gemini API key from Google AI Studio.
- Preserve the current static app architecture, homepage quality, and physical-card reading workflow.

## Non-Goals

- No account system.
- No subscription billing.
- No server-side user profiles.
- No React, Next.js, Vue, Vite, or framework rewrite.
- No custom email delivery system for Arcana-generated activation keys.
- No attempt to make browser-side local premium state impossible to tamper with. The server remains the source for valid activation, but the static app uses local state for rendering.

## Architecture

Arcana remains a static HTML/CSS/global-JavaScript app. The existing Worker in `server/cloudflare-worker.js` will be expanded into a route-based API:

- `POST /api/activate`
- `POST /api/gumroad/webhook`
- existing AI proxy behavior, kept only as optional fallback if a proxy key is configured

The activation route verifies a buyer-provided Gumroad license key with Gumroad's license verification endpoint. Gumroad's current documentation notes that products created on or after January 9, 2023 require `product_id`, so Arcana will use an environment secret such as `GUMROAD_PRODUCT_ID`.

Worker storage will use a Cloudflare KV namespace binding, for example `ARCANA_LICENSES`, to cache activation records and webhook events. Cloudflare Workers expose KV bindings through the Worker `env` object.

The browser stores the successful premium state in `localStorage` under the existing `arcana_subscription` key:

```json
{
  "tier": "premium",
  "key": "license-key-entered-by-user",
  "source": "gumroad",
  "activatedAt": "2026-06-11T00:00:00.000Z"
}
```

The app stores Gemini settings in the existing `arcana_settings` object:

```json
{
  "geminiKey": "AIza...",
  "readingStyle": "Traditional",
  "readingTone": "Gentle",
  "narratorVoice": ""
}
```

Because this is a static client-side app with no user accounts, browser `localStorage` is the best fit for Gemini API key storage. The UI must explain that the key stays on the user's device/browser and should be a dedicated key they can revoke from Google AI Studio.

## Backend Behavior

### Activation

`POST /api/activate` accepts:

```json
{
  "licenseKey": "XXXX-XXXX-XXXX"
}
```

The Worker normalizes the key, rejects empty input, then calls Gumroad's license verification API with:

- `product_id`: from `env.GUMROAD_PRODUCT_ID`
- `license_key`: user input
- `increment_uses_count`: `false`

If Gumroad returns success and the license is not refunded, cancelled, chargebacked, or otherwise invalid, the Worker stores a KV record keyed by a hash of the license key. The response to the browser is:

```json
{
  "isPremium": true,
  "source": "gumroad",
  "activatedAt": "2026-06-11T00:00:00.000Z"
}
```

Invalid keys return a friendly `400` or `403` JSON error.

### Gumroad Webhook

`POST /api/gumroad/webhook` accepts Gumroad sale/refund payloads. The route will:

- Parse either form-encoded or JSON webhook payloads.
- Store the raw event metadata in KV under an event key.
- If a license key is present, update the cached license record with sale/refund metadata.
- Optionally verify a shared webhook secret if `GUMROAD_WEBHOOK_SECRET` is configured.

The webhook is bookkeeping and revocation support. Activation must still verify the license through Gumroad so the site works even if the webhook was missed.

## Client Behavior

### Premium Unlock

`js/subscription.js` will stop accepting a hardcoded key list. `activatePremiumKey(key)` becomes asynchronous and calls the Worker activation endpoint. The existing premium helpers remain:

- `getSubscription()`
- `saveSubscription()`
- `isPremium()`
- `requestPremiumFeature()`
- `renderEntitlementsUI()`

Existing premium gates using `data-premium-feature` continue to work.

All subscription copy changes from monthly subscription wording to lifetime purchase wording:

- "Premium - $29 lifetime unlock"
- "One-time payment"
- "Unlock Premium forever"

### Settings Modal

The existing Settings modal remains the setup hub. It gets two distinct sections:

1. **Premium Access**
   - Status text: Free plan or Premium active.
   - Activation input.
   - "Activate Premium" button.
   - Link/button to buy on Gumroad, configured through `ARCANA_GUMROAD_PRODUCT_URL`.
   - Deactivate local premium button for support/testing.

2. **AI Configuration**
   - Password input for Gemini API key.
   - "Test & Save" button.
   - Remove key button.
   - Short privacy note: key is saved only in this browser.
   - Link to "How to get a free Gemini API key."

Reading style, tone, narrator voice, and clear-data controls remain below these setup sections.

### Gemini API Key

`loadSettings()` returns `geminiKey`. `saveSettings()` preserves it rather than dropping it.

`callGemini()` uses this priority:

1. Explicit `apiKey` argument.
2. Saved `arcana_settings.geminiKey`.
3. Optional proxy URL only if intentionally configured.

When calling Google directly, the request uses the `x-goog-api-key` header rather than appending the key to the URL, matching current Gemini API reference guidance.

If no AI configuration exists, AI-powered actions show a friendly Settings prompt instead of a technical config error. Classic offline reading remains available.

`testApiKey()` will be implemented or restored in `js/ai.js` and called by Settings. It sends a minimal Gemini request and reports whether the key works.

## Guide Page

The guide will be added as a user-facing help section/modal surface and kept in both template sources where needed:

- `templates/help.html`
- embedded `template-help` in `index.html`

The content will be non-technical and include:

1. Go to Google AI Studio at `https://aistudio.google.com`.
2. Log in with a Google/Gmail account.
3. Open API keys and click "Create API Key."
4. Select "Create API key in a new project."
5. Copy the generated key.
6. Keep it secret and never share it.
7. Return to Arcana, open Settings, and paste the key.

The guide will mention that Google can change labels over time and that users can revoke a key from Google AI Studio if needed.

## Error Handling

- Missing activation key: inline validation message.
- Invalid activation key: "That Gumroad license key was not recognized."
- Worker unavailable: "Activation service is temporarily unavailable. Try again in a moment."
- Missing Gemini key: prompt to open Settings or the guide.
- Invalid Gemini key: "This key could not be validated. Check that it was copied correctly."
- Gemini quota/rate limit: preserve the existing friendly rate-limit messaging.

## Testing

Tests should be added before implementation for:

- Activation no longer accepts hardcoded browser keys.
- Settings preserves `geminiKey`, reading style, tone, and narrator voice.
- Settings template includes Premium Access, AI Configuration, and Gemini guide entry.
- `callGemini()` uses saved keys and sends direct Gemini auth through `x-goog-api-key`.
- Worker `/api/activate` accepts valid Gumroad responses and rejects invalid responses.
- Homepage and upgrade modal copy use one-time $29 lifetime wording.

Existing regression checks must continue to pass:

- `npm test`
- `node --check js/subscription.js`
- `node --check js/storage.js`
- `node --check js/ai.js`
- `node --check server/cloudflare-worker.js`

## Deployment Notes

Cloudflare Worker configuration will need:

- `GUMROAD_PRODUCT_ID`
- optional `GUMROAD_WEBHOOK_SECRET`
- optional `ARCANA_GUMROAD_PRODUCT_URL`
- KV namespace binding: `ARCANA_LICENSES`
- optional `GOOGLE_API_KEY` only if retaining the old Arcana AI proxy fallback

Gumroad configuration will need:

- $29 product.
- License keys enabled.
- Product ID copied into Worker secrets/config.
- Webhook URL pointed at `/api/gumroad/webhook`.

## Open Decisions Resolved

- Use Gumroad's built-in license keys rather than generating custom Arcana keys.
- Keep setup in the existing Settings modal rather than adding a full Settings page.
- Store Gemini API keys locally in browser `localStorage` because Arcana has no accounts or server-side user profiles.
- Preserve current premium gate helpers and conditional rendering patterns.

## References

- Gumroad license keys: `https://gumroad.com/help/article/76-license-keys`
- Gumroad API: `https://gumroad.com/api#licenses`
- Cloudflare Workers KV: `https://developers.cloudflare.com/kv/`
- Gemini API keys: `https://ai.google.dev/gemini-api/docs/api-key`
- Gemini API auth reference: `https://ai.google.dev/api`
