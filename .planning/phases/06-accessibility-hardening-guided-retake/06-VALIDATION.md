---
phase: 06
slug: accessibility-hardening-guided-retake
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/lib/__tests__/app-state.test.ts src/components/__tests__/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~40 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command (phase-relevant tests)
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 40 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | A11Y-02 | unit | `npx vitest run src/components/__tests__/` | ✅ | ⬜ pending |
| 06-02-01 | 02 | 1 | MENU-04 | unit | `npx vitest run src/lib/__tests__/app-state.test.ts` | ✅ | ⬜ pending |
| 06-03-01 | 03 | 2 | A11Y-01 | manual | VoiceOver end-to-end test | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full VoiceOver flow | A11Y-01 | Requires iOS device + VoiceOver | Complete entire flow eyes-closed with VoiceOver |
| ARIA announcements audible | A11Y-02 | VoiceOver timing behavior | Verify all state changes announced audibly |
| Guided retake spoken advice | MENU-04 | Requires real camera + blurry photo | Upload low-quality photo, verify spoken guidance |
| Skip nav link | A11Y-01 | Keyboard/VoiceOver navigation | Tab to skip link, activate, verify focus jump |
| Welcome message | A11Y-01 | First-run experience | Fresh browser session, verify welcome spoken |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 40s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
