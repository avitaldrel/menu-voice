---
phase: 1
slug: foundation-menu-capture
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts (Wave 0 installs) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | MENU-01 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MENU-02 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MENU-03 | unit+integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | A11Y-03 | manual | visual inspection | N/A | ⬜ pending |
| TBD | TBD | TBD | A11Y-04 | manual | keyboard walkthrough | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest configuration with React/JSX support
- [ ] `__tests__/` — test directory structure
- [ ] `vitest` + `@testing-library/react` — dev dependencies installed

*Wave 0 sets up test infrastructure so all subsequent tasks can validate immediately.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| High contrast + large touch targets | A11Y-03 | Visual design check | Inspect elements for min 44px touch targets, WCAG AA contrast ratio |
| Keyboard navigable | A11Y-04 | Interaction test | Tab through all interactive elements, verify focus visible |
| Camera capture on mobile | MENU-01 | Device-specific | Open on mobile browser, tap Scan Menu, verify camera launches |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
