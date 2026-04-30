# New Resource IDs (to fill in as you go)
**Updated:** as Brandon executes each phase
**Purpose:** Single source of truth for everything we need to plug into the new extension

---

## New account
- **Email:** tgchevydocs@dealerscanapp.com
- **Domain:** dealerscanapp.com
- **Workspace tier:** _____ (e.g. Business Starter)
- **DNS verification:** [ ] complete

## New Drive folders (under new Workspace account)
| Resource | New ID | Status |
|----------|--------|--------|
| Customer parent folder | `_____` | [ ] |
| System / Data folder | `_____` | [ ] |
| Archive folder | `_____` | [ ] |

## New spreadsheet
| Resource | New ID | Status |
|----------|--------|--------|
| Customer History / Data Logs | `_____` | [ ] |

## New Cloud project
- **Project name:** dealerscan-prod
- **Project ID:** `_____`
- **Project number:** `_____`
- **OAuth Consent Screen status:** [ ] configured / [ ] published
- **OAuth Client ID:** `_____`
- **OAuth Client Secret:** _____ (do NOT commit this anywhere — store in password manager only)

## New Apps Script
- **Project name:** DealerScan Backend
- **Script ID:** `_____`
- **Web App deployment URL:** `_____`
- **Vision API key (in PropertiesService):** [ ] configured (do not paste actual key here)

## Chrome Web Store
- **Same listing or new listing?** [ ] same / [ ] new
- **Production extension ID:** `ljfhbejbbhobkohbfflncfcdkpfkomff` (verify still ours)
- **v3.10 submission status:** [ ] not submitted / [ ] in review / [ ] published

## Triggers configured on new Apps Script
- [ ] `archiveFoldersOlderThanOneDay` (daily, midnight)
- [ ] `setupDashboard` (hourly)

## Verification before Phase 5 (extension update)
Brandon must confirm ALL of the following are filled in above before the extension constants get updated:
- [ ] Customer parent folder ID
- [ ] System folder ID
- [ ] Archive folder ID
- [ ] Customer History sheet ID
- [ ] OAuth Client ID
- [ ] Apps Script Web App URL
- [ ] Vision API key in PropertiesService (not hardcoded)
