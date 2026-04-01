---
phase: 7
slug: polish-frontend-refinement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + @testing-library/react 16.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --reporter=dot` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --reporter=dot`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Area | Test Type | Automated Command | File Exists | Status |
|---------|------|------|------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | globals.css palette, layout.tsx body, Header updates | unit | `npm test` | layout.test.tsx | pending |
| 07-01-02 | 01 | 1 | VoiceButton accent, ScanButton variant, MenuSummary scroll cap, RetakeGuidance warning palette | unit | `npm test` | VoiceButton.test.tsx, ScanButton.test.tsx, MenuSummary.test.tsx, RetakeGuidance.test.tsx | pending |
| 07-02-01 | 02 | 2 | FadePanel, ProcessingState cycling | unit | `npm test` | ProcessingState.test.tsx | pending |
| 07-02-02 | 02 | 2 | TTSClient fade-stop, SpeechSynthesis violation fixes | unit | `npm test` | tts-client.test.ts | pending |
| 07-03-01 | 03 | 3 | Voice command routing, IndexedDB session count, hint system | unit | `npm test` | useVoiceLoop.test.ts, indexeddb-profile.test.ts | pending |
| 07-03-02 | 03 | 3 | Voice command wiring, session count tests, voice command tests | unit | `npm test` | useVoiceLoop.test.ts, indexeddb-profile.test.ts | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework or fixture setup needed.

---

## Manual-Only Verifications

| Behavior | Area | Why Manual | Test Instructions |
|----------|------|------------|-------------------|
| CSS palette warm off-white | D-02 | Visual appearance | Open app, verify cream/warm background on mobile |
| Teal/sage accent rendering | D-01 | Color perception | Verify teal accent on buttons across light/dark |
| Smooth fade transitions | D-07 | Animation timing | Navigate all states, verify 300-500ms transitions |
| iOS Safari welcome TTS | D-11 | Device-specific | Test on real iOS Safari with VoiceOver |
| TTS fade-out on interrupt | D-10 | Audio behavior | Tap during speech, verify graceful fade |
| Pulsing status messages | D-08 | Visual animation | Trigger extraction, verify message cycling |
| MenuSummary scrollable during voice conversation | D-15 | Layout behavior | With large menu, verify VoiceButton stays visible |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
