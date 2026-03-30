---
phase: 02
slug: voice-interface
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | VOICE-01 | unit | `npx vitest run` | TBD | pending |
| TBD | TBD | TBD | VOICE-02 | unit | `npx vitest run` | TBD | pending |
| TBD | TBD | TBD | VOICE-03 | unit | `npx vitest run` | TBD | pending |
| TBD | TBD | TBD | VOICE-04 | unit | `npx vitest run` | TBD | pending |
| TBD | TBD | TBD | VOICE-05 | unit | `npx vitest run` | TBD | pending |
| TBD | TBD | TBD | VOICE-06 | unit | `npx vitest run` | TBD | pending |
| TBD | TBD | TBD | A11Y-05 | unit | `npx vitest run` | TBD | pending |
| TBD | TBD | TBD | A11Y-06 | unit | `npx vitest run` | TBD | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `openai` npm package installed
- [ ] `OPENAI_API_KEY` env var documented in `.env.example`

*Existing vitest infrastructure from Phase 1 covers test framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Voice recognition on mobile | VOICE-01 | Requires real microphone | Open on mobile, tap mic, speak a question |
| TTS through audio element | VOICE-02 | Requires audio output device | Verify spoken response plays through speakers |
| iOS Safari VoiceOver compat | A11Y-05 | Requires real device with screen reader | Enable VoiceOver, verify no TTS/SR conflict |
| State announcements to SR | A11Y-06 | Requires screen reader | Enable VoiceOver, verify state changes announced |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
