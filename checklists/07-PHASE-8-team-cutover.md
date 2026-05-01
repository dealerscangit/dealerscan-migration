# 07-PHASE-8-team-cutover
**Status:** Not started — full content will be written when Phase 1 completes
**Summary:** Salesperson re-authorization, name re-entry, sanity check on real Tekion deal. Enabled after Phase 7.

## ⚠️ Blocked on architectural decision

This phase requires a decision on the mobile capture path before salesperson onboarding instructions can be finalized. See `architecture-questions/01-mobile-capture-path.md`.

**Choices that affect Phase 8 instructions:**
- **Option A** (update existing iOS Shortcut): cutover instructions include "edit your Shortcut URL"
- **Option B** (native iOS app): cutover requires TestFlight invite + install
- **Option C** (PWA): cutover requires "visit URL, Add to Home Screen"
- **Option D** (hybrid): mixed instructions for existing vs new salespeople

Aria should not finalize Phase 8 details until Brandon makes this call.

## Placeholder

Aria will flesh this out when we approach this phase. Why not write it all now?
Earlier phases sometimes reveal information that changes later phases. Writing
detailed steps now risks them being wrong.

If you want a preview of what will be in this phase, see the migration playbook
in /Users/brandonbusler/Desktop/DealerScan-3.9/NEXT_SESSION.md (Phases A1-A8).
