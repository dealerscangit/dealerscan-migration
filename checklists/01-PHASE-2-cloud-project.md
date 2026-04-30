# Phase 2 — Google Cloud Project + OAuth
**Estimated time:** 45-60 minutes
**Prerequisites:** Phase 1 complete ✅
**Goal:** Create the new Cloud project that will own the OAuth client (used by extension sign-in) and the Vision API key (used by Apps Script document detection).

---

## Why this phase second

Apps Script and the Chrome extension both need a Cloud project to live under:
- The **OAuth client ID** is what Chrome shows users when they sign in ("DealerScan wants to access your Google Drive — Allow?")
- The **Vision API key** is what Apps Script uses to detect driver's licenses
- The **OAuth consent screen** is what makes the sign-in flow look legitimate (logo, app name, support email)

We do this BEFORE creating Drive folders or Apps Script because the Cloud project is the parent of everything else. Trying to retrofit a Cloud project onto already-deployed Drive content is annoying.

---

## Brandon's tasks

### 2.1 Create the new Cloud project
- [ ] Open https://console.cloud.google.com signed in as `tgchevydocs@dealerscanapp.com`
- [ ] If you've never used Cloud Console, you may see a "Welcome" / "Accept terms" page. Accept the Google Cloud Platform terms of service.
- [ ] At the top of the page, click the project picker (says "Select a project" or shows whatever project you're currently in)
- [ ] Click **"NEW PROJECT"** in the top right of the project picker dialog
- [ ] Project name: **`dealerscan-prod`**
- [ ] Organization: should auto-populate as `dealerscanapp.com` (this is good — means the project belongs to your Workspace, not your personal Google identity)
- [ ] Location: leave as default (your organization)
- [ ] Click **CREATE**
- [ ] Wait 30-60 seconds for the project to provision. Cloud Console will show a notification when done.
- [ ] Once created, switch to the new project via the project picker — confirm the top of the screen now shows `dealerscan-prod`
- [ ] Note the **Project ID** (shown under project name, may have a suffix like `dealerscan-prod-468245`) — fill into `records/new-resource-ids.md`
- [ ] Note the **Project number** (a numeric ID like `247275535977`) — fill into records too

**Why both IDs matter:** Project ID is the human-readable name you'll see; Project number is the numeric ID that appears in OAuth client IDs. Both will be referenced later.

---

### 2.2 Enable required APIs
We need three APIs turned on for DealerScan to work:

- [ ] In Cloud Console left sidebar: **APIs & Services** → **Library**
- [ ] Search for **"Google Drive API"** → click it → click **ENABLE**
- [ ] Wait ~10 seconds for it to enable
- [ ] Go back to Library, search **"Apps Script API"** → click → **ENABLE**
- [ ] Go back to Library, search **"Cloud Vision API"** → click → **ENABLE**

**Verification:** All three should now appear under APIs & Services → Enabled APIs & Services.

⚠️ **If Vision API enable prompts to enable billing first:** that's expected. The Vision API has a generous free tier (1000 units/month) but Google requires a billing account linked even for free-tier usage. Use the same billing account that pays for Workspace. You'll only be charged if you exceed 1000 doc-detection calls per month, which DealerScan is nowhere near.

---

### 2.3 Configure OAuth consent screen
This is the screen users see when they first sign in to DealerScan ("App wants permission to..."). For an **internal-type** consent screen (recommended), only Workspace users in your domain can sign in. For an **external-type** consent screen, anyone with a Google account can.

⚠️ **Critical decision here:** since salespeople use personal Gmail accounts (Option A from Phase 1), we MUST use **external** type. Internal would block them.

- [ ] Cloud Console left sidebar: **APIs & Services** → **OAuth consent screen**
- [ ] User type: **External** ← important
- [ ] Click **CREATE**

You'll land on a multi-page form. Fill in:

**App information:**
- App name: `DealerScan`
- User support email: `tgchevydocs@dealerscanapp.com` (or `brandonbusler@gmail.com`, your choice)
- App logo: skip for now (can add later — requires hosting an image)

**App domain:**
- Application home page: leave blank (no public site)
- Application privacy policy link: leave blank for now (Phase 4 candidate — we'll add a basic one later if useful)
- Application terms of service link: leave blank

**Authorized domains:**
- Add: `dealerscanapp.com`

**Developer contact information:**
- Email addresses: `brandonbusler@gmail.com` (this is what Google emails when there are issues)

- [ ] Click **SAVE AND CONTINUE**

**Scopes page:**
- [ ] Click **ADD OR REMOVE SCOPES**
- [ ] In the scope filter, paste: `https://www.googleapis.com/auth/drive`
- [ ] Check the box next to **`.../auth/drive`** (See, edit, create, and delete all of your Google Drive files)
- [ ] Click **UPDATE**
- [ ] Click **SAVE AND CONTINUE**

⚠️ **Note:** the Drive scope is sensitive. Google may eventually require app verification (a multi-week review process) if your user count grows. For single-dealership scale (under ~100 users), unverified is usually fine. If you hit a "100 user limit" warning, that's the trigger to start verification. Document this for future-you.

**Test users page:**
- [ ] Click **ADD USERS**
- [ ] Add: `brandonbusler@gmail.com` (so you can test sign-in)
- [ ] Add: any other Gmail addresses you want to test with
- [ ] Click **SAVE AND CONTINUE**

**Summary page:**
- [ ] Review everything looks right
- [ ] Click **BACK TO DASHBOARD**

**Publishing status:**
At the top of the OAuth consent screen overview, you should see: **Publishing status: Testing**.

- [ ] Click **PUBLISH APP** to switch to **Production**
- [ ] Confirm the dialog
- [ ] Status should change to: **Publishing status: In production** with a note about verification possibly being required for sensitive scopes

⚠️ **If you see "Verification required" warnings:** acknowledge them. For Drive scope at low user count, Google allows unverified apps to function with a warning screen during sign-in ("Google hasn't verified this app"). Salespeople will need to click "Advanced" → "Go to DealerScan (unsafe)" the first time they sign in. This is normal for small internal tools and not a blocker.

- [ ] Note: OAuth Consent Screen status: **Production / Unverified** — record in `records/new-resource-ids.md`

---

### 2.4 Create OAuth Client ID for Chrome Extension
This is the credential the extension uses to identify itself to Google during sign-in.

- [ ] Cloud Console left sidebar: **APIs & Services** → **Credentials**
- [ ] Click **CREATE CREDENTIALS** → **OAuth client ID**
- [ ] Application type: **Chrome Extension** ← critical, NOT "Web application"
- [ ] Name: `DealerScan Chrome Extension`
- [ ] Item ID (extension ID): **`ljfhbejbbhobkohbfflncfcdkpfkomff`**
  - This is the existing production extension ID from the Chrome Web Store
  - We use the same one because we're updating the same listing, not creating a new one
- [ ] Click **CREATE**

A dialog appears with the new OAuth Client ID. **CRITICAL — record this immediately:**

- [ ] OAuth Client ID: `_____________________________.apps.googleusercontent.com` — paste into `records/new-resource-ids.md` under "OAuth Client ID"
- [ ] Click **OK**

You can find this Client ID anytime later under APIs & Services → Credentials → OAuth 2.0 Client IDs.

**Why no client secret for Chrome Extension type:** Chrome Extensions don't use client secrets (because the extension code is publicly inspectable). Auth happens via the extension ID being whitelisted in Cloud Console + the OAuth flow being routed through chrome.identity. This is the correct setup.

---

### 2.5 Create Vision API key
- [ ] Still on Credentials page → click **CREATE CREDENTIALS** → **API key**
- [ ] A dialog shows the new API key. **CRITICAL: copy it now and store in your password manager** — Cloud Console doesn't always re-show keys after the dialog closes.
- [ ] Click **EDIT API KEY** (or **RESTRICT KEY** depending on UI version)
- [ ] Name: `DealerScan Vision API Key`
- [ ] **Application restrictions:** select **None** for now (we'll restrict in Phase 4 to limit to the Apps Script project specifically)
- [ ] **API restrictions:** select **Restrict key** → check only **Cloud Vision API**
- [ ] Click **SAVE**

⚠️ **Do NOT paste this key into chat, into git, or into any text file in the migration folder.** Store in password manager only. We'll add it to Apps Script via PropertiesService in Phase 4 — it never lives in source code.

- [ ] Confirm key created and restricted to Vision API only — record in `records/new-resource-ids.md`: `Vision API key: [x] created, restricted to Vision API, stored in password manager`

---

### 2.6 Verify everything is wired correctly
- [ ] APIs & Services → Enabled APIs: confirm Drive API, Apps Script API, Vision API all listed
- [ ] APIs & Services → Credentials: confirm 1 OAuth Client ID (Chrome Extension type) + 1 API key (restricted to Vision)
- [ ] APIs & Services → OAuth consent screen: confirm Production status, External type, Drive scope listed

---

## What does NOT happen in Phase 2
- ❌ No Drive folders created (Phase 3)
- ❌ No Apps Script created (Phase 4)
- ❌ No extension code touched (Phase 5)
- ❌ Vision API key NOT pasted into chat or committed to git (Phase 4 puts it in PropertiesService)

---

## Verification before declaring Phase 2 complete
- [ ] Cloud project `dealerscan-prod` exists, owned by `dealerscanapp.com` org
- [ ] Drive API, Apps Script API, Vision API all enabled
- [ ] OAuth consent screen published in production, External type
- [ ] OAuth Client ID created (Chrome Extension type, ID matches production extension ID)
- [ ] Vision API key created, restricted to Vision API, stored in password manager
- [ ] `records/new-resource-ids.md` updated with Project ID, Project number, OAuth Client ID

When all checked, return to chat and tell Aria: **"Phase 2 complete."**

She'll spot-check your record file and we move to Phase 3 (Drive structure).

---

## Common things that go wrong (and what to do)

**"This API is not authorized for this project"** — go back to APIs & Services → Library and confirm the API is enabled for THIS project (project picker at top). Easy mistake when bouncing between projects.

**OAuth consent screen is stuck at "Testing"** — make sure you clicked PUBLISH APP. Testing mode caps at 100 users and shows scary warnings.

**Vision API key creation prompts for billing** — you must link a billing account to the Cloud project. Use the same one paying for Workspace. Free tier covers DealerScan's volume.

**Wrong organization on project creation** — if the project shows up under "No organization" instead of `dealerscanapp.com`, delete it and recreate. Org-less projects can't be properly governed by Workspace policies.
