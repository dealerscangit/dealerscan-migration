# Pre-Migration Inventory
**Captured:** 2026-04-30
**Purpose:** Record everything about the OLD system (under suspended `tgchevydocs@gmail.com`) so it's never lost. New equivalents will be tracked in `new-resource-ids.md`.

---

## Old account
- **Email:** tgchevydocs@gmail.com
- **Status:** SUSPENDED 2026-04-29
- **Appeal:** Submitted, awaiting response

## Old Drive folders (under old account)
| Resource | ID | Notes |
|----------|-----|-------|
| Customer parent folder | `1EWpweROWyqNebPL52I0Z5f2J4MKjnmFg` | Active deal jackets |
| System / Data folder | `1fiT1EmoPNdgfh5AEMyuy2GdV4aA9fZXU` | Config, logs, events, users |
| Archive folder | `1YnY_G7icV7iV4gj3N4_cpthfyRd5HyeO` | 1-day-old folders |

## Old spreadsheets
| Resource | ID | Sheets inside |
|----------|-----|---------------|
| Customer History / Data Logs | `1GTJGE0vABP_8qhqyQ4hKMFvD64QUxllm6hQk1UHe9pM` | `CustomerHistory`, `ScanLog`, `DealerScan Events`, `📊 Dashboard` |

## Old Apps Script deployment
- **Project name:** DealerScan / Scan Docs
- **Web App URL:** `https://script.google.com/macros/s/AKfycbyl6xk0ZA-aXoscuiP_HHbunhLU1HJmSdaOmlMM5-kMnB0qfZE2BKMtKG6HS53UIKdb/exec`
- **Code:** Available in chat history (pasted by Brandon 2026-04-29) — also being saved to `../apps-script-export/Code-OLD.gs` for safety

## Old Cloud project
- **OAuth Client ID:** `247275535977-a0tqh6t1sdkcmb9vclehhq4j8jelorhu.apps.googleusercontent.com`
- **Vision API key:** `AIzaSyAoTv6xN3u9YJ3LPNiReqepDxmSsivVZTw` ⚠️ Hardcoded in old Code.gs — do NOT carry over hardcoded; move to PropertiesService

## Chrome Web Store
- **Listing extension ID:** `ljfhbejbbhobkohbfflncfcdkpfkomff`
- **Status of latest published:** v3.7 live, v3.8 was in review
- **Note:** Web Store listing is independent of the Google account — the listing is owned by Brandon's developer account, not by `tgchevydocs@gmail.com`. Confirm during Phase 6.

## System file names (in old System folder)
- `_DealerScan_Config.json`
- `_DealerScan_Log.json`
- `_DealerScan_Events.json`
- `_DealerScan_Users.json`

## Custom triggers running on old Apps Script
- `archiveFoldersOlderThanOneDay` — daily, midnight
- `setupDashboard` — hourly
- (Verify via script.google.com → Triggers when access is restored, or accept loss if not)

## What's expected to be lost if appeal denied
- Active customer folders mid-deal (recreate manually via Phase 7B)
- Customer History sheet contents (rebuild as deals come in)
- Scan log historical data (start fresh — not operationally critical)
- Events log historical data (start fresh — not operationally critical)
- Existing config (managers, IT users, banner) — recreate from memory in Phase 7

## What is preserved no matter what
- The current v3.9 source code: `/Users/brandonbusler/Desktop/DealerScan-3.9/`
- The full Code.gs: backed up to `../apps-script-export/Code-OLD.gs`
- The Web Store listing: owned by Brandon's developer account, not the suspended one
- The compliance roadmap and migration playbook docs
- This entire migration workspace

## Brandon's tasks before Phase 1 starts
- [ ] Read this file
- [ ] Confirm any Apps Script triggers I might have missed (only matters if appeal succeeds and you can log in)
- [ ] Note any in-flight customer deals you absolutely need to preserve, by customer name
