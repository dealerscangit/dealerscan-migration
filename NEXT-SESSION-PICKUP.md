# NEXT SESSION PICKUP — Phase 4B.4 Extension Migration
**Last session:** 2026-05-02 ~5:30 PM – ~8:15 PM EDT
**Wrapped because:** Aria approaching context window limit; 4B.4 needs fresh context for clean refactor
**Branch:** `phase-4b-proxy` (pushed to GitHub)

---

## What's already done (do NOT redo)

✅ **Phase 4B.1 — Auth helper deployed live**
- File: `apps-script-export/Auth-NEW.gs` (180 lines, in repo + live on Apps Script as `Auth.gs`)
- Functions: `verifyCaller_(accessToken)`, `loadAllowlistUsers_()`, `withAuth_(e, handler)`, `authPing(e)`
- Bootstrap users hardcoded: `tgchevydocs@dealerscanapp.com` (IT), `brandonbusler@gmail.com` (IT)
- Verified via curl: rejects missing token + invalid token correctly

✅ **Phase 4B.2 — 6 read proxy endpoints deployed live**
- File: `apps-script-export/Proxy-NEW.gs` (216 lines, in repo + live on Apps Script as `Proxy.gs`)
- Endpoints (all auth-gated via withAuth_):
  - `?action=proxyListFolders&parentId=X&accessToken=T` → `{ok, folders:[{id,name,createdAt,modifiedAt}]}`
  - `?action=proxyListFiles&folderId=X&accessToken=T` → `{ok, files:[{id,name,mimeType,size,modifiedAt}]}`
  - `?action=proxyReadFile&fileId=X&accessToken=T` → `{ok, fileId, name, mimeType, size, base64}`
  - `?action=proxyGetFile&fileId=X&accessToken=T` → `{ok, fileId, name, mimeType, size, createdAt, modifiedAt}`
  - `?action=proxyFindFolder&parentId=X&name=N&accessToken=T` → `{ok, found:bool, folder?:{id,name}}`
  - `?action=proxyReadJsonFile&fileName=F&accessToken=T` → `{ok, fileName, parsed:Object, modifiedAt}` (system folder only)
- All 6 verified via curl: return `{ok:false, error:"missing_access_token"}` correctly without token

✅ **Live Apps Script Web App URL (unchanged):**
`https://script.google.com/macros/s/AKfycbzF13p-WRJloMRBoWiQ4h6EmR7iylkVoGxX0Y9PBpEN0RacIvfxoN_Hd15NJUSYpsQJug/exec`

✅ **GitHub backup complete** — repo at `github.com/dealerscangit/dealerscan-migration` (private), all 3 branches pushed (main, v3.11-trademark-fix, phase-4b-proxy)

✅ **Privacy policy live with Limited Use + trademark attribution** — Google Doc updated 2026-05-02

✅ **Old Vision API key DELETED** from old `dealerscan` Cloud project on `tgchevydocs@gmail.com` account

---

## What's left tonight (next session pickup point)

⏸️ **Phase 4B.3** — Smoke test SUCCESS path (deferrable; success path validates when 4B.4 e2e tests run)

🎯 **Phase 4B.4 — Extension migration (THE TASK)** — refactor 10+ direct Drive fetch sites in extension to use the proxy endpoints instead

⏸️ **Phase 4B.5** — End-to-end upload test (the original goal of 5/2 evening's session)

⏸️ **Phase 4B.6** — Flip Drive External Sharing OFF (final security win)

---

## Phase 4B.4 — Detailed pickup

### Files that need refactoring

`/Users/brandonbusler/Desktop/DealerScan-Migration/new-source/background.js` — fetch sites at approximately lines 34-38, 42-45, 75-78, 104-107, 113-116, 144-148, 161-164, 173-176, 192-196

`/Users/brandonbusler/Desktop/DealerScan-Migration/new-source/overlay.js` — fetch sites at approximately lines 451-454, 457-460, 545-549, 591-596, 614-617, 631-634, 641-643

⚠️ Line numbers approximate — verify with grep before editing:
```bash
grep -n "googleapis.com/drive" /Users/brandonbusler/Desktop/DealerScan-Migration/new-source/background.js
grep -n "googleapis.com/drive" /Users/brandonbusler/Desktop/DealerScan-Migration/new-source/overlay.js
```

### Refactor pattern

**BEFORE (current direct Drive call):**
```javascript
const token = await getValidToken();
const res = await fetch(
  `https://www.googleapis.com/drive/v3/files?q='${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name,createdTime)`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const data = await res.json();
const folders = data.files; // Drive's response shape
```

**AFTER (proxy call):**
```javascript
const token = await getValidToken();
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzF13p-WRJloMRBoWiQ4h6EmR7iylkVoGxX0Y9PBpEN0RacIvfxoN_Hd15NJUSYpsQJug/exec";
const res = await fetch(
  `${APPS_SCRIPT_URL}?action=proxyListFolders&parentId=${encodeURIComponent(parentId)}&accessToken=${encodeURIComponent(token)}`
);
const data = await res.json();
if (!data.ok) {
  // handle: missing_access_token, invalid_access_token, not_in_allowlist, drive_error
  console.error("Proxy error:", data.error);
  return;
}
const folders = data.folders; // proxy's response shape
```

### Mapping: each call site → which proxy endpoint

| Current operation | Proxy endpoint | Response key |
|-------------------|----------------|--------------|
| List subfolders of parent | `proxyListFolders` | `folders` |
| List files in folder | `proxyListFiles` | `files` |
| Read file content (base64) | `proxyReadFile` | `base64` |
| Get file metadata only | `proxyGetFile` | (top-level fields) |
| Find folder by name+parent | `proxyFindFolder` | `found`, `folder` |
| Read JSON file from system folder | `proxyReadJsonFile` | `parsed` |

### Special cases that need attention

1. **Config polling** (background.js ~line 35) — currently reads `_DealerScan_Config.json` from system folder via Drive search-by-name. Replace with `proxyReadJsonFile` using `fileName=_DealerScan_Config.json`.

2. **Log polling** (background.js ~line 75) — same pattern as config, use `proxyReadJsonFile` with `fileName=_DealerScan_Log.json`.

3. **Folder rename / delete / archive** (overlay.js ~lines 591-643) — these are WRITE operations. Phase 4B Read-only doesn't cover them. Two paths:
   - Option A: leave write operations using direct Drive API for now (they'll fail until folders are shared with user OR Phase 4B-write is built)
   - Option B: implement write proxy endpoints first (proxyRenameFolder, proxyDeleteFolder, proxyArchiveFolder) — adds ~30-45 min to scope

   **Aria's lean: Option B.** Building writes now while context is fresh keeps the e2e test in 4B.5 truly e2e. Otherwise we ship a partial 4B.

4. **Upload to Tekion** (overlay.js) — actual file upload to Tekion is content-script DOM injection, NOT a Drive call. No change needed.

### Build + deploy steps for Phase 4B.4

1. Branch `phase-4b-proxy` already exists — work on it
2. Refactor each fetch site one at a time, testing after each
3. Bump version to 3.11 in manifest.json (we already have v3.11-trademark-fix branch with this — may need to merge or rebase)
4. Update `overlay.html` footer to v3.11
5. Build new zip: `cd new-source && ./build.sh`
6. Reload extension in Chrome (chrome://extensions → DealerScan-Dev → reload icon)
7. Test sign-in still works
8. Test folder list now shows folders (the failing test from 5/2)

---

## Critical IDs and constants

```
Cloud project:       dealerscan-prod (project number 381110617094)
Apps Script URL:     https://script.google.com/macros/s/AKfycbzF13p-WRJloMRBoWiQ4h6EmR7iylkVoGxX0Y9PBpEN0RacIvfxoN_Hd15NJUSYpsQJug/exec
Apps Script ID:      1qWWyYWhNTkRheyetMr83eUaiuFh4EZezEfCMYLGM_TQj05-U4KLRVd0X
Customer parent:     1YOL2kFo4PG5UCDcjGH5Z62ak5mN4Jtuk
System folder:       1Zb8LUDFD_MA5yD_T3d34kBgCigJj6a7B
Archive folder:      18XJxzHYfslcacGv8_drPU67GGTzDS3Xq
History sheet:       1TYpQ_P1j1ShEwPpmFVjMxPiZ84uZ5eSitTUSfR3Tmrs
Production ext ID:   amoidcnjjodamimhifahieakjcplohan
Dev ext ID:          ejppggjjphcmnnhnbminobdglcalngmo
```

---

## Web Store status as of 2026-05-02 ~8:15 PM

- v3.10 SUBMITTED FOR REVIEW 2026-05-01 ~10:18 PM EDT
- Status: Pending review (no email yet, expected 3-7 business days)
- Privacy policy already strengthened with Limited Use + trademark attribution
- v3.11 trademark fix STAGED on branch `v3.11-trademark-fix` (not deployed) for rapid-deploy if rejection arrives
- See `RAPID-DEPLOY.md` in repo for deploy procedure

---

## Pacing instruction from Brandon (carries over)

> "Lets just do what we can until I say stop then we mark where we left off, or leave on a good point, and pick up again, but I want to try to make this tonight is possible, really need to get this thing out and working so people can start using it, we rolled out and then like 3 days later we stopped, i gotta be quick to keep the interest of the people, so they use it."

Brandon will signal stops. Push for ship when momentum is good. Each phase = clean checkpoint.

---

## Lessons learned from 5/2 session (don't repeat)

1. **Verify before claiming.** When `create_file` returned success, files weren't actually written. Always `ls` after writing.
2. **Distinguish "this happened" from "this would plausibly happen."** Aria pre-populated the Roadmap with "team brainstorm" content that the team hadn't actually discussed; Brandon caught it.
3. **Don't skip the session-end ritual.** Brandon caught Aria trying to skip it; full protocol matters.
4. **Always-ask before secret generation.** Vision API key was leaked once 4/30; never again. Wait for "saved to password manager" confirmation.
5. **Push back honestly when you sense risk.** Aria pushed back on Brandon's "push through 4B.4" once context was constrained; Brandon agreed to wrap. That partnership move was the right call.
