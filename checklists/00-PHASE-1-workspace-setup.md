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

- [ ] Open Workspace Admin Console: https://admin.google.com
- [ ] Sign in as `tgchevydocs@dealerscanapp.com`
- [ ] Look for "Verify domain" or "Activate" prompt on the home dashboard
- [ ] Follow the verification flow (typically: copy a TXT record value → paste into your DNS at the registrar)
- [ ] Wait for verification to complete (5 min to 24 hr depending on registrar)
- [ ] Confirm domain shows as "Verified" in Admin Console → Account → Domains

**Why this matters:** until verified, you can't enforce 2FA, can't set custom security policies, and Google may continue treating the account as new/unverified.

---

### 1.2 Enforce 2-Step Verification
Required by GLBA. Cheap and easy.

- [ ] Admin Console → Security → Authentication → 2-Step Verification
- [ ] Set "Allow users to turn on 2-Step Verification" → ON
- [ ] Set "Enforcement" → "Turn on enforcement"
- [ ] Set "New user enrollment period" → 1 week
- [ ] Set "Frequency" → "Every time" for sensitive actions
- [ ] Methods allowed: Authenticator app + Security key (avoid SMS-only — phone numbers are spoofable)
- [ ] Click Save
- [ ] Set up 2FA on your own account immediately if not already (Personal Account → Security → 2FA)

---

### 1.3 Add account legitimacy signals
Brand-new Workspace + brand-new domain looks suspicious to Google. Spend 10 minutes adding "real human, real business" markers.

- [ ] Add recovery phone (your real number)
- [ ] Add recovery email (`brandonbusler@gmail.com` — that's why we kept it)
- [ ] Set profile picture (use the same one from your other Google account)
- [ ] Set home address in Personal Info (real one)
- [ ] Set work address (Tom Gibbs Chevrolet, 5850 E. Hwy 100, Palm Coast, FL 32164) — you can use this even though Tom Gibbs doesn't own the Workspace; it's just where you work
- [ ] Send 2-3 real emails from `tgchevydocs@dealerscanapp.com` to `brandonbusler@gmail.com` (build sender history)
- [ ] Reply to one of them from `brandonbusler@gmail.com` (build conversation pattern)

---

### 1.4 Confirm billing is real and active
- [ ] Admin Console → Billing
- [ ] Confirm your payment method is on file
- [ ] Confirm subscription status: "Active"
- [ ] Note: ___ (which Workspace tier did you pick? Business Starter / Standard / Plus?) — fill into `records/new-resource-ids.md`

---

### 1.5 Configure Google Workspace security defaults
- [ ] Admin Console → Security → Less secure apps → "Disallow users to manage their access" (force OAuth-only, more secure)
- [ ] Admin Console → Security → API controls → leave defaults for now (we'll revisit in Phase 2 when we set up the Cloud project)
- [ ] Admin Console → Apps → Google Workspace → Drive and Docs → Sharing settings:
  - **External sharing:** OFF (you don't want customer documents shareable to non-Workspace users)
  - **Warn when sharing outside domain:** ON
  - **Who can share:** Only owner

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
- [ ] My choice: ___ (A / B)
- [ ] Reason: _______________

---

### 1.7 Document everything you just did
- [ ] Open `../records/new-resource-ids.md` in a text editor
- [ ] Fill in the "Workspace tier" field
- [ ] Mark "DNS verification" as complete
- [ ] Save

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
