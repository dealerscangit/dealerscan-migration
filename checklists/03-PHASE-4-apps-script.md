# Phase 4 — Apps Script Deployment
**Estimated time:** 4A: 30-45 minutes  |  4B: 60-90 minutes (separate review session)
**Prerequisites:** Phase 3 complete ✅
**Goal:** Deploy a working Apps Script backend to the new Workspace account.

---

## ⚠️ Phase 4 is split into two sub-phases

Aria split this phase because there are two distinct kinds of work:

### Phase 4A — "Minimum viable migration"
- Paste the cleaned-up Code.gs (Quinn's bug fixes applied + Vision API key in PropertiesService)
- Update folder ID constants
- Deploy as Web App
- Test basic functionality
- This restores DealerScan to working state on the new account, with the SAME architecture as before
- After 4A, the system works but external sharing is still ON (because we still use direct Drive sharing to salespeople's personal Gmail)

### Phase 4B — Service-account proxy refactor
- Refactor Code.gs and overlay.js so all Drive operations go through Apps Script
- Eliminates need to share Drive folders with personal Gmail accounts
- Allows External Sharing to be flipped OFF (closing the security loop from Phase 1)
- This is a NON-TRIVIAL refactor, not a config change
- Aria recommends 4B happens in a separate session where Brandon is present, because design tradeoffs will come up that need his input

**Phase 4A gets DealerScan back online. Phase 4B closes the security architecture loop.**

You can run on Phase 4A for as long as you want. You don't have to do 4B immediately — the system functions fully on 4A. Doing 4B is a "tighten the security posture once we have breathing room" move, not a "must happen this week" move.

---

# Phase 4A — Minimum viable migration

## Brandon's tasks

### 4A.1 Create the Apps Script project
- [ ] Open https://script.google.com signed in as `tgchevydocs@dealerscanapp.com`
- [ ] Click **+ New project** (top left)
- [ ] In the editor that opens, change the project name (top of page, where it says "Untitled project") to: **`DealerScan Backend`**
- [ ] Click outside the rename field to save
- [ ] Note: the project URL will look like `https://script.google.com/u/0/home/projects/[SCRIPT_ID]/edit`
- [ ] Copy the SCRIPT_ID portion → record into `records/new-resource-ids.md` under "Apps Script → Script ID"

---

### 4A.2 Link Apps Script to your Cloud project
By default, Apps Script projects are owned by an auto-generated "default" Cloud project. We want it linked to `dealerscan-prod` so the Vision API key works and OAuth uses the right consent screen.

- [ ] In the Apps Script editor, click **Project Settings** (gear icon, left sidebar)
- [ ] Scroll to **Google Cloud Platform (GCP) Project**
- [ ] Click **Change project**
- [ ] Paste the **Project number** from `records/new-resource-ids.md` (the numeric ID, not the project ID name)
- [ ] Click **Set project**

**Why this matters:** without linking, Apps Script uses Google's default GCP project for OAuth scopes, which means the consent screen looks generic and Vision API key won't authenticate. Linking puts Apps Script under your `dealerscan-prod` umbrella.

---

### 4A.3 Set Vision API key in Script Properties
**Critical security step.** The OLD Code.gs hardcoded the Vision API key in source. We're not doing that. Use PropertiesService.

- [ ] In Apps Script editor, click **Project Settings** (still there)
- [ ] Scroll to **Script Properties**
- [ ] Click **Edit script properties** → **Add script property**
- [ ] Property: `VISION_API_KEY`
- [ ] Value: paste the actual key from your password manager (the one you created in Phase 2.5)
- [ ] Click **Save script properties**

**Verification:** the property should now show `VISION_API_KEY = ••••••••` (Apps Script masks it). Never visible in source code, never in version history, never in chat.

---

### 4A.4 Paste the new Code.gs
Aria pre-wrote a clean Code.gs at:
- `/Users/brandonbusler/Desktop/DealerScan-Migration/apps-script-export/Code-NEW.gs`

This file has:
- ✅ Quinn's bug fixes applied (Q-A: getDashConfig wrap, Q-B: logScanComplete no-op removed, Q-C: archiveDailyFolders renamed)
- ✅ Vision API key read from PropertiesService instead of hardcoded
- ✅ Folder ID constants left as `PASTE_NEW_ID_HERE` placeholders for Brandon to fill in
- ⚠️ NO service-account proxy yet — that's Phase 4B

**Action:**
- [ ] Open `Code-NEW.gs` in your text editor
- [ ] Find the constants section near the top of the file
- [ ] Replace each `PASTE_NEW_ID_HERE_*` with the actual ID from `records/new-resource-ids.md`:
  - `PASTE_NEW_ID_HERE_PARENT` → Customer parent folder ID
  - `PASTE_NEW_ID_HERE_ARCHIVE` → Archive folder ID
  - `PASTE_NEW_ID_HERE_SYSTEM` → System / Data folder ID
  - `PASTE_NEW_ID_HERE_HISTORY` → Customer History sheet ID
- [ ] Save the file
- [ ] Open the Apps Script editor again
- [ ] Delete all default content in `Code.gs` (Apps Script's default `function myFunction() {}` placeholder)
- [ ] Paste the entire content of your edited `Code-NEW.gs`
- [ ] Click the **Save** icon (or Cmd-S) — wait for "Project saved" confirmation

---

### 4A.5 Deploy as Web App
- [ ] Click **Deploy** (top right, blue button) → **New deployment**
- [ ] Click the gear icon next to "Select type" → **Web app**
- [ ] Description: `DealerScan Backend v3.10 initial`
- [ ] Execute as: **Me (`tgchevydocs@dealerscanapp.com`)** — this is critical, the script runs with the Workspace user's permissions
- [ ] Who has access: **Anyone** — yes really, the extension and shortcut don't authenticate via Google when calling Apps Script (they pass tokens as parameters). "Anyone" doesn't mean unauthenticated public access in the security sense — it means any caller with the URL can hit the endpoint.
- [ ] Click **Deploy**
- [ ] Authorize access when prompted (you'll get the "Google hasn't verified this app" warning since OAuth consent screen is unverified — click Advanced → Go to DealerScan Backend (unsafe) → Allow)
- [ ] After deployment, copy the **Web App URL** — record into `records/new-resource-ids.md` under "Apps Script → Web App deployment URL"

⚠️ **Save this URL somewhere durable.** This becomes the new `APPS_SCRIPT_URL` constant in the extension (Phase 5). If you lose it, you can re-find it via Apps Script → Deploy → Manage deployments.

---

### 4A.6 Set up triggers
The OLD Code.gs has `setupArchiveTrigger()` and `setupDashboardTrigger()` functions that create scheduled triggers. Run them once to install the triggers.

- [ ] In Apps Script editor, function selector dropdown (next to "Debug" / "Run") — choose `setupArchiveTrigger`
- [ ] Click **Run**
- [ ] Authorize again if prompted (first run of any function triggers an OAuth dialog)
- [ ] Wait for "Execution completed"
- [ ] In execution log, confirm: `Archive trigger set`
- [ ] Switch function selector to `setupDashboardTrigger`
- [ ] Click **Run** → wait for "Execution completed" → confirm log: `Dashboard trigger set`
- [ ] Verify: left sidebar → **Triggers** (clock icon) → confirm two triggers exist:
  - `archiveFoldersOlderThanOneDay` — Time-driven, daily, midnight
  - `setupDashboard` — Time-driven, hourly

---

### 4A.7 Smoke test the deployment
Quick check that the Apps Script is responding before we touch the extension.

- [ ] Open the Web App URL in a browser tab — append `?action=getVersion`:
  - e.g. `https://script.google.com/macros/s/AKfycb.../exec?action=getVersion`
- [ ] Should return: `1.0`
- [ ] Try `?action=getConfig`:
  - Should return JSON: `{"enabled":true,"message":"","managers":[],"itUsers":[],"users":{}}` (empty config is normal — no `_DealerScan_Config.json` exists yet, Apps Script returns the default)

If both return reasonable values: **4A.7 ✅**.

If you get permission errors or 500s: re-check Project Settings → GCP Project link, and re-check Script Properties has `VISION_API_KEY` set.

---

## Phase 4A is complete when:
- [x] Apps Script project created and linked to `dealerscan-prod` Cloud project
- [x] Vision API key in Script Properties (not in source)
- [x] `Code-NEW.gs` pasted with new folder IDs filled in
- [x] Web App deployed, URL recorded
- [x] Both triggers installed
- [x] Smoke test passes

**✅ Phase 4A complete 2026-04-30 ~10:30 PM.**

Smoke tests:
- `?action=getVersion` → `1.0` ✅
- `?action=getConfig` → empty config JSON ✅
- `?action=getOverview` → all zeros / empty arrays ✅ (after RangeError fix for header row)

**Bug found and fixed during smoke test:** ScanLog sheet has a header row I had Brandon create for human readability. Old `getDashOverview` and `getDashOverviewData` didn't filter the header (`row[0]="Salesperson"` is truthy), causing `new Date("Timestamp (ms)")` to throw RangeError. Fix: added `if (typeof row[3] !== 'number') return;` guard before constructing Date in both functions.

Apps Script is now LIVE on the new Workspace account. DealerScan backend is operational.

## ⚠️ Known gap — index.html not migrated

`Code-NEW.gs`'s `doGet` handler returns `HtmlService.createHtmlOutputFromFile("index")` when no `?action=` is given — the in-browser DealerScan Dash. We did NOT create an `index.html` file in the new Apps Script project during Phase 4A. The bare Web App URL would currently throw "File not found: index".

**Impact:** LOW. The JSON endpoints that the extension uses are working (those are the critical path). Only the in-browser dashboard route is broken.

**Fix:** when convenient, paste `index.html` contents from the OLD Apps Script project into a new HTML file in the new project. Phase 4B is a natural time to do this since we'll be touching Apps Script source anyway. Tag this as **Phase 4A.5 — index.html migration** when we get to it.

If recovering `index.html` from the old project is impossible (suspended account inaccessible, no local backup), we have two options: (a) decide the in-Apps-Script HTML dashboard isn't needed because `overlay.html` in the extension provides the same functionality, or (b) rebuild it from scratch. Decision deferred.

She'll do a quick code review of what's deployed (you can paste sections back to her if she asks) and we move to Phase 5 (extension update with new constants).

---

# Phase 4B — Service-Account Proxy Refactor (HOLD)

**⚠️ DO NOT START 4B WITHOUT BRANDON PRESENT IN A SESSION.**

This sub-phase requires architectural decisions that Aria isn't comfortable making autonomously:
- Should the proxy validate user identity via Google ID tokens, or via a simpler shared-secret-per-user model?
- How aggressive should the proxy be about caching file metadata to avoid repeated Drive API calls?
- Should we use `DriveApp` (built-in Apps Script) or `Drive.Files` (Advanced Drive Service) for file ops?
- How do we handle large file uploads (>10MB) that exceed Apps Script's URL parameter limits?
- What's the fallback when the proxy is rate-limited by Apps Script's quotas?

Each of these has tradeoffs that affect performance, security posture, and complexity. Aria has opinions but doesn't want to commit to them without Brandon weighing in.

**When ready to start 4B:** start a new session with Aria, say "ready for Phase 4B," and she'll write the detailed checklist + code changes once the design questions above are answered.

**Until then:** Phase 4A is complete enough to operate DealerScan in production. The security tightening of 4B is desirable but not urgent.

---

## Common Phase 4A problems

**"Service Drive failed while accessing folder"** — folder ID typo or wrong account ownership. Re-check that the new IDs in Code.gs match `records/new-resource-ids.md` and that the folders exist in the Workspace account, not your personal account.

**"Authorization required"** banner that won't go away** — go back through the OAuth dialog. If it keeps prompting, your OAuth consent screen scopes might be wrong (Phase 2.3) — should include `auth/drive`.

**Apps Script editor super slow** — pasting a large Code.gs file triggers re-parsing. Wait 30-60 seconds for the editor to settle. Don't repeatedly hit save.

**"Script function not found: doGet"** when calling Web App URL — your paste didn't include the doGet function. Check the entire Code-NEW.gs was pasted, not just a fragment.

**Triggers don't fire** — Triggers are real but invisible in the editor unless you look at the Triggers sidebar (clock icon). Confirm there.
