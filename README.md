# DealerScan-Migration Workspace
**Created:** 2026-04-30
**Owner:** Brandon Busler
**Purpose:** All migration artifacts for moving DealerScan from `tgchevydocs@gmail.com` (suspended consumer Gmail) to `tgchevydocs@dealerscanapp.com` (Google Workspace).

---

## What's in this folder

```
DealerScan-Migration/
├── README.md                         ← you are here
├── checklists/                       ← step-by-step playbooks
│   ├── 00-PHASE-1-workspace-setup.md     Foundation (do first, today)
│   ├── 01-PHASE-2-cloud-project.md       Google Cloud + OAuth
│   ├── 02-PHASE-3-drive-structure.md     Recreate Drive folders
│   ├── 03-PHASE-4-apps-script.md         Deploy backend
│   ├── 04-PHASE-5-extension-update.md    Update extension constants
│   ├── 05-PHASE-6-web-store.md           Submit v3.10 to Chrome
│   ├── 06-PHASE-7-data-migration.md      Move customer data (or accept loss)
│   ├── 07-PHASE-8-team-cutover.md        Salesperson onboarding
│   └── 08-PHASE-9-decommission.md        Wind down old account
├── scripts/                          ← helper scripts I write for you
│   └── (created as needed during migration)
├── templates/                        ← things you'll paste into Google services
│   └── team-announcement.md          ← message to send salespeople
├── new-source/                       ← clean v3.10 extension source
│   └── (populated when we hit Phase 4)
├── apps-script-export/               ← Code.gs and friends, ready to paste
│   └── (populated when we hit Phase 4)
├── architecture-questions/           ← deferred decisions awaiting Brandon
│   └── 01-mobile-capture-path.md     ← iOS Shortcut vs PWA vs native app (raised 2026-04-30)
└── records/                          ← things you note down as you go
    ├── new-resource-ids.md           ← all the new IDs you'll need to fill in
    └── pre-migration-inventory.md    ← state of old system before we touch anything
```

## How to use this

1. Start with `checklists/00-PHASE-1-workspace-setup.md`
2. Each phase has its own checklist file with step-by-step instructions
3. Each checklist has checkboxes you can edit as you go (they're plain markdown — open in any editor, replace `[ ]` with `[x]`)
4. When you complete a phase, tell Aria in chat. She'll verify what's verifiable, then we move to the next phase
5. As you complete steps, fill in `records/new-resource-ids.md` so we don't lose track of new IDs

## Status (live tracker)

- [ ] Phase 1: Workspace setup
- [ ] Phase 2: Cloud project + OAuth
- [ ] Phase 3: Drive structure
- [ ] Phase 4: Apps Script
- [ ] Phase 5: Extension update
- [ ] Phase 6: Web Store submission
- [ ] Phase 7: Data migration (or recreation)
- [ ] Phase 8: Team cutover
- [ ] Phase 9: Decommission old account

## Critical context

- The Workspace migration proceeds **regardless of appeal outcome** on `tgchevydocs@gmail.com`
- Source of truth for current code: `/Users/brandonbusler/Desktop/DealerScan-3.9/`
- New version will be v3.10 (migration release, no other features)
- v3.11 onward returns to feature work per the original chunk plan
- All IDs and constants from the OLD account are preserved in `records/pre-migration-inventory.md` so they're never lost
