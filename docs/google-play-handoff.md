# Arcana Guide Google Play handoff

## Release status as of November 20, 2026 JST

- **Android production** — Play Console shows **Changes in review** for Arcana Guide (`com.arcanaguide.app`) version `1.0.3` (`versionCode 4`). The submission requests a full production rollout to adults 18 and over in 167 countries and regions. It replaced the pending 1.0.2 release and restarted review. Managed publishing is off, so Play can publish after approval. [Publishing overview](https://play.google.com/console/u/0/developers/6752845458872470623/app/4973861156192596424/publishing)
- **Availability** — The submitted selection includes the U.K., Ireland, and other supported markets. It excludes Belarus, China, Cuba, Hong Kong, Iran, Macao, Myanmar, Russia, and the Rest of World catch-all based on Gemini's published availability. Saudi Arabia and the UAE were held for local review of rules on divination or sorcery. Review merchant requirements before enabling Premium sales in additional markets. [Play production countries](https://play.google.com/console/u/0/developers/6752845458872470623/app/4973861156192596424/tracks/production?tab=countryAvailability) · [Gemini regions](https://aistudio.google.com/docs/available-regions) · [Play country requirements](https://support.google.com/googleplay/android-developer/answer/6223646?hl=en)
- **Web production** — GitHub Pages published merge commit `ffc7464`. Free includes one manually entered, one-card Classic reading per day. The live pricing page and Gumroad offer state the new Premium allowance of 30 hosted AI requests per UTC calendar month. Earlier purchases keep their original allowance. Older Gumroad activations may require the buyer to enter the original key once in Premium Access. [Web pricing](https://www.arcanaguide.com/pricing.html) · [Gumroad offer](https://thelayersapp.gumroad.com/l/vjptlg) · [Release PR](https://github.com/susume/Arcana-APP/pull/5)
- **Play Billing** — The `arcana_premium_lifetime` product and `lifetime` Buy option were active at AU$15.99, CA$13.99, NZ$20.99, and US$9.99 when checked for submission. The dedicated service account has financial data and order management access for Arcana Guide. The live Worker's `/api/play/status` returned HTTP 200 with `ready: true`, confirming Google OAuth readiness. Device checkout, acknowledgement, and restore remain open. [Play product](https://play.google.com/console/u/0/developers/6752845458872470623/app/4973861156192596424/one-time-products/sku/arcana_premium_lifetime) · [Worker setup](../server/README.md)
- **Build and review evidence** — The 1.0.3 release bundle was built, signed with the registered upload key, accepted by Play, and submitted with release notes. Windows and Ubuntu CI passed. The public privacy policy is live, and the review submission includes the private reviewer instructions and Data safety declaration. A signed reviewer session successfully called Gemini through the production Worker. [Privacy policy](https://www.arcanaguide.com/privacy.html) · [Original Data safety evidence](google-play-disclosures.md) · [Release PR](https://github.com/susume/Arcana-APP/pull/5)

## Production Worker

The Worker requires a signed session for hosted Gemini. Live requests without
that session returned HTTP 401 from `/`, `/api/ai`, and `/api/ai/v2`.
Premium photo identification and interpretation each use one hosted request.
Personalized posters and reading comparisons run on the device and use zero
hosted requests.

| Production setting | Value |
| --- | --- |
| Gumroad allowance cutoff | November 20, 2026 at 13:41:07 JST |
| Google Play allowance cutoff and end of unsigned legacy access | November 20, 2026 at 13:50:24 JST |
| New-buyer allowance | 30 hosted requests per UTC calendar month |
| Worker-wide estimated Gemini spend ceiling | US$10 per UTC calendar month |

The paid Arcana Gemini project was on Tier 1 with prepaid billing at rollout.
The original Gemini key appeared in deployment output and was rotated. The
replacement is stored as the encrypted `GOOGLE_API_KEY` Worker secret. Google
rejected the old key, and a live authenticated Arcana AI request passed after
revocation. The temporary Cloudflare deployment tokens were revoked.
[AI Studio Billing](https://aistudio.google.com/billing) · [Worker setup](../server/README.md) · [Architecture](../ARCHITECTURE.md)

## Remaining verification

1. Check Publishing overview for Google's decision. After approval, confirm the production store listing is available and delivers 1.0.3. [Publishing overview](https://play.google.com/console/u/0/developers/6752845458872470623/app/4973861156192596424/publishing)
2. Install the Play-signed build with a license tester. Verify checkout, order acknowledgement, and **Settings → Premium Access → Restore purchases**, including restore after reinstall and access after a revoked purchase. Export any journal before replacing a debug build. The signed bundle is in the Play bundle library. A local copy was built under the release worktree at `dist/play/arcana-guide-1.0.3-production.aab`. [Google Play Billing testing](https://developer.android.com/google/play/billing/test) · [Android build and signing](../android/README.md)
3. On the Play-signed build, confirm the Free manual Classic flow, Premium AI photo identification and interpretation, and Android's file picker for a Premium poster export. [Architecture](../ARCHITECTURE.md)

Automatic Gumroad refund revocation is pending webhook configuration. Gumroad
validates the purchase at activation, and the Worker uses its stored license
status when renewing hosted access. [Worker setup](../server/README.md)

## Credentials

Store `GOOGLE_API_KEY`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, and the entitlement
signing secret as Cloudflare secrets. Keep local service-account backups
outside the checkout. The signing and reviewer-code scripts store credentials
under `%LOCALAPPDATA%\ArcanaGuide`. Keep the reviewer code in Play Console's
private review instructions.
