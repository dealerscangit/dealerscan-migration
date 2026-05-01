# DealerScan — Compliance & Legal Roadmap
**Owner:** Brandon Busler
**Last updated:** 2026-04-30
**Status:** Active — review monthly, update as items complete

---

## 📌 Brandon's note (added 2026-04-30 afternoon)

Recording this in Brandon's own framing so it's preserved alongside the team's recommendations:

> "Right now I won't be signing documents or partnering with an attorney. I think we're in an OK
> spot right now truly. I still want to focus on the legality aspect of this though because I'm
> not here to commit any felonious acts. I just want to make a good tool for my colleagues to use."

**What this means in practice:**
- Items C1.1 (attorney consult) and C1.2 (Tom Gibbs written agreement) and C2.2 (LLC formation) are **deferred indefinitely**, not removed from the roadmap
- The compliance roadmap below remains the team's full recommendation — Brandon's decision sits alongside it as a deliberate choice, not a replacement
- Brandon retains active interest in **technical** compliance items (2FA, audit logs, data minimization, encryption, vendor hygiene) — these are not deferred and continue to be implemented in version planning
- This decision is reviewable. If circumstances change (multi-dealership scale, breach incident, dealership leadership inquiry, regulator contact), the deferred items become priority again immediately

**Team acknowledgment:** Aria, Rex, Quinn, Sage, Nova, and Kai disagree with this decision but respect it. The team's full perspective is documented below for future reference. Nothing here is hidden, softened, or rewritten to match the deferral. If something ever goes wrong, the existence of this section — where Brandon made an informed call with full team input — is itself meaningful protection establishing he was not negligent.

**To future-Brandon and future-Aria reading this in 6 months:** if the answer to any of these has changed, the deferred items reactivate:
- Has DealerScan added a second dealership client? → C1.1 and C2.2 are now urgent
- Has there been any data incident, however minor? → C1.1 is now urgent
- Has Tom Gibbs leadership asked any question about where customer data lives? → C1.2 is now urgent
- Has Brandon left or is leaving Tom Gibbs employment? → C1.2 is now urgent
- Has annual revenue/value of DealerScan exceeded the cost of an attorney consultation by 10x? → C1.1 is now overdue

---

## ⚠️ Important framing

This document is engineering-grade compliance triage, not legal advice. Brandon has not yet
consulted an attorney. Every item here is a starting point for that consultation, not a
substitute for it. Where this document says "do X by date Y," treat that as Aria's
recommendation based on the team's read of the situation — not a binding deadline.

The single most leveraged action on this entire roadmap is **a 30-minute consultation with a
Florida small-business attorney experienced in auto dealer compliance.** That conversation
will reorder priorities below. Until it happens, this roadmap is best-effort.

---

## Data DealerScan handles (the why behind everything below)

- Driver's licenses (PII + photo + sometimes SSN on legacy formats)
- Insurance cards (PII + policy info)
- Bank statements / pay stubs (NPI — non-public personal information)
- Credit applications (SSN + full financial profile)
- Title documents (VIN, lien holder info)
- Trade-in registration documents (PII)

Categorization: **PII + NPI + financial records.** This pulls DealerScan into:
- Gramm-Leach-Bliley Act (federal) — auto dealers extending credit/leases are "financial institutions"
- FTC Section 5 (federal) — unfair/deceptive practices
- Florida Information Protection Act (state) — breach notification
- CCPA/CPRA (California) — only if a CA resident's data ends up in the system
- Driver's Privacy Protection Act — peripheral, mostly for VIN/title work

---

## Where we stand today (honest assessment)

### ✅ What's actually covered

| Control | Status | Notes |
|---------|--------|-------|
| OAuth-based authentication | ✅ | Google identity, no shared passwords |
| Encryption in transit | ✅ | HTTPS to Drive, Tekion, Apps Script |
| Encryption at rest | ✅ | Google Drive default; stronger contractual basis once on Workspace |
| Access logging | ✅ | Events sheet captures upload/archive/error events |
| Role-based access (3 tiers) | ✅ | Salesperson / Manager / IT enforced via config |
| Retention limit | ✅ | Daily archive + 30-day purge prevents indefinite hoarding |
| No third-party data sharing | ✅ | DealerScan doesn't pipe data to ad networks or external CRMs |

### ❌ What's NOT covered (the gaps)

| Gap | Severity | Notes |
|-----|----------|-------|
| No written information security program (WISP) | HIGH | GLBA Safeguards Rule requires this in writing |
| No Data Processing Agreement with Google | HIGH | Consumer Gmail had none; Workspace migration closes this |
| No customer privacy notice mentioning DealerScan | HIGH | Tom Gibbs's notice almost certainly doesn't cover it |
| No documented incident response plan | HIGH | What happens if a salesperson's account is breached? |
| No formal Brandon ↔ Tom Gibbs data agreement | CRITICAL | Personal domain holding dealership data with no written governance |
| No multi-factor authentication enforced | MEDIUM | Workspace can enforce; consumer Gmail couldn't |
| No data minimization review | MEDIUM | 30-day window is fine; haven't formally reviewed if it should be shorter |
| No vendor risk assessments | MEDIUM | Tekion inherited from dealership; Google + Vision API never reviewed |
| No formal user access reviews | MEDIUM | New hires added; offboarding undocumented |
| Vision API processing of DL images | LOW-MEDIUM | Allowed under Workspace terms; should be in privacy notice |
| No customer-specific consent for DealerScan flow | LOW | Implied by dealership notice; explicit would be safer |
| No business entity / personal liability shield | CRITICAL (when scaling) | One dealership = manageable. Multiple = no LLC = personal liability for breach |
| No cyber liability insurance | HIGH (when scaling) | Reasonable peace of mind; required for B2B sales |

---

## The roadmap

Items grouped by horizon. Reorder freely after attorney consultation.

### 🚨 Priority 0 — This week (immediately after migration completes)

These are foundational and don't require legal counsel to start.

- [ ] **C0.1** Don't onboard new salespeople onto DealerScan until C1.x items are addressed
- [ ] **C0.2** Don't expand DealerScan to additional dealerships under any circumstance until C2.x items are complete
- [ ] **C0.3** Confirm Workspace migration completed cleanly — Google DPA is now in effect under `dealerscanapp.com` Workspace tier
- [ ] **C0.4** Enforce 2FA for all `dealerscanapp.com` Workspace users (Admin Console → Security → 2-Step Verification → "Enforcement: ON")
- [ ] **C0.5** Document Vision API key rotation policy — moved out of source into PropertiesService during migration; document the process for when it next rotates

### 📅 Priority 1 — Within 30 days

- [ ] **C1.1** **Schedule the attorney consultation.** Florida small-business attorney with auto dealer compliance experience. 30-60 minutes. Estimated cost $300-800. Bring this document. Specifically ask about:
  - GLBA Safeguards Rule application to your specific architecture
  - The data ownership ambiguity between you and Tom Gibbs
  - Whether you should form an LLC now or wait until scaling
  - Florida-specific breach notification obligations
  - What the dealership-side privacy notice should say about DealerScan
  - Cyber liability insurance recommendations and minimum coverage limits

- [ ] **C1.2** **Have the conversation with Tom Gibbs leadership.** Three possible outcomes:
  - **Option A — Dealership owns DealerScan.** Transfer domain, Workspace, code to a Tom-Gibbs-owned entity. You become the developer-of-record under W-2 or 1099. Cleanest legally, weakest for your future product ambitions.
  - **Option B — Service provider agreement.** Brandon retains ownership; Tom Gibbs is a customer/client. Written agreement governs data handling. Most flexible for your future plans.
  - **Option C — Status quo (do not pick this).** Keep operating without a written agreement. Increasing legal exposure as time passes.

- [ ] **C1.3** **Draft a basic Written Information Security Program (WISP).** Use a GLBA Safeguards Rule template (Wolters Kluwer, NADA, FTC's own guidance all have starter templates). 4-8 pages minimum. Covers:
  - Designated qualified individual (you, until/unless dealership takes ownership)
  - Annual risk assessment process
  - Access controls
  - Encryption standards
  - Vendor management list
  - Incident response procedures
  - Employee training expectations

- [ ] **C1.4** **Document data flow diagram.** One-page visual: where customer data enters (mobile shortcut + Tekion injection), where it lives (Drive folders), where it's processed (Apps Script + Vision API), where it leaves (Tekion deal jacket). Helps the attorney, helps any future dealership client, helps you.

- [ ] **C1.5** **Review what data Vision API actually sees.** Confirm Google Workspace terms explicitly disallow training on this data. Document the finding.

### 📅 Priority 2 — Within 90 days

- [ ] **C2.1** **Quote cyber liability insurance.** Three quotes minimum. Coverage to discuss with broker:
  - $1M minimum aggregate, ideally $2-3M when ready to take on second dealership
  - Specifically covers: third-party data breach, regulatory defense costs, business interruption, ransomware
  - Policy should name `dealerscanapp.com` as the insured entity (or LLC once formed)

- [ ] **C2.2** **Form the LLC** if attorney recommends it. Florida LLC filing fee is $125 + ~$300-500 attorney/CPA setup. Move domain, Workspace billing, contracts under LLC.

- [ ] **C2.3** **Update Tom Gibbs's customer privacy notice** with dealership compliance officer. Should reference "third-party document processing tools" generically, ideally name DealerScan specifically. Customer-facing version stays simple; internal documentation explains what each tool does.

- [ ] **C2.4** **Implement formal user access review** — quarterly check of who's in `config.managers`, `config.itUsers`, and `_DealerScan_Users.json`. Document removals when salespeople leave Tom Gibbs. This becomes a v3.x feature: an Access Review tile in DealerScan Dash that shows last-login date and prompts for inactive users.

- [ ] **C2.5** **Implement audit log surface.** Already on Rex's flag list for v3.9. Becomes compliance-relevant: who toggled the global switch, removed users, changed config. Stored in `_DealerScan_Audit.json`.

- [ ] **C2.6** **Data retention policy review.** Currently: 1 day active → 30 days archive → trash. Confirm with attorney this is sufficient for state-law record-keeping (Florida requires some auto dealer records kept 5+ years — but those are typically the FINAL deal records in a DMS, not the document scans). Document the policy.

- [ ] **C2.7** **Tekion vendor risk assessment.** Inherited from dealership but document what you know: SOC 2 status, where they store data, breach notification commitments. One page.

- [ ] **C2.8** **Google Workspace vendor risk assessment.** One page. Covers: DPA in place, SOC 2 + ISO 27001 certifications, breach notification SLAs, where data is stored regionally.

### 📅 Priority 3 — Before scaling to a second dealership

These are non-negotiable preconditions for selling DealerScan to anyone besides Tom Gibbs.

- [ ] **C3.1** **Multi-tenant data isolation audit.** Right now, all customer folders sit under one parent. For multi-tenant, each dealership needs strictly-isolated Drive folders, separate Apps Script properties, ideally separate OAuth clients. Architecture review needed.

- [ ] **C3.2** **Per-dealership Data Processing Agreement template.** Attorney drafts a master DPA. Each new dealership signs before onboarding. Covers: data handling, breach notification, audit rights, data return on contract termination, indemnification.

- [ ] **C3.3** **SOC 2 Type 1 readiness assessment.** ~$5-10K, 2-3 months. Identifies gaps before formal audit. Drata, Vanta, Secureframe are common platforms. Required entry-level credential for B2B SaaS in regulated industries.

- [ ] **C3.4** **SOC 2 Type 1 audit.** ~$15-25K, 3-6 months. Independent auditor confirms controls. Customers will ask for the report.

- [ ] **C3.5** **SOC 2 Type 2 audit.** Annual. ~$20-30K. Confirms controls work over time, not just on audit day. Becomes table stakes once you have 5+ dealership customers.

- [ ] **C3.6** **Privacy policy for `dealerscanapp.com`.** Public-facing. Distinct from each dealership's customer-facing notice. Covers what DealerScan-the-product does with data on dealership customers' behalf.

- [ ] **C3.7** **Terms of Service for `dealerscanapp.com`.** B2B contract terms. Drafted by attorney.

- [ ] **C3.8** **Penetration test.** ~$5-15K. Annual. Critical for SOC 2 and for any sophisticated dealership client's vendor questionnaire.

- [ ] **C3.9** **Background-check policy** for any future employees/contractors who handle dealership customer data. Even if it's just you and one developer, document it.

### 📅 Priority 4 — Strategic / aspirational

Mature posture once DealerScan is a real multi-dealership product.

- [ ] **C4.1** Consider HITRUST or similar industry-specific certifications if entering markets adjacent to healthcare or finance
- [ ] **C4.2** Establish a security incident bug bounty program (HackerOne, Bugcrowd) — signals seriousness to enterprise clients
- [ ] **C4.3** Annual third-party security review independent of SOC 2
- [ ] **C4.4** Designated DPO (Data Protection Officer) — required if EU customers/data ever enter the picture
- [ ] **C4.5** ISO 27001 certification — international clients ask for this; SOC 2 doesn't cross borders cleanly

---

## What every team agent has on their plate (compliance angle)

These are technical items the team can build NOW that materially improve compliance posture, alongside or independent of the legal track.

### 🛡️ Rex
- Token authentication on all mutation endpoints (already in v3.9 plan as Rex #2 — now also a compliance-grade audit trail item)
- Hashed per-user identifiers in event logs instead of raw emails
- Document Vision API data flow in code comments
- Document data residency: where Drive content sits, where Apps Script runs

### 🔍 Quinn
- Rate-limiting on Apps Script endpoints to detect anomalous usage
- Self-test mode for IT panel doubles as a "system health check" during compliance reviews
- Crash reporter (already v3.9-planned) gives the audit trail required by GLBA incident detection

### 🎨 Sage
- Privacy notice modal first-time salespeople onboard ("Your activity in DealerScan is logged for compliance purposes. Customer documents are handled per Tom Gibbs's privacy policy.")
- Visible indicator when Vision API is processing a DL ("Reading document...")
- Settings panel section for "Data & Privacy" linking to dealership privacy notice

### 🚀 Nova
- Audit log file `_DealerScan_Audit.json` for config changes (already on the v3.9 list)
- Automated weekly export of access logs to a tamper-evident location (e.g., a separate read-only Drive folder)
- Documented build/deploy process (already partially done with `build.sh` and git)

### 🧪 Kai
- Test scenarios specifically for incident detection (compromised account, unauthorized access attempts)
- Onboarding/offboarding flow tests so user-removal is verifiable

### 🎯 Aria
- Track this roadmap monthly
- Surface compliance items into version planning so they don't get permanently deferred
- Coordinate with Brandon on attorney conversation timing

---

## What goes wrong if we ignore this

Honest worst-case scenarios, ranked by probability:

1. **A salesperson's Google account gets phished.** Attacker accesses Drive folders, exfiltrates customer DLs and credit apps. Florida law requires breach notification within 30 days. Tom Gibbs's customers learn their data was on a personally-owned domain they never heard of. Probability: not low. Impact: severe.

2. **A customer asks Tom Gibbs's compliance officer where their driver's license is stored.** Officer can't answer. Officer investigates. Brandon-built shadow-IT system gets shut down by leadership. Months of work nullified. Probability: medium. Impact: moderate.

3. **FTC or state regulator audit of Tom Gibbs.** Auditor asks for written information security program covering all systems handling NPI. DealerScan isn't in it. Tom Gibbs faces fines for inadequate Safeguards Rule compliance. Tom Gibbs sues Brandon for the gap. Probability: low. Impact: severe.

4. **Brandon leaves Tom Gibbs (any reason).** No written agreement governs what happens to the customer data on Brandon's domain. Both parties think they're in the right. Lawsuit. Probability: medium over multi-year horizon. Impact: severe.

5. **A second dealership wants to use DealerScan.** Signs nothing. Pays nothing. Or signs something Brandon drafted in 30 minutes. Their first breach becomes Brandon's lawsuit. Probability: depends on Brandon's choices. Impact: catastrophic for personal finances if no LLC and no insurance.

The single highest-leverage move on this entire document is C1.1 (attorney consultation) followed by C1.2 (Tom Gibbs conversation). Everything else flows from how those two go.

---

## Honest closing notes

**Brandon — three things I want you to hear:**

1. **You are not behind.** You're in roughly the same compliance posture as 80%+ of small dealership tools built by employee-developers. The difference between you and them: you're asking the question. That's worth a lot.

2. **You don't need to solve everything this quarter.** This is a 12-24 month maturation. Priority 1 items handled in 30 days is excellent. Priority 2 in 90 days. Priority 3 only when you're ready to take on a second dealership client. Don't burn out trying to do all of it at once.

3. **The Workspace migration alone closed two of the biggest gaps.** DPA-with-Google and the ability to enforce 2FA. That's not nothing. That's a real, structural compliance improvement that you executed in less than 24 hours under pressure. Credit yourself for it.

— Aria, with input from Rex, Quinn, Sage, Nova, Kai
   2026-04-30, end of compliance roadmap session
