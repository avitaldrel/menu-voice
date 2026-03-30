---
phase: 03
slug: menu-exploration-via-voice
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | CONV-06 | unit | `npx vitest run src/lib/__tests__/chat-prompt.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | CONV-01, CONV-02 | unit | `npx vitest run src/app/api/chat/__tests__/route.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | MENU-05 | unit | `npx vitest run src/hooks/__tests__/useVoiceLoop.test.ts` | ✅ | ⬜ pending |
| 03-02-02 | 02 | 2 | CONV-01, CONV-02 | integration | `npx vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/chat-prompt.test.ts` — stubs for system prompt construction
- [ ] `src/app/api/chat/__tests__/route.test.ts` — stubs for chat API route

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Proactive overview speaks on menu load | MENU-05 | Requires browser with TTS | Open app, capture menu, verify overview is spoken |
| Voice Q&A conversation flow | CONV-01, CONV-02 | Requires mic + speaker | Ask about categories/items, verify spoken responses |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
