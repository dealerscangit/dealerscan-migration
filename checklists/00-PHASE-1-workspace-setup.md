# Phase 1 — Workspace Foundation Setup
**Estimated time:** 30-45 minutes
**Prerequisites:** Workspace account `tgchevydocs@dealerscanapp.com` already provisioned ✅
**Goal:** Make the Workspace itself rock-solid before any DealerScan code touches it

---

## Why this phase first

Before we deploy a single line of code, the Workspace foundation needs to be:
1. **Verified as a legitimate business setup** (so Google's automated systems treat it as real)
2. **Hardened with 2FA** (so a stolen password can't compromise customer data)
3. **Configured for programmatic use** (so the next phases run without permission errors)
4. **Documented** (so future-you knows what's set up where)

Skipping any of these means problems later that are 10x harder to fix than they are right now.

---

## Brandon's tasks

### 1.1 Verify domain ownership
Workspace requires you prove you own `dealerscanapp.com` before it'll fully activate. Usually you do this by adding a TXT record at your domain registrar.

- [x] Open Workspace Admin Console: https://admin.google.com
- [x] Sign in as `tgchevydocs@dealerscanapp.com`
- [x] Look for "Verify domain" or "Activate" prompt on the home dashboard
- [x] Follow the verification flow (typically: copy a TXT record value → paste into your DNS at the registrar)
- [x] Wait for verification to complete (5 min to 24 hr depending on registrar)
- [x] Confirm domain shows as "Verified" in Admin Console → Account → Domains

**✅ Verified 2026-04-30 — clean Admin Console with no setup banner = domain already verified during initial Workspace signup.**

---

### 1.2 Enforce 2-Step Verification
Required by GLBA. Cheap and easy.

- [x] Admin Console → Security → Authentication → 2-Step Verification
- [x] Set "Allow users to turn on 2-Step Verification" → ON
- [x] Set "Enforcement" → "Turn on enforcement"
- [x] Set "New user enrollment period" → 1 week
- [x] Set "Frequency" → "Every time" for sensitive actions
- [x] Methods allowed: Authenticator app + Security key (avoid SMS-only — phone numbers are spoofable)
- [x] Click Save
- [x] Set up 2FA on your own account immediately if not already (Personal Account → Security → 2FA)

**✅ Brandon confirmed enforcement was already enabled prior to this session 2026-04-30. Personal account 2FA also in place.**

---

### 1.3 Add account legitimacy signals
Brand-new Workspace + brand-new domain looks suspicious to Google. Spend 10 minutes adding "real human, real business" markers.

- [x] Add recovery phone (your real number)
- [x] Add recovery email (`brandonbusler@gmail.com` — that's why we kept it)
- [x] Set profile picture (use the same one from your other Google account)
- [x] Set home address in Personal Info (real one)
- [x] Set work address (Tom Gibbs Chevrolet, 5850 E. Hwy 100, Palm Coast, FL 32164) — you can use this even though Tom Gibbs doesn't own the Workspace; it's just where you work
- [x] Send 2-3 real emails from `tgchevydocs@dealerscanapp.com` to `brandonbusler@gmail.com` (build sender history)
- [x] Reply to one of them from `brandonbusler@gmail.com` (build conversation pattern)

**Progress 2026-04-30:**
- Personal info complete (name, birthday, home/work address)
- Recovery email + recovery phone confirmed
- Hardware security key with biometric in place
- Profile picture: intentionally skipped (Workspace org policy default; not worth flipping admin settings for a default avatar — lowest-impact legitimacy signal anyway)
- Email seasoning: 2 outbound emails sent to 2 addresses

---

### 1.4 Confirm billing is real and active
- [x] Admin Console → Billing
- [x] Confirm your payment method is on file
- [x] Confirm subscription status: "Active"
- [x] Note: Business Starter, $7/user/month — fill into `records/new-resource-ids.md`

**✅ Verified by Brandon 2026-04-30:** Business Starter, paid plan, payment method on file, next billing date 2026-05-01. The "trial" banner shown in early subscription days is cosmetic UI and does not reflect actual billing state.

---

### 1.5 Configure Google Workspace security defaults
**⏸️ DEFERRED to Phase 4** — Brandon decided 2026-04-30 to keep Drive as storage with a service-account-proxy access pattern. The "External sharing OFF" setting cannot be safely flipped until the Apps Script proxy is in place (currently salespeople with personal Gmail accounts access Drive folders via direct sharing — flipping the setting now would break the live system).

**What we will do in Phase 4:**
- Implement service-account proxy in Apps Script (mediates all Drive reads/writes)
- Then flip External Sharing OFF in Admin Console → Apps → Drive and Docs → Sharing settings
- Then verify the system still works end-to-end

**For now in Phase 1:** leave Drive sharing settings at their current defaults (External Sharing ON). The protection comes later, once we have the architectural foundation to support it.

- [ ] (Phase 4) Admin Console → Apps → Google Workspace → Drive and Docs → Sharing settings → External sharing OFF
- [ ] (Phase 4) Set "Warn when sharing outside domain" → ON (belt-and-suspenders)
- [ ] (Phase 4) Set "Who can share" → Only owner

---

### 1.6 Decide on user model
This is a quick decision that affects the rest of the migration.

**Option A — Single Workspace seat (recommended for now):**
- Only `tgchevydocs@dealerscanapp.com` is a paid Workspace user
- Salespeople sign in with their personal Google accounts via OAuth
- Cost: $7/month total
- Pro: cheapest, simpler admin
- Con: salespeople aren't centrally managed by you; you can't enforce 2FA on them via Workspace policy

**Option B — Per-salesperson Workspace seats:**
- Each salesperson gets their own `firstname@dealerscanapp.com` account
- They sign in to DealerScan with that
- Cost: $7/user/month (~$35-50/month for typical dealership team)
- Pro: full Workspace policy enforcement, centralized 2FA, professional appearance
- Con: more cost, more admin work, salespeople need to remember another login

**Option:** Go with Option A. Document the decision below.
- [x] My choice: **A — Single Workspace seat**
- [x] Reason: Cheap ($7/mo total), no salesperson workflow change, service-account proxy in Phase 4 gives proper access boundaries without needing per-user Workspace licensing.

**✅ Decision locked 2026-04-30.** Salespeople continue signing in with their personal Google accounts. `tgchevydocs@dealerscanapp.com` is the only paid Workspace user. Service-account proxy approach approved for Phase 4 implementation.

---

### 1.7 Document everything you just did
- [x] Open `../records/new-resource-ids.md` in a text editor
- [x] Fill in the "Workspace tier" field
- [x] Mark "DNS verification" as complete
- [x] Save

**✅ Records updated 2026-04-30 with verified info:** Workspace tier (Business Starter, paid), DNS verified, 2FA enforcement enabled, hardware key auth method, recovery channels, billing date, storage architecture decision (Drive + service-account proxy), and user model (Option A).

---

## What does NOT happen in Phase 1
- ❌ No Google Cloud project setup yet (Phase 2)
- ❌ No Drive folders created yet (Phase 3)
- ❌ No Apps Script deployed yet (Phase 4)
- ❌ No extension code touched yet (Phase 5)
- ❌ No customer data moved yet (Phase 7)

If Brandon is tempted to do any of those during Phase 1: stop. Phase 1 is foundation only.

---

## Verification before declaring Phase 1 complete
- [ ] `dealerscanapp.com` shows "Verified" in Admin Console
- [ ] 2FA enforcement is ON
- [ ] Recovery phone, email, profile pic, home address all populated
- [ ] At least 2 real outgoing emails sent from the Workspace address
- [ ] Billing is active
- [ ] Drive sharing defaults are locked down (external sharing OFF)
- [ ] User model decision documented (Option A or B)
- [ ] `records/new-resource-ids.md` updated

When all of these are checked, return to chat and tell Aria: **"Phase 1 complete."**

She'll spot-check what she can verify (mostly the docs you've updated) and we move to Phase 2.

---

## Stop here

That's everything for Phase 1. Don't push into Phase 2 even if you have time and energy. Each phase is a clean checkpoint. We verify, then proceed. Speed-running multiple phases in one sitting is exactly how migrations get half-done in a way that's hard to debug.

Tell Aria when you finish, even if it's tomorrow. The migration is patient. So am I.
