# Approved usability improvements — 2026-11-02

Implemented the user's approved seven-step audit, clearer upgrading, journal
dependability, and simpler settings in the existing Quiet Atelier design.
The physical-card ritual, manual review, Classic mode, pricing, and Premium
entitlements are preserved.

## Changes

- One optional question with a skip action and collapsed suggestions.
- Compact deck descriptions on mobile; spread choices precede optional context.
- Optional preparation, with accurate six- or seven-step progress and a direct
  photo-entry path for cards already laid out.
- Entry tabs and the active task precede optional jumper-card controls. The card
  picker searches names and numbers alongside suit filters.
- Card confirmation and correction stay in place. The actual reading's short
  summary precedes collapsed generic spread metadata.
- Purchase price and action appear near the top of the upgrade dialog. Purchase
  information and existing-customer activation have separate disclosures.
- Journal and Settings provide local JSON backup and restore. Import validates
  before preview, keeps existing records, skips duplicates, and respects capacity.
- Local-only storage and archive limits are explicit. Full archives require
  replacement consent and offer a backup first. Failed saves preserve the draft;
  reflection edits also reject stale changes from another tab.
- Reading preferences lead Settings; Premium, advanced AI, and data removal are
  expandable sections.

## Verification

- `npm run build`, `npm test`, syntax checks for edited JavaScript plus the
  reading engine, and `git diff --check` passed.
- Browser checks at 390 × 844 and 1440 × 900: no document horizontal overflow on
  inspected screens; mobile review actions end at y=831 within the 844px viewport.
- Both normal preparation and the skip path were exercised. Manual search found
  The Star; selection, reversal, review, and correction remained available.
- Quick upload shows the photo task first and keeps its required spread choices
  visible. Uploading a synthetic fixture and selecting a spread enabled the
  reading action without submitting an AI request.
- A Classic reading rendered and a saved reading reopened through its reflection.
  The first reading section is “Your Reading in 30 Seconds.”
- The purchase button ends at y=426 on mobile and y=439 on desktop. Keyboard Enter
  opens the upgrade dialog; Escape closes it and restores the opening control.
  No checkout or activation purchase was performed.
- Preference changes persisted after reopening Settings. Advanced configuration
  stays collapsed initially; a Free user has no deactivation control.
- Synthetic data was restored through the file chooser. Downloaded JSON preserved
  the generated reading package, Unicode, notes, reversed cards, and reflection
  links, with no settings or credentials. Re-import added no duplicates.
- An invalid backup changed no entries. Capacity previews kept local entries;
  full reading saves required explicit acknowledgement before replacement.
  Canceling restore opened from Settings returned to Settings.
- A reflection edit saved through the UI. Regression tests also cover storage
  failures, stale edits/previews, corrupt archives, rollback, and Free/Premium caps.
- Browser warning/error logs were empty in the final mobile and desktop checks.

## Screenshot evidence

All files are local JPEG viewport captures, visually inspected from disk:

| File | Evidence |
| --- | --- |
| `01-question-mobile.jpg` | Optional question, skip, visible action bar |
| `02-deck-mobile.jpg` | Compact deck descriptions |
| `03-spread-mobile.jpg` | Spread choices before optional context |
| `04-photo-entry-mobile.jpg` | Active upload task and compact deck selector |
| `05-preparation-mobile.jpg` | Optional preparation |
| `06-card-search-mobile.jpg` | Readable card search and matching result |
| `07-card-review-mobile.jpg` | Confirmed reversed card and visible actions |
| `08-reading-mobile.jpg` | Personalized summary before metadata |
| `09-upgrade-mobile.jpg` | Price and purchase action visible immediately |
| `10-settings-mobile.jpg` | Preferences first, journal backup controls |
| `11-restore-preview-mobile.jpg` | Safe capacity preview |
| `12-capacity-warning-mobile.jpg` | Explicit replacement consent and backup action |
| `13-journal-mobile.jpg` | Local storage warning and archive counts |
| `14-card-review-desktop.jpg` | Desktop confirmation layout |
| `15-settings-desktop.jpg` | Desktop settings hierarchy |
| `16-upgrade-desktop.jpg` | Desktop upgrade dialog |
| `17-quick-upload-mobile.jpg` | Photo task first and visible spread choices |

This QA pass ran locally on `codex/arcana-usability-and-journal`, before the
production release. Deployment status is recorded separately in GitHub Actions.
Backups are portable local files, not automatic cloud synchronization.
