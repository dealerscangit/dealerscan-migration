# DS Command — Next Session Direction (UPDATED 2026-04-30 morning)
**Active version:** DealerScan v3.9 (in development, work paused)
**Status:** PRODUCTION INCIDENT — `tgchevydocs@gmail.com` Google account suspended for "fake account / bot" violation

---

## How to start next session

Paste the original DS Command handoff doc, then say:

> **"Aria, open the session and pull up `/Users/brandonbusler/Desktop/DealerScan-3.9/NEXT_SESSION.md`. Status update: appeal [granted/denied/still pending]."**

Aria will branch the plan based on appeal status.

---

## Incident summary

- **Affected account:** `tgchevydocs@gmail.com` (free Gmail)
- **Suspension reason:** flagged as fake / bot account
- **Symptoms:** extension sign-in fails, scan docs shortcut returns "violation of Terms of Service" Drive error, all production DealerScan activity halted
- **Root cause:** running production business workflow on consumer Gmail tier — Google's automated systems classified the activity as inauthentic
- **Appeal:** submitted 2026-04-29 evening, awaiting response (typical 1-3 day turnaround)

---

## Strategic decision made (2026-04-30 morning)

Brandon migrated to **Google Workspace** under a fresh domain:
- **New domain:** `dealerscanapp.com`
- **New primary account:** `tgchevydocs@dealerscanapp.com`
- **Recovery email:** `brandonbusler@gmail.com`
- **Phone:** (386) 287-1563

Personal-ownership choice (not Tom-Gibbs-corporate-owned). Strategic implications acknowledged:
- DealerScan is a Brandon-owned product, not a Tom Gibbs asset
- Customer PII liability sits with Brandon
- Future multi-tenant SaaS sale to other dealerships is structurally enabled
- Tom Gibbs corporate compliance/IT may eventually have opinions — Brandon has a clean answer ready

### Decision confirmed (2026-04-30 afternoon)

**Migration to Workspace proceeds regardless of appeal outcome.** The team consulted on whether Brandon should return to `tgchevydocs@gmail.com` if the appeal succeeds. Unanimous answer: no.

- The suspension cause (programmatic activity flagged as bot) is intrinsic to DealerScan's function. Returning to consumer Gmail would re-trigger eventually.
- Consumer Gmail has no DPA, cannot enforce 2FA across users, and reserves rights over content that conflict with handling customer NPI under GLBA.
- The Workspace account is already provisioned. Going back would waste sunk cost.
- Salespeople signing in with personal Google accounts via OAuth still works — they don't need Workspace seats.

If the appeal succeeds: consumer account is used **only** as a one-time data export source, then deprecated. If denied: customer data loss is accepted, deals recreated manually. **In neither case does the consumer account return to production.**

---

## Next session priority order

### PRIORITY 1 — Resolve the production outage (Chunk M = Migration)

The migration is the entire next session. v3.9 feature work is paused until production is restored.

#### Scenario A — Appeal granted before next session

Both accounts work simultaneously. Clean migration possible.

**Phase A1 — Provision new infrastructure under Workspace (60 min)**
1. Sign in to Google Cloud Console as `tgchevydocs@dealerscanapp.com`
2. Create new Cloud project: `dealerscan-prod`
3. Enable Drive API, Apps Script API, Vision API
4. Generate new Vision API key — **store in Apps Script PropertiesService, not hardcoded in Code.gs**
5. Configure OAuth consent screen — internal type if possible (only Workspace users), application name "DealerScan", scopes: `auth/drive`
6. Create new OAuth 2.0 Client ID for Chrome Extension type
7. **DO NOT enter the production extension ID yet** — wait until extension manifest is updated and resubmitted (Phase A4)

**Phase A2 — Recreate Drive structure under Workspace (45 min)**
1. Create parent customer folder: "DealerScan Customers" (note new ID)
2. Create system folder: "DealerScan Data" (note new ID)
3. Create archive folder: "DealerScan Archive" (note new ID)
4. Create CustomerHistory spreadsheet, copy schema from old (note new ID)
5. Share folder structure with `brandonbusler@gmail.com` (manager access) so old account can still see during transition

**Phase A3 — Deploy Apps Script under Workspace (60 min)**
1. Open script.google.com signed in as Workspace account
2. Create new project: "DealerScan Backend"
3. Paste current Code.gs from local file or from old account export
4. Update folder ID constants at top: PARENT_FOLDER_ID, ARCHIVE_FOLDER_ID, SYSTEM_FOLDER_ID, HISTORY_SHEET_ID
5. Replace hardcoded VISION_API_KEY with PropertiesService.getScriptProperties().getProperty('VISION_API_KEY')
6. Set the property in Project Settings → Script Properties
7. Deploy as Web App: execute as "Me", access "Anyone"
8. Note new Apps Script URL — this becomes new APPS_SCRIPT_URL in extension
9. Set up archive trigger and dashboard trigger via setupArchiveTrigger() and setupDashboardTrigger()
10. **Apply Quinn's Code.gs bug fixes during this paste:**
    - Q-A: Wrap auto-discovery getDashConfig in json() for HTTP path; separate plain-object version for google.script.run
    - Q-B: Delete the no-op `sheet.getRange(i+1,8).setValue(sheet.getRange(i+1,8).getValue()||0);` line in logScanComplete
    - Q-C: Delete or rename `archiveDailyFolders` to `archiveAllFoldersDangerous`

**Phase A4 — Update extension source (30 min)**
1. In `/Users/brandonbusler/Desktop/DealerScan-3.9/`:
   - `manifest.json`: replace `oauth2.client_id` with new Cloud OAuth client ID
   - `overlay.js`: update DRIVE_FOLDER_ID, SYSTEM_FOLDER_ID, APPS_SCRIPT_URL constants
   - `background.js`: same constants
   - `content.js`: any constants referenced
2. Bump version to 3.10 (since 3.9 was never published, going to 3.10 makes the migration its own visible release)
3. Update CHANGELOG with migration notes
4. Build via `./build.sh 3.10`
5. Test in DealerScan-Dev folder first — sync source over

**Phase A5 — Submit to Web Store + add OAuth extension ID (45 min)**
1. Upload new zip to Chrome Web Store as version 3.10
2. After upload, get the assigned extension ID (should match existing `ljfhbejbbhobkohbfflncfcdkpfkomff` if it's an update to the same listing)
3. Go back to Cloud Console OAuth client → add the extension ID to authorized list
4. Submit for review — clear changelog: "Backend infrastructure migration. No new features."

**Phase A6 — Migrate active customer data (60-90 min)**
1. From old account, generate Drive Takeout for the customer folders (or manually copy folder by folder)
2. Import into new Drive under new parent folder
3. Copy CustomerHistory spreadsheet content (just data, schema is recreated)
4. Verify Apps Script can read the migrated data

**Phase A7 — Salesperson cutover (varies)**
1. After Web Store review approves 3.10, salespeople auto-update
2. First sign-in with new OAuth client requires re-authorization
3. Their `chrome.storage` resets — name and history will need to be re-set
4. Send team announcement: "DealerScan back online — when you next open the panel, sign in with your normal Google account, set your name in Settings if it's not there."

**Phase A8 — Decommission (do nothing for 30 days)**
- Leave `tgchevydocs@gmail.com` dormant
- Don't delete — keeps as fallback if migration missed anything

#### Scenario B — Appeal denied or still pending after 5 days

Migration proceeds without source data. Customer folders mid-deal may be lost.

Same Phases A1–A5 as above. Replace A6 with:
- **Phase B6 — Recreate active customer state**
  - For any in-flight deals, salespeople manually re-create their customer folder via the new extension's Create Customer flow
  - Brandon notifies team: "All in-progress deals need to be re-scanned. Old documents are not accessible."
  - One-time pain. New deals work normally from this point.

Phase A7–A8 unchanged.

---

### PRIORITY 2 — Resume v3.9 work (only after migration complete)

The original v3.9 chunk plan picks up where we left off. **One change:** what was v3.9 becomes v3.10 (migration release) and the original v3.9 features become v3.11. This is structurally cleaner — the migration is its own dedicated release with no other changes, so any post-migration bugs are clearly attributable.

Original chunks resume in order: B (Code.gs fixes — partially done in Phase A3 above), C (Quick UX wins), D (IT Panel overhaul), E (Personality), F (Reliability + Security), G (Deal-type detection), H (What's New + Feedback button).

---

## Things Brandon should do BEFORE next session (helps either scenario)

### Workspace legitimacy signals (15 min)
- ✅ Add recovery phone (real one)
- ✅ Add recovery email (`brandonbusler@gmail.com`)
- ✅ Add profile picture
- ✅ Set home address in Personal Info
- ✅ Confirm domain ownership in Admin Console (DNS TXT record)
- ✅ Send a few real emails from the address
- ✅ Confirm billing is real and active

### Production state inventory (20 min)
- All current spreadsheet sheet names and column schemas (verify handoff doc is accurate)
- Active customer folders mid-deal (which ones are critical to preserve)
- Current DealerScan Dash settings (managers list, IT users list, banner message text if any)
- Custom Apps Script triggers running
- Vision API key — confirm backed up somewhere safe

### Tekion DOM samples (whenever convenient — not migration-blocking)
For Chunk G (deal-type detection) when we eventually return to v3.11:
- Right-click → Inspect on the New/Used field on a real deal jacket — paste HTML
- Right-click → Inspect on the Cash/Loan field — paste HTML

---

## Files to reference during migration

- `/Users/brandonbusler/Desktop/DealerScan-3.9/` — source of truth for v3.9 code
- `/Users/brandonbusler/Desktop/DealerScan-Dev/` — test environment, sync v3.10 changes here first
- `/Users/brandonbusler/Desktop/DS-Command/NEXT_SESSION.md` — this file (mirror)
- `/Users/brandonbusler/Desktop/DealerScan-3.9/CHANGELOG.md` — update with v3.10 migration entry
- **`/Users/brandonbusler/Desktop/DealerScan-3.9/COMPLIANCE_ROADMAP.md` — review monthly, surface relevant items into each version's planning**
- Original handoff doc — paste at session start

---

## Decisions still owed (not blocking next session, but on the list)

1. **Release sequencing for v3.8** — likely moot now. v3.10 supersedes both 3.8 (in review) and 3.9. May need to withdraw 3.8 from review depending on what the new submission looks like to Web Store reviewers. Aria's call: withdraw 3.8 to avoid confusion, submit 3.10 fresh.
2. **Tom Gibbs corporate notification** — does Brandon want to inform dealership leadership that DealerScan is now running on `dealerscanapp.com` (his personal domain) rather than something tied to the dealership? Not urgent, but worth a clean answer if asked.
3. **Future multi-tenant readiness** — the `dealerscanapp.com` domain choice quietly enables this. Worth a strategic conversation in v3.11 or v3.12 timeframe, not now.

---

## Adaptive principle (carry forward)

> "Anything that captures 'how to do the job' — checklists, templates, goal targets, required docs — has to be configured per dealership or per role via DealerScan Dash, never hardcoded. The extension renders whatever the config says."

Especially relevant now that multi-tenant is a real future option.

---

## Brandon's compliance posture (added 2026-04-30 afternoon)

Brandon has explicitly deferred attorney engagement, written agreements with Tom Gibbs, and LLC formation. He remains committed to **technical** compliance items (2FA, encryption, audit logs, data minimization, vendor hygiene) and these continue in version planning. The full compliance roadmap remains the team's recommendation — see `COMPLIANCE_ROADMAP.md` for context including reactivation triggers.

**Team treatment of this:** acknowledged and respected. Do NOT re-pitch attorney/agreement/LLC items every session. If Brandon brings it up, engage. If reactivation triggers fire (second dealership, incident, leadership inquiry, employment change, value threshold), surface those items again. Otherwise, focus on technical compliance and ship.

---

## Team posture reminder

Brandon: "we work together, and we are a team, always give your feedback and I will give my feedback."

Bug fixes always win against feature work. Migration always wins against bug fixes when production is down.

— Aria, updated 2026-04-30 morning
