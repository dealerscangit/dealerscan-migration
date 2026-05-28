# NEXT SESSION PICKUP — Phase 4B.4 Extension Migration
**Last updated:** 2026-05-28 ~12:15 PM EDT (prior sessions: 2026-05-27 PM, 2026-05-02)
**Status:** v3.12 verified working in-browser by Brandon; prod zip built; Chrome Web Store submission in progress. Remaining: monitor review, then Phase 4B.6 (flip external sharing off) once live + confirmed.
**Branch:** `phase-4b-proxy` (all commits pushed to `origin/phase-4b-proxy`; working tree clean)

---

## 🚦 START HERE — v3.12 working & built; in PUBLISHING

**Update 2026-05-28 (~12:15 PM):** Dev build v3.12 was tested in-browser by Brandon — folders load, the IT/dev screen opens, and multi-file upload works (and is faster). Prod zip built and verified. Brandon is submitting to the Chrome Web Store now. What remains is the publish review and the final security flip — see "What's left" below.

### ✅ Done 2026-05-28 (file-level, all committed / backed up)
- **Stale dev build → SYNCED.** All 6 code files copied `new-source/` → `DealerScan-Dev/` (now byte-identical; dev `overlay.js` has the 16 `proxyFetch` sites). Old dev folder backed up to `~/Desktop/DealerScan-Dev-BACKUP-20260528-102959/`. Dev manifest rebuilt: name "DealerScan DEV", v3.12, dev client_id `…hrsct7jd…`, new scopes. Dev extension ID unchanged (folder path untouched → `ejppggjjphcmnnhnbminobdglcalngmo` stable).
- **Missing OAuth scope → ADDED** to BOTH `new-source/manifest.json` (prod) and the dev manifest: `userinfo.email` + `userinfo.profile`. Committed `1e4a807` + CHANGELOG v3.12 entry.
- **Write proxy endpoints → CONFIRMED DEPLOYED LIVE.** Unauthenticated smoke test of the live `/exec` URL: `authPing`, `proxyListFolders`, `proxyRenameFolder` all return `{ok:false,error:"missing_access_token"}`; nonsense action returns `Unknown action`. So the live deployment includes tonight's write code and the auth gate works.
- **Refactor audited:** zero remaining direct `googleapis.com/drive` calls; `proxyFetch` correct (token in query = no CORS preflight; distinguishable `code:"auth"` error; `loadFolders` refresh-and-retry works); `createdAt→createdTime` aliasing intact.
- **Blank-popup bug FIXED** — duplicate `const APPS_SCRIPT_URL` (line 6 AND line 34) in overlay.js caused a parse-time SyntaxError → whole popup rendered blank. Removed the line-34 dup, kept line 6. Verified both JS files parse via JavaScriptCore. Commit `035c0c7`. (Lesson: this only surfaced once the code actually ran in-browser; static checks missed it. `node`/jsc syntax check is now part of the routine.)
- **`_DealerScan_Config.json` CREATED** in the system folder (it was MISSING in the new Workspace → background.js couldn't resolve anyone as IT → the dev screen wouldn't open for anyone). Contents: `managers` = the 4 PWA managers (bryant.tgc, buslertgc, Keh200tl, wgibbstgc @gmail.com), `itUsers` = `brandonbusler@gmail.com`, `enabled` true. File id `16F_wxS0JGe2qdIjqPTlF-dZPnLjgHKWH`. background.js `pollConfig` runs on reload + every 30s and resolves role from this file.
- **Upload sped up** — `uploadToDrive` was calling `proxyListFiles` twice and reading Drive files / uploading extras sequentially (each = a serial Apps Script round-trip). Now reuses the already-fetched list and runs all reads + uploads in parallel via `Promise.all`; dedup filenames pre-computed in original order so naming/injection behavior is unchanged. Commit `8c665b6`.
- **Prod zip BUILT + verified** — `~/Desktop/DealerScan-Migration/DealerScan-3.12.zip` (46K, 12 files). Manifest inside = PROD (name "DealerScan", v3.12, client_id `…mpt3…`, 3 scopes). Both fixes present in the packaged overlay.js. Docs / build.sh / .git / .DS_Store all excluded.
- **In-browser verified by Brandon:** folders load, IT/dev screen opens (3-tap), multi-file upload works and is faster.

### ⏳ What's left
1. **Chrome Web Store review** — Brandon submitting v3.12 now (supersedes the pending v3.10). Pre-submit checklist: (a) verify the prod OAuth consent screen for client `…mpt3…` lists `userinfo.email` + `userinfo.profile`; (b) update the Web Store data-use disclosures to mention email/profile access (not just Drive); (c) expect existing users to get a one-time re-consent prompt because scopes expanded.
2. **Phase 4B.6 — flip Drive external sharing OFF.** The final security win and the whole point of the proxy migration. Do this ONLY after the published version is confirmed pulling folders for a real salesperson — it's the hard-to-undo step.
3. **Follow-up (non-blocking): consolidate role source.** The extension reads roles from `Config.json` (managers/itUsers) while the PWA reads `Users.json` (per-user role). They match today but WILL drift when someone changes roles in the PWA. Recommend changing background.js to read `Users.json` directly so there's one source of truth, then retire the Config.json role lists.
4. **Follow-up (non-blocking): pre-prod hardening.** Move the proxy access token out of the URL query string into a `text/plain` POST body (and route the proxy READ actions via `doPost`). Avoids token-in-URL logging + Apps Script CORS-preflight quirks. Requires an Apps Script redeploy; safe to defer.

---

## What's already done (do NOT redo)

✅ **Phase 4B.4 (read) — extension READ ops routed through proxy** — commit `dd833f0` (2026-05-27 22:00). `new-source/overlay.js` + `background.js` now call `proxyFetch(...)` instead of `googleapis.com/drive` directly. Verified: `proxyListFolders` calls in `new-source/overlay.js` at lines 506/510/1148, plus a `proxyFetch` helper.

✅ **Phase 4B.2-write — Drive proxy WRITE endpoints added** — commit `25d1936` (2026-05-27 22:07). New file `apps-script-export/Proxy-Writes-NEW.gs` (rename / archive / delete / createFolder / uploadFile / writeJson / appendJson). ✅ **CONFIRMED DEPLOYED LIVE 2026-05-28** via unauthenticated smoke test.

✅ **Phase 4B.4+4B.5 (write) — extension WRITE ops through proxy, bumped to v3.12** — commit `4261e65` (2026-05-27 22:30). All in `new-source/`. Pushed to `origin/phase-4b-proxy`; working tree clean.

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

## What's left — see "⏳ What's left" at the top

> This section is superseded. Items 1–5 below were all COMPLETED 2026-05-28 (scope added, dev synced, folders verified, write endpoints confirmed deployed, e2e tested by Brandon). The only remaining items are the **Web Store review**, **Phase 4B.6 (flip external sharing off)**, and two non-blocking follow-ups — all detailed in the "⏳ What's left" block near the top of this doc. Kept here only so the historical task order is legible.

1. ✅ ~~Add OAuth email scope~~ — done, commit `1e4a807`.
2. ✅ ~~Sync the dev build~~ — done; old build backed up.
3. ✅ ~~Re-consent + verify folders~~ — folders confirmed loading.
4. ✅ ~~Verify write proxy endpoints deployed~~ — confirmed live via smoke test.
5. ✅ ~~Phase 4B.5 e2e test~~ — Brandon verified upload + IT screen in-browser.
6. ⏸️ **Phase 4B.6** — Flip Drive External Sharing OFF (final security win). ONLY after the published version is confirmed working for a real salesperson.
7. ⏸️ **Pre-prod hardening** — move token from URL query → POST body + add proxy READ actions to `doPost`. Deferred.

---

## Phase 4B.4 — Detailed pickup (✅ REFACTOR COMPLETE — retained as reference)

> **Status update 2026-05-27:** the refactor described below is DONE and committed (`dd833f0`, `4261e65`). The listed call sites were converted to `proxyFetch(...)` in `new-source/`. This section is kept as a reference map of call-site → proxy endpoint — useful for the e2e test (4B.5) and the pre-prod hardening pass. **Do NOT re-refactor.** The remaining work is the scope fix + dev-build sync (see "START HERE" at top), not the refactor itself.

### Files that were refactored (now using proxyFetch)

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

6. **Reconcile the loaded build against repo HEAD at session start.** This session spent real time debugging the dev extension's "No folders found" while looking at the STALE `DealerScan-Dev/` copy (v3.10, direct Drive calls) — the refactor was already committed in `new-source/` (v3.12). A quick `git log` + a diff of the loaded dev folder vs `new-source/` up front would have caught it immediately.

7. **`DealerScan-Dev/` is a COPY of `new-source/`, not the source — and they drift.** The dev install folder must be re-synced from `new-source/` after every refactor (preserving the dev manifest). Treat "did I sync the dev folder?" as a standing checklist item before testing dev.
