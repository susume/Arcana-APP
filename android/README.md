# Arcana Guide for Android

The bundled Android app uses Capacitor and the same reading screens as the
website. The Play package is `com.arcanaguide.app`, targeting Android 16 (API 36).
The build stages local HTML, scripts, templates, fonts and images, along with the
Android purchase UI. It uses the owned `https://www.arcanaguide.com` origin
inside the WebView so the existing Worker accepts hosted AI requests.

## Build, install, and sign

Run from the repository root with Node.js 22 or newer, JDK 21, and the Android 16
SDK installed. Android Studio's bundled JDK 21 also works.

```powershell
npm ci
npm run android:sync
Push-Location android
.\gradlew.bat :app:assembleDebug :app:bundleRelease
Pop-Location
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.arcanaguide.app/.MainActivity
```

The debug APK is for local installation. For a new Play app, sign the release
bundle with your upload key, then upload it to an internal testing
release. Use **Play App Signing** for Google's distribution key.

```powershell
.\scripts\sign-play-bundle.ps1 -Bundle android/app/build/outputs/bundle/release/app-release.aab -Output dist/play/arcana-guide-1.0.0.aab
```

For a new listing without an upload key, add `-CreateUploadKey` on the first run.
The script keeps its keystore and Windows-user-encrypted password under
`%LOCALAPPDATA%\ArcanaGuide\release-signing` outside Git. Preserve both files
and back up the key and password separately in secure storage before changing
machines. For an existing listing, sign with the upload key already registered
for its package. Increase `versionCode` in `app/build.gradle` for every upload.
A Play install uses a different signature than the USB debug build. Export any
journal on the phone before removing the debug app to install from Play.

## Give internal testers Premium access

Run `npm run android:tester-sync` in place of `npm run android:sync` when
building for the Play Internal testing track. Use the regular sync command
for public builds.

1. Run `node scripts/create-android-tester-code.mjs` to create or reuse the
   code under `%LOCALAPPDATA%\ArcanaGuide\android-testing`.
2. Set the Worker secret `ARCANA_ANDROID_TESTER_CODE_HASH` to the contents of
   `tester-code.sha256` and publish `server/cloudflare-worker.js` with the
   existing Worker bindings.
3. Share `tester-code.txt` privately with invited testers. In the internal
   build, open **Settings → Premium Access → Tester access**, enter the
   code, and select **Activate Premium**.

The Worker checks the code and returns a signed pass. Arcana verifies the pass
when the app starts or resumes. Changing the digest disables previously issued
passes on their next verification.

## Enable Premium and AI reports

1. Link the payments profile in Play Console. After uploading the bundle,
   create and activate the one-time product `arcana_premium_lifetime` with a
   single **Buy** purchase option for permanent access. Set the intended base
   price and region availability. The app displays Google's formatted price.
2. Configure the Android Publisher service account and report storage on the
   existing Cloudflare Worker. Deploy `server/cloudflare-worker.js`. Follow the
   setup in [server/README.md](../server/README.md).
3. Add the test Google account to the internal test and to **License testing**.
   Install from the Play opt-in link and check purchase, pending payment,
   cancellation, restore after reinstall, and refund with revoked access.
   Checkout becomes available after Play returns a price and the Worker
   confirms that purchase verification is configured.
4. Submit a test AI reading report and confirm it reaches `ARCANA_REPORTS`.
   Publish the updated privacy page at `https://www.arcanaguide.com/privacy.html`
   and complete the listing, content rating, and Data safety disclosures
   before public release. Describe the AI request paths, user-submitted
   reports, and purchase processing as configured for the release.

[Play signing](https://developer.android.com/studio/publish/app-signing) ·
[Play Billing setup](https://developer.android.com/google/play/billing/getting-ready) ·
[License testing](https://developer.android.com/google/play/billing/test)
