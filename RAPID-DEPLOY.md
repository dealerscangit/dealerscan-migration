# RAPID-DEPLOY — v3.11 Trademark Fix
**Status:** STAGED, NOT DEPLOYED
**Trigger:** Use only if Web Store rejects v3.10 citing Branding Guidelines or trademark attribution issues.

## What's prepped

On branch `v3.11-trademark-fix`:
- `new-source/manifest.json` — version 3.11, description includes "Google Drive™"
- `new-source/overlay.html` — footer shows v3.11
- `templates/listing-description-v3.11.md` — full Web Store description with trademark attribution paragraph + Limited Use statement
- `DealerScan-3.11.zip` — built, 43K, verified to have real OAuth Client ID
- Privacy policy Google Doc — already updated 2026-05-02 with Limited Use + trademark attribution (live, no Web Store action needed)

## Deploy procedure if rejection arrives

### Step 1 — Confirm rejection actually cites trademark/branding
Read the rejection email carefully. If it cites a different policy (e.g., privacy practices, single purpose), this v3.11 fix does NOT address that — stop and analyze the actual rejection reason before deploying.

### Step 2 — Upload the new package
1. Web Store dev console → DealerScan → Package tab
2. Upload new package: `/Users/brandonbusler/Desktop/DealerScan-Migration/DealerScan-3.11.zip`
3. Confirm the upload shows v3.11

### Step 3 — Update the listing description
1. Store listing tab → Description field
2. Open `templates/listing-description-v3.11.md` in TextEdit
3. Copy the body of the description (everything after the "## Paste this..." line)
4. Replace the entire current description in Web Store with this content
5. Save

### Step 4 — Re-submit for review
1. Click Submit for review
2. New 3-7 day review cycle starts

### Step 5 — After deploy succeeds
1. Switch back to main: `git checkout main`
2. Merge the v3.11 branch: `git merge v3.11-trademark-fix`
3. Commit timestamp of resubmission to records
4. Delete the branch: `git branch -d v3.11-trademark-fix`

## Why this is staged not deployed

v3.10 is in active review as of 2026-05-01 ~10:18 PM EDT. We do not preemptively reset the review clock. We deploy only on confirmed rejection.

Three possible outcomes:
- **v3.10 approved** → ship v3.11 trademark fix in next release combined with new features
- **v3.10 rejected for trademark/branding** → execute this runbook
- **v3.10 rejected for other reason** → analyze, may not use this exact patch

## Files modified vs main

```
new-source/manifest.json          version 3.10→3.11, description adds ™
new-source/overlay.html            footer v3.10→v3.11
templates/listing-description-v3.11.md  NEW
DealerScan-3.11.zip                NEW (gitignored)
RAPID-DEPLOY.md                    NEW (this file)
```
