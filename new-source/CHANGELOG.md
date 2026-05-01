# DealerScan v3.10 Changelog
**Build date:** 2026-04-30
**Source folder:** /Users/brandonbusler/Desktop/DealerScan-Migration/new-source/
**Type:** Backend infrastructure migration. No new user-facing features.

## Why this release exists

The Google account `tgchevydocs@gmail.com` was suspended by Google on 2026-04-29 for automated-bot detection (programmatic Drive activity flagged as inauthentic for a consumer Gmail account). DealerScan's backend was inaccessible. Rather than rely on the appeal process, the entire backend was migrated to a new Google Workspace under `tgchevydocs@dealerscanapp.com` (domain: `dealerscanapp.com`).

## What changed in v3.10

**Code changes (in this extension):**
- `manifest.json`: bumped version 3.9 → 3.10; OAuth client_id replaced with new Cloud project's client (assigned in Phase 5B once new extension ID is known)
- `background.js`: DRIVE_FOLDER_ID and SYSTEM_FOLDER_ID updated to new Workspace Drive folder IDs
- `overlay.js`: DRIVE_FOLDER_ID, SYSTEM_FOLDER_ID, and APPS_SCRIPT_URL updated to point at new Workspace deployment

**Backend changes (Apps Script, deployed separately):**
- New Apps Script project `DealerScan Backend` under `dealerscanapp.com` Workspace
- Linked to new Cloud project `dealerscan-prod` (project number 381110617094)
- Vision API key moved from hardcoded source constant to PropertiesService (script property `VISION_API_KEY`)
- Three Quinn bug fixes carried over from v3.9 plan: getDashConfig HTTP wrap, logScanComplete no-op removed, archiveDailyFolders renamed to archiveAllFoldersDangerous
- One new bug fix discovered during smoke test: getDashOverview / getDashOverviewData now skip rows where timestamp isn't a number (header row guard) — fixes RangeError when ScanLog has a header row

**Infrastructure changes (account-level):**
- Workspace: Business Starter, paid, 2FA enforced with hardware security key
- Cloud project: organization-owned (`dealerscanapp.com`), $300 trial credit + pay-as-you-go
- OAuth consent screen: External audience, production status, Drive scope authorized (unverified — fine at single-dealership scale)
- Chrome Web Store: NEW listing on `tgchevydocs@dealerscanapp.com` developer account (old listing `ljfhbejbbhobkohbfflncfcdkpfkomff` is locked in suspended account, dead). New extension ID assigned by Web Store on first upload (Phase 5B).

## What did NOT change

- iOS Shortcut on Brandon's phone — still works, just talks to a different Apps Script URL once updated
- DealerScan Dash UI / functionality — backend swapped, behavior identical
- Tekion injection flow — unchanged
- All existing v3.9 features (re-upload override, in-panel banner, friendly errors, etc.) — preserved

## User impact (salesperson side)

- Salespeople must **install the new extension** (not an auto-update — it's a new Web Store listing)
- First time they open it, **sign in again** with their personal Google account
- Their **chrome.storage resets** (name, recent folder selection, etc.) — they must re-enter their first name in Settings
- Existing customer folders mid-deal: see Phase 7 of migration playbook for data-recovery options

## Migration phases status as of v3.10 build (2026-04-30)

- Phase 1 (Workspace foundation): ✅ Complete
- Phase 2 (Cloud project + OAuth consent): ✅ Complete (OAuth Client ID deferred to 5B)
- Phase 3 (Drive structure): ✅ Complete
- Phase 4A (Apps Script deploy): ✅ Complete — smoke tested, RangeError fix applied
- Phase 4B (service-account proxy): ⏸️ Deferred — architectural review needed before implementation
- Phase 5A (extension source prep): ✅ Complete (this build)
- Phase 5B (OAuth Client + extension ID resolution): pending Phase 6 first upload
- Phase 6 (Web Store submission): pending
- Phase 7-9 (data migration, cutover, decommission): pending

---

# DealerScan v3.9 Changelog
**Build date:** 2026-04-29
**Source folder:** /Users/brandonbusler/Desktop/DealerScan-3.9/
**Zip:** /Users/brandonbusler/Desktop/DealerScan-3.9.zip
**Git:** local repo initialized, baseline commit on `main`

---

## Summary

v3.9 fixes the upload-button lockout that blocked re-uploads after a Tekion save
failure, adds a 2-press confirmation override for legitimate re-uploads, and
ships a polish pass across reliability, UX, security, and devops.

---

## 🐛 Bugs Fixed

### URGENT-001 — Upload button lockout when Tekion save fails
**Symptom:** Salesperson uploads files. Tekion bugs, page reloads, or save is
never clicked. They try again — get "No new files to upload" forever.

**Root cause:** `chrome.storage.local.set({ [uploadedKey]: nowUploaded })` ran
the moment files were posted to Tekion, not after the parent confirmed
`injectSuccess`. Files were marked uploaded pre-confirmation.

**Fix:** Uploaded file IDs now stash in module-level `pendingUploadedFileIds`
and only commit to `chrome.storage.local` after `injectSuccess` arrives. On
`injectError`, the stash is discarded so retry isn't blocked.

### Quinn-flagged: extraFiles cross-folder leak
Stale extra files queued in Folder A would persist when switching to Folder B
and could be sent to the wrong customer's deal jacket. **Fix:** `extraFiles`
now clears on every folder selection via the new `resetFolderState()` helper.

### Quinn-flagged: upload double-click race
Upload button only got `.disabled = true` inside `showUploadScreen()`, after
several async early-return checks. A fast double-click could trigger two
parallel `uploadToDrive()` runs and double-inject files into Tekion.
**Fix:** button now disabled at the very top of `uploadToDrive()`, with
explicit re-enable on every early-return path.

### Quinn-flagged: status toast / confirm-window timing mismatch
Warning toast hid at 4 s but confirm window stayed live for 5 s — 1-second gap
where the button was primed without a visible warning. **Fix:** `showStatus()`
now accepts an optional `duration` parameter; warning toast holds 5500 ms.

---

## ✨ Features Added

### 2-press re-upload confirmation override (URGENT-001 user-facing fix)
- 1st Upload press when everything is "already uploaded" → yellow warning
  toast: "⚠️ These files were already uploaded. Press Upload again to re-send."
- 5-second countdown bar drains inside the warning so users can see the window
- Upload button itself swaps to "⚠️ Upload Anyway" with yellow gradient and a
  subtle pulse during the 5 s window
- 2nd press within 5 s → override fires, all files re-uploaded
- Logs a `reuploadOverride` event with customer, folder, and file count
- Confirmation flag clears automatically after 5 s, on folder change, or after
  upload success/failure — button visual is fully restored every time

### Persistent in-panel banner (config.message)
- New banner element below the panel header
- Reads `dsConfig.message` from chrome.storage on init
- Subscribes to `chrome.storage.onChanged` so changes from DealerScan Dash
  show up live in the open panel without a refresh
- Hidden when message is empty/unset

### Friendly error translator
Raw API errors now mapped to human-readable text:
- Network errors → "Network issue. Check your connection and try again."
- 401/auth → "Sign-in expired. Hit Refresh and re-authenticate."
- 403/permission → "Permission issue. Manager may need to share the folder."
- 429/quota → "Google rate limit hit. Wait 30 seconds and try again."
- Timeout → "Request timed out. Refresh and retry."
- Tekion-specific messages pass through unchanged (already user-friendly)
- Anything else falls back to "Upload failed: {raw error}"

Wired into both `injectError` handler and `uploadToDrive` catch block.

---

## 🛡️ Security

### IT password removed (Rex #1)
- `IT_PASSWORD = "dscan"` constant deleted from `overlay.js`
- `tryUnlockIT()` now checks `isITUser` only — no password path
- Triple-tap on the version label is a silent no-op for non-IT users; the IT
  screen never even renders for them
- Non-IT users who somehow reach the lock screen get
  "Not authorized. IT access is granted by email." and stay locked out

IT panel access is now exclusively gated by `config.itUsers` email list.

---

## 🎨 UX Polish

| # | Item | Implementation |
|---|------|----------------|
| Sage 1 | Visible countdown for the confirm window | CSS `::after` pseudo-element on `.status.warning` with 5 s linear `dsCountdown` keyframe animation |
| Sage 2 | Button state during confirm window | New `.btn-primary.confirm-pending` class — yellow gradient `#ff9f0a → #d97706`, `dsConfirmPulse` 1 s glow loop, label swaps to "⚠️ Upload Anyway" |
| Sage 3 | Screen-reader accessibility | `role="status"` and `aria-live="polite"` on `#statusMsg` |
| Sage 4 | Friendly error messages | See features section above |

---

## 🚀 DevOps

### Git initialized
`DealerScan-3.9/` now a git repo with `main` branch and v3.9 baseline commit.
`.gitignore` excludes `.DS_Store`, build zips, and `node_modules/`.

### build.sh
One-command release build at `./build.sh`:
- Optional version arg: `./build.sh 3.10` bumps `manifest.json` and the
  visible footer label in `overlay.html`, then builds
- Validates manifest is parseable JSON
- Warns if visible version label doesn't match manifest
- Cleans `.DS_Store` litter
- Excludes `build.sh`, `CHANGELOG.md`, and `.git/` from the zip
- Outputs to parent dir (`../DealerScan-3.9.zip`)

### Visible version label sync
`overlay.html` footer now reads `DealerScan v3.9` (was 3.8). build.sh checks
for mismatches in future bumps.

---

## 📄 Files Modified

| File | Change |
|------|--------|
| `manifest.json` | Version 3.8 → 3.9 |
| `overlay.html` | Banner element + `aria-live` on statusMsg + version label bump |
| `overlay.css` | `.status.warning` + countdown bar + `.btn-primary.confirm-pending` + `.ds-banner` rules |
| `overlay.js` | 4 module-level state vars, 3 helpers (`resetFolderState`, `clearReuploadVisual`, `friendlyError`, `applyBanner`), updated `injectSuccess`/`injectError` handlers, rewrote `uploadToDrive` upload-flow + 2-press override + double-click guard, removed `IT_PASSWORD` const, gated `tryUnlockIT` and triple-tap on `isITUser` |
| `build.sh` | NEW — one-command build script |
| `.gitignore` | NEW — excludes build artifacts and OS metadata |
| `CHANGELOG.md` | This file |

---

## 🚧 Deferred to v3.10 (not fixed in this build)

### Rex #2 — `logEvent` Apps Script endpoint has no auth
The `APPS_SCRIPT_URL + "?action=logEvent&payload=..."` request is
unauthenticated; anyone scraping the extension can flood the events log.
**Why deferred:** requires coordinated Code.gs changes (rate limit + shared
secret) on the Apps Script side. Risk: MEDIUM in current low-volume use, will
become HIGH if the dealership scales or extension source ever leaks publicly.

### Sage #5 — Sales Data search/filter
Manager dashboard sections get long. Fuzzy search exists for folders; needs to
extend to the Sales Data view. Bigger UX scope, separate session.

### Nova #3 — Apps Script dev/prod separation
Currently one Apps Script deployment serves prod. A second deployment for
testing would let us validate Code.gs changes safely. Larger setup task.

### Quinn #2 — Folder switch wipes `uploaded_<id>` storage
Acceptable behavior: with the 2-press override now in place, false-positive
lockouts caused by this are recoverable in 2 clicks. No functional bug.

### Aria — DealerScan Dash overview tile for `reuploadOverride` events
Would let Brandon see at a glance whether the override is being used (and how
often), validating that the root-cause fix is doing its job. Requires
Code.gs + Dash UI changes. Easy add when we touch the Dash next.

### Aria — Release sequencing decision
v3.8 still in Web Store review. Either wait for it to clear and submit 3.9
right after, or withdraw 3.8 and submit 3.9 directly (3.9 is a strict
superset of 3.8). Brandon's call.

---

## 📋 Deployment Checklist

- [ ] Decide release path: wait-then-submit vs withdraw-and-submit-3.9
- [ ] Submit `DealerScan-3.9.zip` (43K) to Chrome Web Store
- [ ] Update `_DealerScan_Config.json` if managers/itUsers haven't been set
- [ ] After approval: trigger override on a real deal jacket and verify the
      `reuploadOverride` event lands in `_DealerScan_Events.json`
- [ ] After approval: set a non-empty `config.message` from DealerScan Dash and
      verify the in-panel banner appears for an open extension session
- [ ] Confirm IT panel still auto-opens for `brandonbusler@gmail.com`
- [ ] Confirm non-IT users see no IT panel even on triple-tap

---

## Release Notes (for Web Store description)

> v3.9 — Adds a confirmation prompt to re-upload files when needed, fixes a
> case where the upload button could lock out after a Tekion save failure,
> shows a manager banner inside the panel, and improves error messages.
