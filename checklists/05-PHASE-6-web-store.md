# Phase 6 — Web Store Submission + Review
**Status:** Phase 6A + 6B ✅ COMPLETE | Phase 6C (rejection handling) and 6D (post-approval) remain pending Web Store reviewer outcome
**Submitted:** 2026-05-01 ~10:18 PM EDT
**Expected review duration:** 3-7 business days
**Goal:** Submit v3.10 to Chrome Web Store, navigate the review, get listing approved.

---

## ⚠️ This phase has waiting

Once you click "Submit for review," there's nothing to do for 3-7 days while Google's reviewers go through it. Don't sit and refresh — they email when they have feedback or approve. Use the time productively (Phase 4B service-account proxy implementation is a great fit for this waiting period).

## Outcome of Phase 6A + 6B (2026-05-01 evening)

✅ **6A.1 — Build sanity check passed:** Production zip on Web Store has real OAuth Client ID (verified by JSON parse + format check). Dev install end-to-end sign-in tested successfully against new Apps Script backend.

✅ **6A.2 — Listing review passed:** Brandon walked through Store listing tab (name, summary, description, category, language, icon, 4 screenshots) with fresh eyes. No typos or contradictions found.

✅ **6A.3 — Privacy match check passed:** Six cross-checks between Privacy Practices declarations and Privacy Policy doc, all matched (PII, financial, health, location, third-party transfer, creditworthiness).

✅ **6A.4 — Distribution verified:** Unlisted, all regions, free.

✅ **6A.5 — Publisher contact email:** brandonbusler@gmail.com entered + verified at Web Store dev account Settings level (this was caught by the "Unable to publish" dialog after first Submit attempt — fixed in ~5 min).

✅ **6B — Submitted for review:** Click made 2026-05-01 ~10:18 PM EDT. Listing status changed to "Pending review."

---

# Phase 6A — Pre-submission review

Before you click submit, walk through everything one more time. Reviewer rejections cost a full review cycle to fix.

## Brandon's tasks

### 6A.1 — Sanity check the build

- [ ] The zip uploaded to Web Store has the REAL OAuth Client ID, not the placeholder
  - Verify in Cloud Console → Credentials → OAuth Client → matches what's in manifest.json
- [ ] Test install the extension yourself BEFORE submitting:
  - Chrome → chrome://extensions → enable Developer mode (toggle top-right)
  - Click "Load unpacked" → point at `/Users/brandonbusler/Desktop/DealerScan-Migration/new-source/`
  - Confirm extension loads without errors
  - Click the DealerScan icon in toolbar → overlay opens
  - Sign in with `brandonbusler@gmail.com` (test account) — confirm OAuth flow works end-to-end
  - Open Tekion in another tab → confirm content script injects (DealerScan icon appears or whatever the integration is)
  - Quick smoke: select a customer folder, attempt to upload — confirm Apps Script backend responds

⚠️ **If the test install fails**: stop, debug, do NOT submit. Reviewers will reject for the same reasons your local install fails.

### 6A.2 — Sanity check the listing

- [ ] Open the listing's preview view in Web Store dev console
- [ ] Verify all screenshots render correctly (no PII, right resolution)
- [ ] Verify description copy reads cleanly (no typos, no leftover placeholder text)
- [ ] Verify privacy policy URL opens to a real, public document
- [ ] Verify category is set, language is set, distribution is Unlisted

### 6A.3 — Verify privacy declarations match reality

The most common rejection reason is mismatch between declared data practices and actual extension behavior. Walk through:

- [ ] Did you declare PII collection? Yes (customer names) — matches reality
- [ ] Did you declare financial info? Yes (uploaded docs may contain it) — matches reality
- [ ] Did you decline location data? Yes — matches reality (extension doesn't access location)
- [ ] Did you decline health info? Yes — matches reality
- [ ] Did you check the "no third-party transfer" box? Yes — matches reality (Apps Script is your own backend, not a third party)
- [ ] Single purpose declaration — read it again, does it accurately describe what DealerScan does?

If anything's off, fix it before submitting.

---

# Phase 6B — Submit for review

## Brandon's tasks

### 6B.1 — Click submit

- [ ] In Web Store dev console, open the DealerScan item
- [ ] Click **"Submit for review"** (top-right or footer)
- [ ] Confirm in the dialog that pops up
- [ ] Listing status changes to **"Pending review"**

### 6B.2 — Note the submission timestamp

- [ ] Record submission time in `records/new-resource-ids.md` → "v3.10 submission status"
  - e.g. "Submitted YYYY-MM-DD HH:MM ET, awaiting review"

### 6B.3 — What happens during review

- Google reviewers (humans + automated tools) check the extension over **3-7 business days**
- For an extension with the **Drive scope (sensitive)** but unverified app status, expect closer to 7 days
- They check:
  - Extension code matches what manifest declares
  - Privacy practices declarations match observed behavior
  - No malicious code, no abusive patterns
  - Listing copy and screenshots are accurate
- If approved: you get an email, listing goes live (Unlisted = installable via direct link only)
- If rejected: you get an email with specific reasons; you fix and resubmit

### 6B.4 — While waiting

⏸️ **Don't refresh the dev console every hour.** It won't make it faster.

Productive uses of the waiting period:
- **Phase 4B** — service-account proxy implementation (architectural review session with Aria)
- **Phase 7 prep** — decide what to do about active customer data on the suspended account
- **Phase 5C.4 follow-up** — write a more proper privacy policy hosted on a real domain, replace the Google Doc URL once approved
- **Sleep, eat, do other dealership work** — DealerScan is offline anyway, no point burning yourself out

---

# Phase 6C — Handle reviewer feedback (if any)

## Common rejection reasons + how to respond

### "Permissions are broader than necessary"
- **Cause:** Extension declares `<all_urls>` host permission or `tabs` permission for things it doesn't actually use
- **Fix:** Tighten manifest.json host_permissions to specific URLs (you've already done this — should be safe)
- **Resubmit:** Edit manifest, rebuild zip, re-upload, resubmit

### "Single purpose violation"
- **Cause:** Extension does multiple unrelated things (e.g., a "weather extension" that also tracks shopping prices)
- **DealerScan risk:** LOW — it does one thing
- **Fix if hit:** Tighten the single-purpose declaration; remove any code paths reviewers flag

### "Privacy practices declarations don't match behavior"
- **Cause:** You said "no PII collection" but the code reads PII; you said "no financial data" but uploaded docs contain it
- **Fix:** Update declarations to be honest, resubmit
- **Lesson:** Be honest in 5C.4 the first time — easier than re-declaring

### "Excessive or undisclosed data collection"
- **Cause:** Reviewer thinks you're collecting more than declared. Often triggered by the analytics/event log we ship.
- **Fix:** Add explicit detail to privacy policy: "Operational event logs (timestamps, error types) are written to the dealership's own Google Drive for system diagnostics. No data leaves the dealership's Google environment."
- Resubmit

### "Privacy policy URL inaccessible or insufficient"
- **Cause:** Google Doc isn't public, or doesn't address the data practices the extension uses
- **Fix:** Verify "Anyone with the link can view"; expand the policy to address all declared data uses
- Resubmit

### "Use of remote code"
- **Cause:** Manifest V3 strictly limits eval/dynamic code loading; reviewer detected something
- **DealerScan risk:** LOW — no remote code in current source
- **Fix if hit:** Audit any `new Function()`, `eval()`, dynamic script tags, etc. — replace with static code
- Resubmit

## Brandon's response process

When you get a rejection email:

- [ ] Read the specific reason (Google emails them; usually clear)
- [ ] Open the migration session, paste the rejection text to Aria for analysis
- [ ] Aria identifies which file(s) to change and exactly what to change
- [ ] Make the change in `new-source/`, commit to git
- [ ] Rebuild zip via `./build.sh`
- [ ] Re-upload to Web Store as new package version
- [ ] Resubmit for review (clicks the same button as 6B.1)
- [ ] Note resubmission in records

⚠️ **Each resubmission = full new review cycle (3-7 days).** Get the fix right the first time. Don't fire-and-forget; verify the fix actually addresses what was rejected.

---

# Phase 6D — Post-approval

## Brandon's tasks once you get the approval email

### 6D.1 — Verify listing is live

- [ ] Open the public Web Store URL for DealerScan (Web Store provides the URL in the approval email)
- [ ] Confirm "Unlisted" — page loads when you visit directly, but doesn't appear in search
- [ ] Note the **Web Store install URL** in `records/new-resource-ids.md`

### 6D.2 — Test install from Web Store (not unpacked)

This is the install path your salespeople will follow.

- [ ] In a clean Chrome profile (or after removing your unpacked install)
- [ ] Visit the Web Store install URL
- [ ] Click "Add to Chrome"
- [ ] Confirm the install dialog (lists scopes — Drive, etc.)
- [ ] Extension installs; icon appears in toolbar
- [ ] Click icon → overlay opens
- [ ] Sign in flow works end-to-end
- [ ] Test full upload flow on a real (or staged) Tekion deal jacket

If anything fails here: stop, do NOT announce to the team yet, debug.

### 6D.3 — Verify Apps Script connectivity

- [ ] After signing in via the production extension, open Apps Script project
- [ ] Run any function (e.g., `getDashConfig` from editor) → confirm no errors
- [ ] Confirm the extension's auth pings show up in Apps Script's Executions log

### 6D.4 — Phase 8 trigger

When test install + apps script connectivity both pass: ready for Phase 8 (team cutover, salesperson onboarding).

⚠️ **Don't announce to the team until 6D.2 and 6D.3 both pass.** Premature announcement leads to "I clicked install and nothing works" support requests during your hardest day.

### 6D.5 — Tell Aria

Reply: **"Phase 6 complete — listing approved, install verified, Apps Script connectivity confirmed. Ready for Phase 8."**

---

## Common Phase 6 problems

**"My listing was approved but salespeople can't install"**
- Likely cause: visibility set to Private (Workspace-only) instead of Unlisted
- Fix: Web Store dev console → Distribution → change to Unlisted, save (no resubmission needed for distribution settings)

**"Approval email says approved but listing still shows pending"**
- Web Store sometimes lags. Wait an hour, refresh.

**"Rejected for 'developer not verified'"**
- Different from extension verification — this is your *Web Store dev account* not being verified
- Usually requires email verification or 2FA confirmation that you completed during $5 registration; if missed, dev console will prompt
- Resolves quickly once you complete the missing step

**"Reviewer asked clarifying questions, didn't outright reject"**
- Reply through the dev console support thread (NOT email)
- Be concise, factual, and provide screenshots if helpful
- Doesn't restart the review clock; stays in queue

**"Listing approved, but my install still shows the old placeholder OAuth client_id"**
- You uploaded the wrong zip in 5B.6 — the placeholder version, not the rebuild
- Fix: rebuild with correct OAuth client_id, upload, RESUBMIT for review (yes, full new cycle)
- Lesson: always verify zip contents before upload (5B.5 grep step)
