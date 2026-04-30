# Phase 3 — Drive Structure
**Estimated time:** 20-30 minutes
**Prerequisites:** Phase 2 complete ✅
**Goal:** Recreate the Drive folder structure (parent / system / archive) and the Customer History spreadsheet under the Workspace account, ready for Apps Script to use.

---

## Why this phase before Apps Script

Apps Script needs Drive folder IDs hardcoded into its constants. We can't deploy Apps Script (Phase 4) without knowing those IDs. So Drive structure goes first.

We're NOT migrating customer data yet — that's Phase 7. Right now we're just creating empty container folders.

---

## Brandon's tasks

### 3.1 Create the parent customer folder
- [ ] Open https://drive.google.com signed in as `tgchevydocs@dealerscanapp.com`
- [ ] In the left sidebar, click **My Drive**
- [ ] Click **+ New** → **New folder**
- [ ] Name: `DealerScan Customers`
- [ ] Click **Create**
- [ ] Open the folder by double-clicking
- [ ] In the URL bar, find the folder ID:
  - URL looks like `https://drive.google.com/drive/folders/1A2B3C4D5E6F7G8H9I0J`
  - The ID is everything after `/folders/`
- [ ] Copy that ID and paste into `records/new-resource-ids.md` under "Customer parent folder"

⚠️ **Do not share this folder externally.** Per the storage architecture decision, salespeople will access these folders via the service-account proxy in Apps Script (Phase 4), not by direct sharing.

---

### 3.2 Create the system / data folder
- [ ] Back to **My Drive**
- [ ] **+ New** → **New folder**
- [ ] Name: `DealerScan Data` (NOT `_DealerScan_Data` — leading underscore is a convention from old Code.gs that we don't need anymore since we're not co-located with customer folders)
- [ ] Open it, copy folder ID from URL → record into `records/new-resource-ids.md` under "System / Data folder"

This folder will hold:
- `_DealerScan_Config.json` (managers, IT users, banner message, per-user toggles)
- `_DealerScan_Log.json` (upload history)
- `_DealerScan_Events.json` (event log)
- `_DealerScan_Users.json` (user registry)
- `_DealerScan_Audit.json` (NEW — audit log, added in Phase 4 per compliance roadmap)

We don't create these JSON files manually — Apps Script will create them lazily on first run.

---

### 3.3 Create the archive folder
- [ ] Back to **My Drive**
- [ ] **+ New** → **New folder**
- [ ] Name: `DealerScan Archive`
- [ ] Open it, copy folder ID → record under "Archive folder"

This is where Apps Script's nightly trigger moves customer folders that are >1 day old.

---

### 3.4 Create the Customer History spreadsheet
- [ ] Back to **My Drive**, navigate INTO the **DealerScan Data** folder you just created
- [ ] **+ New** → **Google Sheets** → **Blank spreadsheet**
- [ ] Rename the spreadsheet (top-left): `Customer History & Logs`
- [ ] Once renamed, the URL contains the spreadsheet ID:
  - URL: `https://docs.google.com/spreadsheets/d/1X2Y3Z.../edit#gid=0`
  - ID is the part between `/d/` and `/edit`
- [ ] Copy ID → record under "Customer History / Data Logs" in `records/new-resource-ids.md`

Now create the four sheets inside it (matching the OLD structure so Apps Script reads/writes the same way):

- [ ] Rename "Sheet1" tab to: **`CustomerHistory`**
  - Right-click tab → Rename
  - Header row (row 1): `Salesperson | Customer 1 | Customer 2 | Customer 3 | Customer 4 | Customer 5`
- [ ] Add new sheet (+ button bottom-left), name: **`ScanLog`**
  - Header row: `Salesperson | Customer | Folder ID | Timestamp (ms) | Date | Time Start | Time End | Photo Count | Duration | Status`
- [ ] Add new sheet, name: **`DealerScan Events`**
  - Header row: `Timestamp | Type | Salesperson | Customer | Folder | Error | Details`
  - Bold the header row, freeze it (View → Freeze → 1 row)
- [ ] (Optional) The `📊 Dashboard` tab is auto-built by Apps Script's `setupDashboard()` function in Phase 4 — don't create it manually

---

### 3.5 Verify Drive structure
- [ ] Navigate to My Drive
- [ ] Confirm three folders exist at root level: `DealerScan Customers`, `DealerScan Data`, `DealerScan Archive`
- [ ] Inside `DealerScan Data`: confirm `Customer History & Logs` spreadsheet exists with 3 tabs
- [ ] All four IDs (3 folders + 1 sheet) recorded in `records/new-resource-ids.md`

---

## What does NOT happen in Phase 3
- ❌ No Apps Script (Phase 4)
- ❌ No customer data migrated (Phase 7)
- ❌ No JSON config files created — Apps Script does that lazily
- ❌ No external sharing of these folders — proxy access only (Phase 4)

---

## Verification before declaring Phase 3 complete
- [ ] `DealerScan Customers` folder exists, ID recorded
- [ ] `DealerScan Data` folder exists, ID recorded
- [ ] `DealerScan Archive` folder exists, ID recorded
- [ ] `Customer History & Logs` spreadsheet exists with 3 tabs (CustomerHistory, ScanLog, DealerScan Events), ID recorded
- [ ] All IDs in `records/new-resource-ids.md` populated (no `_____` left)

When all checked: tell Aria **"Phase 3 complete."**

---

## Common things that go wrong

**Folder created in wrong account** — make sure you're signed in as `tgchevydocs@dealerscanapp.com`, not your personal Google account. The avatar circle in top-right of drive.google.com tells you.

**Folder created in My Drive root, but you wanted it in Shared Drive** — for single-user Workspace, My Drive is correct. Shared Drives are for teams; with Option A user model, we don't need them.

**Sheet tab names with typos** — Apps Script reads sheets by exact name. `ScanLog` ≠ `Scan Log` ≠ `scanlog`. Get the casing exact.

**Spreadsheet ID vs gid** — gid is a tab identifier (`gid=0`), spreadsheet ID is the long string between `/d/` and `/edit`. We want the spreadsheet ID.
