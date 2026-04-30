# New Resource IDs (to fill in as you go)
**Updated:** as Brandon executes each phase
**Purpose:** Single source of truth for everything we need to plug into the new extension

---

## New account
- **Email:** tgchevydocs@dealerscanapp.com
- **Domain:** dealerscanapp.com (registered through Google)
- **Workspace tier:** Business Starter ($7/user/month, paid plan)
- **Billing:** Active paid subscription, payment method on file, next billing date 2026-05-01 (verified by Brandon)
- **DNS verification:** [x] complete (verified during initial Workspace signup)
- **2FA enforcement (domain-wide):** [x] enabled
- **Owner account 2FA method:** Hardware security key with biometric (fingerprint) — passkey-grade, phishing-resistant
- **Recovery email:** brandonbusler@gmail.com
- **Recovery phone:** (386) 287-1563
- **Licensed users:** 1 (Brandon as owner)

## Storage architecture decision (2026-04-30)
- **Storage:** Google Drive (staying — not migrating to S3/R2/self-hosted)
- **Access pattern:** Service-account proxy via Apps Script
  - Customer folders owned by Workspace service account
  - Salespeople (external Gmail) never directly access Drive folders
  - All reads/writes mediated through Apps Script as permission boundary
- **Workspace external sharing:** Will be set to OFF in Phase 4 once the proxy is in place. NOT YET — leaving ON during migration so existing flows don't break.
- **Why this approach:** Drive's compliance posture (SOC 2, ISO 27001, encryption-at-rest, audit logs) is appropriate for customer NPI; rebuilding that on alternative storage would be vastly more work for no security benefit at single-dealership scale.

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
