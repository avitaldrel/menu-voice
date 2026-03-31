---
phase: 05
slug: allergy-preference-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/lib/__tests__/profile.test.ts src/lib/__tests__/chat-prompt.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~35 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command (phase-relevant tests)
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 35 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | ALLERGY-01, ALLERGY-06 | unit | `npx vitest run src/lib/__tests__/profile.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | ALLERGY-02, ALLERGY-03, ALLERGY-04, ALLERGY-05 | unit | `npx vitest run src/lib/__tests__/chat-prompt.test.ts` | ✅ | ⬜ pending |
| 05-03-01 | 03 | 2 | ALLERGY-02 | unit | `npx vitest run src/hooks/__tests__/useVoiceLoop.test.ts` | ✅ | ⬜ pending |
| 05-04-01 | 04 | 2 | ALLERGY-01 | manual | Browser testing | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/profile.test.ts` — stubs for IndexedDB profile CRUD tests
- [ ] `fake-indexeddb` dev dependency — needed for IndexedDB unit testing in jsdom

*Existing infrastructure covers remaining phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Allergy capture via conversation | ALLERGY-02 | Requires live Claude API + voice | Say "I'm allergic to peanuts" — verify confirmation and persistence |
| Proactive allergen warning | ALLERGY-03 | Non-deterministic Claude behavior | Ask about item with known allergen — verify warning spoken |
| Modification suggestion | ALLERGY-04 | Non-deterministic Claude behavior | Verify "ask if they can make it without X" suggestion |
| Safety disclaimer | ALLERGY-05 | Timing verification | Verify disclaimer spoken once after first warning |
| Profile persistence | ALLERGY-06 | Requires browser session restart | Close and reopen app — verify profile loaded |
| Settings page | ALLERGY-01 | UI interaction | Navigate to settings, add/remove allergies |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 35s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
