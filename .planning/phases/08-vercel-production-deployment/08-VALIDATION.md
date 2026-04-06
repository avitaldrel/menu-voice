---
phase: 8
slug: vercel-production-deployment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | D-08 | build | `npx next build` | ✅ | ⬜ pending |
| 08-01-02 | 01 | 1 | D-11 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | D-12 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 1 | D-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing test infrastructure covers build verification
- [ ] New tests needed for security headers, request validation, and usage tracking

*Existing vitest infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full user flow on Vercel URL | D-01 | Requires deployed environment | Deploy, open URL, scan menu, have voice conversation, verify TTS plays |
| Web Speech API works on production | D-01 | Browser-native API, can't unit test | Open deployed app in Chrome/Safari, verify mic access prompt appears and speech recognition works |
| TTS audio plays via blob: URLs | D-11 | Requires real audio playback | Verify CSP allows blob: audio, TTS speaks responses |
| Edge Runtime handles multi-image extraction | D-08 | Requires real Vercel Edge deployment | Upload 3+ page menu, verify extraction completes without timeout |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
