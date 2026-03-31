---
phase: 04
slug: smart-conversation-decision-support
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/lib/__tests__/chat-prompt.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/__tests__/chat-prompt.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | CONV-03, CONV-04, CONV-05 | unit | `npx vitest run src/lib/__tests__/chat-prompt.test.ts` | ✅ | ⬜ pending |
| 04-01-02 | 01 | 1 | CONV-03, CONV-04, CONV-05 | manual | Browser testing | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. vitest is installed, chat-prompt.test.ts exists.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Recommendation quality | CONV-03 | Claude behavior non-deterministic | Ask "something light" — verify relevant menu items suggested |
| Ordinal reference resolution | CONV-04 | Multi-turn context requires live conversation | Ask about a category, then "tell me more about the second one" |
| Comparison/decision help | CONV-05 | Conversational quality non-deterministic | Say "I'm deciding between X and Y" — verify helpful comparison |
| Proactive narrowing offer | CONV-05 | Behavioral trigger after 3+ turns | Have 3+ item discussions, verify app offers to help narrow down |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
