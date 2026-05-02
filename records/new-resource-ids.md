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
| Customer parent folder | `1YOL2kFo4PG5UCDcjGH5Z62ak5mN4Jtuk` | [x] |
| System / Data folder | `1Zb8LUDFD_MA5yD_T3d34kBgCigJj6a7B` | [x] |
| Archive folder | `18XJxzHYfslcacGv8_drPU67GGTzDS3Xq` | [x] |

## New spreadsheet
| Resource | New ID | Status |
|----------|--------|--------|
| Customer History / Data Logs | `1TYpQ_P1j1ShEwPpmFVjMxPiZ84uZ5eSitTUSfR3Tmrs` | [x] |

## New Cloud project
- **Project name:** dealerscan-prod
- **Project ID:** `dealerscan-prod` (no suffix — clean)
- **Project number:** `381110617094`
- **Organization:** dealerscanapp.com (verified — project lives under the org, not "No organization")
- **Billing:** Active, $300 free trial credit + pay-as-you-go after 90 days
- **OAuth Consent Screen status:** [x] Production / Unverified — External audience, App name "DealerScan", support email tgchevydocs@dealerscanapp.com, developer contact brandonbusler@gmail.com
- **OAuth Client ID:** [x] created 2026-05-01, type Chrome Extension, bound to extension ID `amoidcnjjodamimhifahieakjcplohan`, value stored in macOS Keychain as Secure Note "DealerScan OAuth Client ID"
- **Vision API key:** [x] created, restricted to Cloud Vision API only, stored in macOS Keychain as Secure Note "DealerScan Vision API Key"

## ⚠️ Incident note (2026-04-30 evening)
A first attempt at Vision API key creation resulted in Brandon pasting the live key into chat. Mitigation: key was deleted within ~5 minutes of creation, replaced with a fresh key that was handled correctly (password manager only). No evidence of misuse. Going forward:

**For future API keys, OAuth secrets, tokens, or any other secret material:**
- Aria MUST issue an explicit "DO NOT REPLY WITH THIS VALUE — paste only into your password manager" warning *before* the value is generated
- Brandon should never paste secret values into chat, even to confirm completion. The correct confirmation phrase is "saved to password manager," nothing more.
- If a secret is leaked into chat: delete it from the source service immediately, generate a replacement, treat the leaked value as permanently compromised.

## New Apps Script
- **Project name:** DealerScan Backend
- **Script ID:** `1qWWyYWhNTkRheyetMr83eUaiuFh4EZezEfCMYLGM_TQj05-U4KLRVd0X`
- **Web App deployment URL:** `https://script.google.com/macros/s/AKfycbzF13p-WRJloMRBoWiQ4h6EmR7iylkVoGxX0Y9PBpEN0RacIvfxoN_Hd15NJUSYpsQJug/exec`
- **Vision API key (in PropertiesService):** [x] configured as Script Property `VISION_API_KEY` (value masked, only readable by code in this project)
- **GCP Project link:** [x] linked to `dealerscan-prod` (project number `381110617094`)

## Chrome Web Store
- **Old listing (in suspended account):** `ljfhbejbbhobkohbfflncfcdkpfkomff` owned by `tgchevydocs@gmail.com` — INACCESSIBLE, will not be used
- **New developer account:** `tgchevydocs@dealerscanapp.com` (registered 2026-04-30, $5 fee paid, declared Non-trader)
- **New listing:** Will be created fresh in Phase 5/6 — extension ID will be assigned by Web Store on first upload
- **Production extension ID:** `amoidcnjjodamimhifahieakjcplohan` (assigned by Chrome Web Store on first upload 2026-05-01)
- **v3.10 submission status:** [x] uploaded as draft (placeholder OAuth client_id) — pending OAuth Client creation + rebuild + re-upload + listing details + submit

⚠️ **Architectural impact:** Salespeople will need to install the new extension when it ships (not an auto-update). Their chrome.storage resets — name, history, all of it. Use Version B of team-announcement.md when shipping.

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
