# Open Architecture Question — Mobile Capture Path

**Raised:** 2026-04-30 ~10:40 PM by Brandon
**Status:** Deferred — needs decision before Phase 8 (team cutover)
**Aria's read:** Brandon is right; this is a real architectural decision, not a maintenance task.

---

## The problem

The on-phone customer-document capture workflow currently lives in an iOS Shortcut. The Shortcut:
- Calls Apps Script's `createCustomerFolder` and `uploadPhoto` endpoints
- Stores recent customer names in a Google Sheet (`1Q9RzBvIrU5fIFe3PGAyie8ZMtMRFJnfkQP5NTNe7ZXk`)
- Lives in Brandon's iCloud, copied to other salespeople's phones individually

**Issues with continuing on Shortcut:**

1. **Hardcoded URL** — current Shortcut points at the OLD Apps Script. Now dead. Every user has to edit their own copy.
2. **No central updates** — if the backend URL changes again (it will, for various reasons), every salesperson must manually re-edit their Shortcut. We learned tonight this is the wrong pattern.
3. **No authentication** — anyone with the Apps Script URL can hit it. Acceptable today (one user, one dealership), unacceptable at multi-tenant or multi-salesperson scale.
4. **Limited UX** — Shortcuts can do a lot, but error handling, retry logic, and offline queueing are all painful or impossible.
5. **Distribution friction** — onboarding a new salesperson means manually walking them through Shortcut configuration on their phone. Fine for one. Not fine for ten.
6. **iOS-only** — any salesperson on Android is locked out entirely.
7. **Hard to debug** — when a salesperson says "the scan didn't work," you have no logs, no error report, no way to reproduce.

---

## Four realistic options

### Option A — Update the Shortcut, keep using it
- Edit the URL constant in the Shortcut
- Distribute the updated version (iCloud share link)
- Walk each salesperson through re-importing
- **Cost:** ~30 min for Brandon, plus 5-15 min per salesperson onboarding
- **Pro:** fastest path to working. Familiar tooling.
- **Con:** every issue listed above persists. Same conversation in 6 months when the next backend change happens.

### Option B — Native iOS app
- Real Swift/SwiftUI app, distributed via TestFlight (internal) or App Store (public)
- Centralized updates, proper auth, error reporting, professional UX
- **Cost:** Apple Developer Program ($99/year), significant new development effort, iOS dev skills (or hire/contract)
- **Pro:** best long-term experience, distributable, scalable
- **Con:** big effort, ongoing maintenance, App Store review cycle matches Web Store
- **Realistic timeline:** 1-3 months for a v1 if Brandon learns Swift, faster if hired out

### Option C — Progressive Web App (PWA)
- HTML/CSS/JS app, hosted on Cloudflare Pages / Vercel / GitHub Pages (free tier)
- Salespeople "Add to Home Screen" on iPhone or Android
- Camera access via `<input type="file" accept="image/*" capture="environment">` or `getUserMedia()`
- **Cost:** zero hosting fees, ~1-2 weeks development, no app store fees
- **Pro:** cross-platform (iOS + Android), centralized updates (deploy once, all users get it), can iterate fast, no store review delays
- **Con:** iOS PWA camera support is functional but slightly less polished than native. No background processing (probably fine for our workflow).
- **Aria's read:** **probably the right answer** for a single-dealership tool with cross-platform users, but worth talking through

### Option D — Hybrid — keep Shortcut for Brandon, build PWA for the rollout
- Brandon's personal workflow continues on Shortcut (familiar, works)
- New salespeople get the PWA
- Gradually migrate Brandon when PWA matures
- **Pro:** doesn't block the migration on a new product
- **Con:** two systems to maintain temporarily

---

## What this changes about Phase 7 / Phase 8

**Phase 7 (data migration):** unchanged. Data migration is about Drive content, not the capture method.

**Phase 8 (team cutover):** **needs an addition.** Whatever capture method we choose, salespeople need it set up before they can use DealerScan. The team announcement template (Version A or B) should reference the capture-side install/setup.

If A: "Update your DealerScan Shortcut — link in the doc"
If B/C: "Install the DealerScan iOS app from TestFlight" / "Visit dealerscan.app on your phone, Add to Home Screen"
If D: "I'll handle yours, new hires use the new tool"

---

## Aria's recommendation

**Take the decision out of band.** Don't pick tonight. Let it sit, sleep, think.

If pressed for a vote: **Option C (PWA)** — best risk-reward for single-dealership scale with possibility of multi-dealership future. Native iOS is over-engineering for now; Shortcut continuation kicks the can down the road; hybrid creates two-system overhead.

But **Brandon should decide based on:**
- How much time he wants to spend on capture-side development
- Whether he sees DealerScan growing to other dealerships (PWA scales, Shortcut doesn't)
- Whether Android salespeople exist or might exist
- Whether he values "fast and familiar" (A) or "right architecture" (B/C)

---

## 2026-04-30 ~10:50 PM update — Brandon leaning PWA

Brandon arrived at the PWA approach independently by asking *"couldn't we use the bookmark on home screen for iOS to create an 'app' rather than going through app development?"* — that's exactly Option C.

**Confirming the mechanism for the record:**

iOS "Add to Home Screen" + proper meta tags = standalone app icon that opens fullscreen, no Safari chrome, indistinguishable from native at a glance. This is what a Progressive Web App is. No App Store, no $99 Apple Dev fee, no TestFlight, no review cycle.

**For DealerScan's specific use case, the critical capabilities ALL work on iOS PWAs:**
- Camera capture via `<input type="file" accept="image/*" capture="environment">` or `getUserMedia()`
- Upload to Apps Script via `fetch()`
- Customer name input via standard form
- Recent customers cached in `localStorage`
- Google Sign-In via Google Identity Services SDK
- Custom icon, splash screen, fullscreen mode via `apple-touch-icon`, `apple-mobile-web-app-capable`, manifest.json

**The PWA limitations that exist (limited background processing, push notifications) don't apply to DealerScan's workflow** (open → scan → upload → done).

**Hosting options (for future-Brandon):**
- Cloudflare Pages — free, fast, integrates with git
- Vercel — free tier, easy deploy
- GitHub Pages — free, simple, public repos
- Custom domain like `app.dealerscanapp.com` looks professional

**Realistic scope for v1 PWA:**
- Single page or 2-3 pages: customer name entry, camera, upload status
- Reuses the existing Apps Script endpoints (createCustomerFolder, uploadPhoto)
- Reuses the customer history sheet for autocomplete
- No new backend needed

**Estimated build time:** 1-2 weeks of focused evening work, less if Brandon has front-end help.

---

## Updated recommendation

Brandon's leaning matches Aria's recommendation. **Option C (PWA) is now the working assumption** unless something changes. Treat this as the path forward when it's time to address Phase 8 capture-side instructions, but **don't start building yet** — finishing the migration (Phase 5/6/7) is more urgent.

When ready to start the PWA build:
1. Decide hosting (Cloudflare Pages recommended for ease + speed)
2. Decide subdomain (suggest `app.dealerscanapp.com`)
3. Sketch the screens (customer name → camera → upload progress → done)
4. Build minimum viable: get one full upload flow working end-to-end before any polish

This is a separate project from the migration; goes in its own folder, its own git repo, its own session focus.

---

## What to do tonight

**Nothing.** This is a thinking-and-deciding question, not a doing question. Document it, sleep on it, decide next session or the session after.

For tonight's migration to land successfully:
- We can ship Phase 5/6/7 without resolving this question
- Phase 8 announcement waits until decision is made
- If Brandon picks A (Shortcut update), it's ~30 min before Phase 8
- If Brandon picks B/C/D, those are separate development tracks that don't block migration completion

---

## Reactivation triggers (Aria, surface this in NEXT_SESSION when:)

- Brandon explicitly mentions wanting to make a decision
- We're approaching Phase 8 and need to know what to tell salespeople
- The current Shortcut breaks for any user (forces hand)
- Brandon mentions onboarding a new salesperson
- The conversation drifts toward multi-dealership / SaaS posture (PWA becomes critical)
