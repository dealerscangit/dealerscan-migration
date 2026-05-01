# Phase 5 — Extension v3.10 Source Update + Web Store First Upload
**Estimated time:** 5A: 30 min (DONE) | 5B: 45-60 min (next session) | 5C: 30 min (next session)
**Prerequisites:** Phases 1-4A complete, Web Store dev account registered ($5 paid, Non-trader)
**Goal:** Get DealerScan v3.10 onto a fresh Chrome Web Store listing under the new dev account, with a working OAuth Client baked in.

---

## ⚠️ Phase 5 is split into three sub-phases

This phase is a **chicken-and-egg dance** — we can't create the OAuth Client without an extension ID, and we can't get an extension ID without uploading the zip first. The split below resolves that dance cleanly.

### Phase 5A — Source prep
Update v3.9 source files with new Workspace constants. Bump version to 3.10. Build a zip with placeholder OAuth Client ID. **DONE 2026-04-30 evening.**

### Phase 5B — First upload + OAuth Client creation
Upload the placeholder zip to Web Store as a draft → get assigned new extension ID → create OAuth Client in Cloud Console with that ID → replace placeholder → rebuild → re-upload final.

### Phase 5C — Listing details
Fill in store listing copy, screenshots, category, privacy declarations. (This sets up Phase 6: actual review submission.)

---

# Phase 5A — Source prep (✅ COMPLETED 2026-04-30)

## What was done
- Cloned v3.9 source from `/Users/brandonbusler/Desktop/DealerScan-3.9/` to `/Users/brandonbusler/Desktop/DealerScan-Migration/new-source/`
- Bumped version 3.9 → 3.10 in `manifest.json` and `overlay.html` footer
- Replaced OAuth client_id with `PHASE_5B_PLACEHOLDER_OAUTH_CLIENT_ID` (placeholder for now)
- Updated `background.js`: DRIVE_FOLDER_ID + SYSTEM_FOLDER_ID → new Workspace IDs
- Updated `overlay.js`: DRIVE_FOLDER_ID + SYSTEM_FOLDER_ID + APPS_SCRIPT_URL → new values
- Updated `build.sh` to exclude migration doc files from shipped zip
- Prepended v3.10 entry to `CHANGELOG.md`
- Built `DealerScan-3.10.zip` (43 KB, 12 files) at `/Users/brandonbusler/Desktop/DealerScan-Migration/DealerScan-3.10.zip`
- Audit-clean: zero stale references to old IDs, six expected new-value matches verified

## Verification (already done)
- [x] manifest.json has version 3.10 and placeholder client_id
- [x] background.js + overlay.js point at new folder IDs and Apps Script URL
- [x] overlay.html footer shows v3.10
- [x] Zip builds cleanly via `./build.sh`
- [x] Zip contains 12 expected files (no docs, no .DS_Store, no .git)
- [x] All committed to git

---

# Phase 5B — First upload + OAuth Client creation

## Brandon's tasks (ordered, do not skip)

### 5B.1 — Upload the placeholder zip to Web Store as a DRAFT

⚠️ **Important:** this is a "throwaway" upload. The placeholder OAuth client_id won't actually authenticate users. We're uploading to *force Web Store to assign a new extension ID*, which we then use to build the real OAuth client. Don't submit this draft for review yet.

- [ ] Open https://chrome.google.com/webstore/devconsole
- [ ] Sign in as `tgchevydocs@dealerscanapp.com` (the new Non-trader dev account)
- [ ] Click **"+ New item"** (or similar — top-right)
- [ ] Upload `/Users/brandonbusler/Desktop/DealerScan-Migration/DealerScan-3.10.zip`
- [ ] Wait for upload to process (10-30 seconds)
- [ ] Web Store will land you on the item edit page

### 5B.2 — Capture the new extension ID

- [ ] On the item page, look at the URL: `https://chrome.google.com/webstore/devconsole/[acct]/[EXTENSION_ID]/edit`
  - Or look for an "Item ID" field somewhere in the listing details
- [ ] Copy the new extension ID (32 lowercase letters)
- [ ] **Update `records/new-resource-ids.md` → "Production extension ID"** with the new value

### 5B.3 — Create the OAuth Client in Cloud Console

This is Step 2.4 from Phase 2 that we deferred earlier.

- [ ] Open https://console.cloud.google.com/apis/credentials?project=dealerscan-prod
- [ ] Verify the project picker shows `dealerscan-prod`
- [ ] Click **+ CREATE CREDENTIALS** → **OAuth client ID**
- [ ] **Application type:** Chrome Extension ← critical, NOT Web application
- [ ] **Name:** `DealerScan Chrome Extension`
- [ ] **Item ID:** paste the new extension ID from 5B.2
- [ ] Click **Create**
- [ ] A dialog appears with the OAuth Client ID — **CAPTURE THIS NOW**

⚠️ **DO NOT REPLY WITH THE OAUTH CLIENT ID VALUE.** Same rule as Vision API key. Save it to Keychain as a Secure Note titled "DealerScan OAuth Client ID" before closing the dialog.

OAuth Client IDs aren't quite as sensitive as API keys (they identify the app, not authorize it on their own), but treating them as secrets is the right discipline.

- [ ] Click **OK** after capturing
- [ ] **Update `records/new-resource-ids.md` → "OAuth Client ID"** to reflect: created and stored in Keychain (do not paste actual value)

### 5B.4 — Replace placeholder in manifest.json

- [ ] Open `/Users/brandonbusler/Desktop/DealerScan-Migration/new-source/manifest.json` in your text editor
- [ ] Find the line: `"client_id": "PHASE_5B_PLACEHOLDER_OAUTH_CLIENT_ID",`
- [ ] Retrieve the OAuth Client ID from Keychain
- [ ] Replace the placeholder with the real value, preserving quotes and trailing comma
- [ ] Save the file

### 5B.5 — Rebuild the zip

- [ ] Open Terminal
- [ ] Run:
  ```
  cd /Users/brandonbusler/Desktop/DealerScan-Migration/new-source
  ./build.sh
  ```
- [ ] Confirm output: `✓ Built ../DealerScan-3.10.zip (43K)` (or similar)
- [ ] **Verify** the placeholder is gone from the rebuilt zip:
  ```
  unzip -p ../DealerScan-3.10.zip manifest.json | grep client_id
  ```
  Should show your real OAuth Client ID, not `PHASE_5B_PLACEHOLDER...`. If it still shows the placeholder, you forgot to save the file in 5B.4.

### 5B.6 — Re-upload to Web Store as a NEW PACKAGE

- [ ] Back to https://chrome.google.com/webstore/devconsole
- [ ] Open the DealerScan item from 5B.1
- [ ] Find **"Package"** section / tab
- [ ] **Upload new package** — pick `DealerScan-3.10.zip` again (same filename, new contents with real OAuth client_id)
- [ ] Confirm upload succeeds and shows v3.10

### 5B.7 — Tell Aria

Reply: **"Phase 5B complete — extension ID is [paste], OAuth Client created, manifest updated, zip rebuilt and re-uploaded."**

(The extension ID is *not* secret — it's public-equivalent. Safe to paste in chat.)

She'll spot-check what she can verify and we move to Phase 5C.

---

# Phase 5C — Listing details (post-OAuth, pre-review)

## What this phase does

The Web Store listing has a lot of metadata to fill in before you can submit for review: description copy, screenshots, category, language, support contact, privacy URL, etc. None of it affects how the extension *functions* — but reviewers absolutely use it to decide approval.

Phase 5C fills all this in. Phase 6 then pushes "Submit for review."

## Brandon's tasks

### 5C.1 — Store listing copy

In the item editor, find **"Store listing"** tab. Fill in:

- [ ] **Item name:** `DealerScan` (probably auto-populated from manifest)
- [ ] **Summary** (132 chars max): `Upload customer documents from Google Drive to your Tekion deal jacket — fast, private, salesperson-friendly.`
- [ ] **Description** (multi-paragraph, 16,000 char limit). Suggested copy:

```
DealerScan is a productivity tool for car salespeople using Tekion DMS. It bridges the gap between scanning customer documents (driver's license, insurance, credit app, etc.) on your phone and getting them into the Tekion deal jacket — without the manual file-juggling that usually slows down deals.

How it works:
1. Scan customer documents using a paired iOS Shortcut (you set this up once)
2. Documents land in a shared Google Drive folder, named for the customer
3. Open the Tekion deal jacket in Chrome, click the DealerScan icon
4. Select the customer folder, choose docs, click upload — files are injected into the deal jacket attachments

Built by a salesperson for salespeople. No subscriptions, no data collection beyond what's needed to run, no ads.

Required permissions:
- Google Drive (read/write your customer folders)
- Tekion (inject documents into deal jackets)

DealerScan is currently used at a single dealership and is not yet sold commercially.

Support: brandonbusler@gmail.com
```

- [ ] **Category:** Productivity (or Workflow & Planning)
- [ ] **Language:** English

### 5C.2 — Icons

Already in the zip (16/32/48/128). Web Store should auto-extract.

- [ ] Verify the icon shows correctly in the listing preview
- [ ] If a 440×280 promotional tile is required: come back to this — it's optional for unverified single-org tools, may be required for production review depending on Web Store rules

### 5C.3 — Screenshots

Web Store requires **at least 1 screenshot, recommended 3-5.** Each must be 1280×800 OR 640×400. PNG or JPEG.

Suggested screenshots to capture (capture them in Chrome with the extension running on a *test* Tekion page or staged scenario):

1. **DealerScan overlay open with folder list** — shows the main UI: signed-in state, customer folder picker
2. **DealerScan overlay with files preview** — shows the file list inside a customer folder before upload
3. **Settings panel** — shows the in-app config (salesperson name, etc.)
4. **DealerScan Dash (manager view)** — if migrated by Phase 5C, shows the analytics dashboard
5. **Mobile shortcut workflow** — optional, shows where the documents originate

⚠️ **Don't include real customer PII in screenshots.** Use mock customer names (`John Doe`, `Jane Smith`), redact any visible identifying info, blur DLs/credit apps if shown.

- [ ] Capture 3-5 screenshots per above
- [ ] Resize/format if needed (1280×800 or 640×400, PNG)
- [ ] Upload each in the listing's Screenshot section

### 5C.4 — Privacy practices declaration

This is a **required** section that asks specific yes/no questions about data handling. Answer carefully — wrong answers here are the most common cause of Web Store rejection.

- [ ] **Single purpose:** *"DealerScan helps automotive salespeople upload customer documents from Google Drive to the Tekion deal jacket UI, replacing manual download-and-reupload steps."*
- [ ] **Permissions justification** — for each permission your extension requests, briefly explain *why* it's necessary. Web Store will list permissions detected from manifest.json. Suggested justifications:
  - **storage**: Persist user's first-name setting, recent folder selections, and offline event queue across sessions
  - **identity**: Sign user in to Google Drive to read their customer folders
  - **alarms**: Periodically poll for new customer folders synced from the mobile shortcut
  - **host_permissions for Tekion**: Inject document upload UI into Tekion deal jacket pages
  - **host_permissions for Google APIs**: Access Drive API for folder/file operations
  - **host_permissions for script.google.com**: Communicate with the dealership's Apps Script backend
- [ ] **Data usage / collection:** Be honest. Suggested answers:
  - Personally identifiable information: **YES** (customer names captured for folder organization, salesperson names for attribution)
  - Health information: NO
  - Financial / payment information: **YES** (customer documents may contain credit applications, bank statements, etc. — the user uploads, not the extension)
  - Authentication information: NO (OAuth tokens are managed by Chrome's identity API, not stored by us)
  - Personal communications: NO
  - Location: NO
  - Web history: NO
  - User activity: minimal (event log of upload success/failure for diagnostic purposes)
  - Website content: limited to Tekion DMS pages where the extension is invoked
- [ ] **Data usage attestations** (these are required checkboxes):
  - "I do not sell user data to third parties" — CHECK
  - "I do not use or transfer user data for purposes unrelated to my item's single purpose" — CHECK
  - "I do not use or transfer user data to determine creditworthiness or for lending purposes" — CHECK
- [ ] **Privacy policy URL:** Web Store requires this for any extension that handles personal data. **You don't have one yet.** Two options:
  - **Option 1 (fastest):** Create a one-page privacy policy as a public Google Doc, paste the URL. Sample copy:
    > *"DealerScan is a productivity extension for automotive salespeople. It accesses Google Drive folders and files belonging to the user, and Tekion DMS pages, to assist with document uploads. DealerScan does not collect, transmit, or sell user data to third parties. Customer document content is read by the extension solely to identify document type (e.g., driver's license) using Google Cloud Vision API; results are used only to name files and are not retained beyond that operation. Salesperson names and recent folder selections are stored locally in the user's browser. Operational event logs (upload success/failure timestamps) are written to the dealership's own Google Drive. For questions: brandonbusler@gmail.com."*
  - **Option 2 (proper):** Host a privacy.html on a domain you control. Slower but more professional.

  Recommend Option 1 for tonight; upgrade to Option 2 when DealerScan goes commercial.

### 5C.5 — Distribution settings

- [ ] **Visibility:** Public, Unlisted, or Private?
  - **Unlisted** is what we want. Means: not searchable in the Web Store, but installable via direct link. Right tradeoff for a single-dealership internal tool. Salespeople get the link via Slack/text.
  - **Public** would put it in search results — not what you want yet
  - **Private** would limit to a Google Workspace group only — overkill for our single-Workspace setup
- [ ] **Geographic distribution:** All regions (or just US — narrower is fine but doesn't help much)
- [ ] **Pricing:** Free

### 5C.6 — Save draft (don't submit yet)

- [ ] Click **Save draft** at the bottom (NOT Submit for review)
- [ ] Confirm everything saved without errors

### 5C.7 — Tell Aria

Reply: **"Phase 5C complete — listing details filled in, draft saved."**

She'll do a quick review walk-through with you (you describe each section, she sanity-checks) before Phase 6 hits "Submit for review."

---

## Common Phase 5 problems

**"Item ID didn't show in the URL after upload"** — sometimes Web Store hides it. Look in the listing's "Privacy" tab or in **More info → Item details**.

**"OAuth Client ID dialog disappeared and now I can't see the value"** — Cloud Console → APIs & Services → Credentials → click the OAuth Client name → the ID is visible there.

**"Web Store says my zip is invalid / missing manifest"** — re-run `build.sh`, verify the zip contents with `unzip -l DealerScan-3.10.zip` — manifest.json must be at the root, not inside a subdirectory.

**"Privacy policy URL is being rejected as not accessible"** — make sure the Google Doc is shared with "Anyone with the link can view" (not domain-restricted). Web Store reviewers don't have your Workspace credentials.

**"Permission justification reviewer keeps rejecting"** — be more specific about WHY each permission is necessary, not just WHAT it does. "storage: persists user's first-name setting" is better than "storage: stores data."
