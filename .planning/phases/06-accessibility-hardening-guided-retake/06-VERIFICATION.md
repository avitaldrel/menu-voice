---
phase: 06-accessibility-hardening-guided-retake
verified: 2026-03-30T08:00:00Z
status: human_needed
score: 11/11 automated must-haves verified
human_verification:
  - test: "VoiceOver end-to-end flow on iOS Safari"
    expected: "A blind user can open the app, hear the welcome message, scan a menu, hear processing and results announcements, ask questions via voice, navigate to Settings (hearing 'Settings - MenuVoice'), navigate back (hearing 'MenuVoice - Scan a Menu'), and complete the full flow without any sighted assistance"
    why_human: "VoiceOver behavior on real iOS hardware cannot be verified programmatically — screen reader announcement timing, double-speak prevention (role=alert without aria-live), and audio element playback all require device testing"
  - test: "Guided retake flow on a real device with a blurry photo"
    expected: "When a low-quality photo produces extractionConfidence < 0.3 or warnings, the app announces retake guidance via role=alert, shows the yellow warning panel, offers the ScanButton to retake, and shows 'Proceed with what I have' after 2+ attempts"
    why_human: "Requires deliberately capturing a blurry/dark photo to trigger the quality gate; cannot simulate real extraction confidence values without calling the actual Claude Vision API"
  - test: "Welcome TTS on first ScanButton tap plays via audio element (not SpeechSynthesis)"
    expected: "'Welcome to MenuVoice. Tap Scan Menu to photograph a restaurant menu.' plays through the <audio> element on the first ScanButton tap, does not repeat on subsequent taps, and does not conflict with VoiceOver"
    why_human: "iOS Safari autoplay policy and audio element vs SpeechSynthesis distinction require device testing; unit tests mock TTSClient so cannot verify the actual audio pipeline"
---

# Phase 6: Accessibility Hardening & Guided Retake Verification Report

**Phase Goal:** App works flawlessly via voice alone on iOS Safari with VoiceOver, with no sighted interaction required at any step
**Verified:** 2026-03-30T08:00:00Z
**Status:** human_needed — all automated checks pass; 3 behaviors require iOS VoiceOver device testing
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Screen reader announces "Menu loaded. {restaurantName} is ready." when extraction completes | ✓ VERIFIED | `AppStateAnnouncer.tsx` returns `"Menu loaded. ${name} is ready."` when `status === 'results'`; 2 tests covering named and null restaurant |
| 2 | Screen reader announces "Reading your menu, N photos." when extraction starts | ✓ VERIFIED | `AppStateAnnouncer.tsx` returns `"Reading your menu, ${count} photo${count === 1 ? '' : 's'}."` when `status === 'processing'`; tests for fileCount 1 and 3 |
| 3 | Next.js route announcer reads "Settings - MenuVoice" when navigating to settings | ✓ VERIFIED | `src/app/settings/layout.tsx` exports `metadata.title = 'Settings - MenuVoice'`; no `'use client'` directive — valid server component |
| 4 | Next.js route announcer reads "MenuVoice - Scan a Menu" when on the main page | ✓ VERIFIED | `src/app/layout.tsx` exports `metadata.title = 'MenuVoice - Scan a Menu'` |
| 5 | AppState type includes a 'retake' variant with menu, sessionId, attemptCount, and guidance | ✓ VERIFIED | `src/lib/app-state.ts` line 7: `\| { status: 'retake'; menu: Menu; sessionId: number; attemptCount: number; guidance: string }` |
| 6 | Low-quality extraction (confidence < 0.3 or warnings present) triggers retake state | ✓ VERIFIED | `useMenuExtraction.ts` lines 39-57: `isLowQuality = menu.extractionConfidence < 0.3 \|\| menu.warnings.length > 0` dispatches `EXTRACTION_LOW_QUALITY` |
| 7 | After 2+ attempts, "Proceed with what I have" button appears | ✓ VERIFIED | `RetakeGuidance.tsx` line 34: `{attemptCount >= 2 && (…)}` with aria-label "Proceed with partial menu data" |
| 8 | ARIA role='alert' announces retake guidance to screen readers immediately | ✓ VERIFIED | `RetakeGuidance.tsx` lines 19-25: `role="alert"` `aria-atomic="true"` sr-only div; no explicit `aria-live` (role=alert implies assertive) |
| 9 | Welcome message "Welcome to MenuVoice. Tap Scan Menu…" plays on first ScanButton tap | ✓ VERIFIED | `useVoiceLoop.ts` lines 230-238: `speakWelcome()` with `hasPlayedWelcomeRef` one-shot guard queuing `TTSClient.queueText(welcomeText)` |
| 10 | Welcome message only fires once per session | ✓ VERIFIED | `useVoiceLoop.ts` line 231: `if (hasPlayedWelcomeRef.current) return;` guard; Test 32 verifies second call is no-op |
| 11 | page.tsx wires all accessibility features — AppStateAnnouncer, RetakeGuidance, speakWelcome | ✓ VERIFIED | `src/app/page.tsx`: imports both components (lines 17-18), renders `<AppStateAnnouncer appState={state} />` always in DOM (line 85), renders `<RetakeGuidance>` in retake state (lines 153-160), `handleIdleScan` chains `speakWelcome` to first ScanButton tap (lines 58-61) |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/app-state.ts` | Extended AppState with retake variant, 3 new actions | ✓ VERIFIED | 5 AppState variants; EXTRACTION_LOW_QUALITY, PROCEED_ANYWAY, RETRY_CAPTURE actions + reducer cases |
| `src/components/AppStateAnnouncer.tsx` | Always-in-DOM ARIA live region | ✓ VERIFIED | `role="status"` `aria-live="polite"` `aria-atomic="true"` `className="sr-only"`; named export `AppStateAnnouncer` |
| `src/app/settings/layout.tsx` | Server component with metadata title | ✓ VERIFIED | `metadata.title = 'Settings - MenuVoice'`; no `'use client'`; default export `SettingsLayout` |
| `src/components/RetakeGuidance.tsx` | Retake guidance panel with ARIA alert, ScanButton, conditional proceed button | ✓ VERIFIED | `role="alert"` `aria-atomic="true"` sr-only div; yellow panel; ScanButton; proceed button when `attemptCount >= 2` |
| `src/hooks/useMenuExtraction.ts` | Quality detection dispatching EXTRACTION_LOW_QUALITY | ✓ VERIFIED | `attemptCount` param added; `isLowQuality` gate at lines 39-57 |
| `src/app/page.tsx` | Retake state wiring, AppStateAnnouncer, welcome TTS | ✓ VERIFIED | All 3 features present and wired |
| `src/hooks/useVoiceLoop.ts` | speakWelcome exposed with one-shot guard | ✓ VERIFIED | `hasPlayedWelcomeRef`; `speakWelcome` in return object and return type |
| `src/lib/__tests__/app-state.test.ts` | Tests for retake state transitions | ✓ VERIFIED | 4 new tests for EXTRACTION_LOW_QUALITY, PROCEED_ANYWAY, RETRY_CAPTURE, attemptCount increment |
| `src/components/__tests__/AppStateAnnouncer.test.tsx` | Tests for AppStateAnnouncer rendering | ✓ VERIFIED | 11 tests covering all status variants |
| `src/components/__tests__/RetakeGuidance.test.tsx` | Tests for RetakeGuidance behaviors | ✓ VERIFIED | 12 tests covering ARIA, deduplication, conditional buttons, callbacks |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `AppStateAnnouncer.tsx` | `app-state.ts` | `import type { AppState }` | ✓ WIRED | Line 3: `import type { AppState } from '@/lib/app-state'` |
| `settings/layout.tsx` | next-route-announcer | `metadata.title = 'Settings - MenuVoice'` | ✓ WIRED | Line 4: title present; server component enables Next.js metadata |
| `useMenuExtraction.ts` | `app-state.ts` | `dispatch({ type: 'EXTRACTION_LOW_QUALITY' })` | ✓ WIRED | Lines 44-55: dispatches with all required fields |
| `RetakeGuidance.tsx` | `ScanButton.tsx` | `import { ScanButton }` | ✓ WIRED | Line 3: `import { ScanButton } from '@/components/ScanButton'`; rendered at line 31 |
| `page.tsx` | `RetakeGuidance.tsx` | renders when `state.status === 'retake'` | ✓ WIRED | Lines 153-160: conditional render with all props threaded |
| `page.tsx` | `AppStateAnnouncer.tsx` | renders always with `appState={state}` | ✓ WIRED | Line 85: always in DOM, not conditional |
| `useVoiceLoop.ts` | `tts-client.ts` | `ttsClientRef.current?.queueText(welcomeText)` | ✓ WIRED | Lines 235-236: `queueText` + `flush` called in `speakWelcome` |
| `page.tsx` | `useVoiceLoop.ts` | `speakWelcome()` called on first ScanButton tap | ✓ WIRED | Lines 37, 59: destructured from hook; called in `handleIdleScan` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `AppStateAnnouncer.tsx` | `appState` prop | `state` from `useReducer(appReducer)` in `page.tsx` | Yes — real app state from reducer transitions | ✓ FLOWING |
| `RetakeGuidance.tsx` | `guidance`, `attemptCount` props | `state.guidance`, `state.attemptCount` from `retake` AppState | Yes — set by `EXTRACTION_LOW_QUALITY` action from `useMenuExtraction` quality gate | ✓ FLOWING |
| `useVoiceLoop.ts` (speakWelcome) | `welcomeText` constant | Hardcoded string fed to `TTSClient.queueText` | Yes — constant is the intended welcome message, not a stub | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite passes | `npx vitest run` | 275 tests passed across 23 files | ✓ PASS |
| AppState retake variant exists | `grep "status: 'retake'"` | Found at `app-state.ts:7` | ✓ PASS |
| ARIA live region has role=status | `grep 'role="status"'` | Found at `AppStateAnnouncer.tsx:24` | ✓ PASS |
| role=alert present in RetakeGuidance | `grep 'role="alert"'` | Found at `RetakeGuidance.tsx:20` | ✓ PASS |
| No explicit aria-live on role=alert | `grep 'aria-live'` in RetakeGuidance.tsx | Only found in code comment (line 18), not as attribute | ✓ PASS |
| Settings page title | `grep "Settings - MenuVoice"` | Found at `settings/layout.tsx:4` | ✓ PASS |
| Main page title | `grep "MenuVoice - Scan a Menu"` | Found at `layout.tsx:6` | ✓ PASS |
| speakWelcome in useVoiceLoop | `grep "speakWelcome"` | Defined at line 230, in return at line 341 | ✓ PASS |
| Welcome text correct | `grep "Welcome to MenuVoice"` | Found at `useVoiceLoop.ts:234` | ✓ PASS |
| One-shot guard present | `grep "hasPlayedWelcomeRef"` | Found at lines 69, 231, 232 | ✓ PASS |
| Commit hashes exist in git | `git log d4701ea 237ce0f cb8b445 ccad785 ff564e8` | All 5 commits found | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| A11Y-01 | 06-03-PLAN.md | All functionality accessible via voice alone — no visual interaction required | ✓ SATISFIED (automated) / ? NEEDS HUMAN (device) | `speakWelcome()` + `handleIdleScan` + VoiceOver-safe ARIA patterns all verified in code; human VoiceOver flow confirmation from 06-03-SUMMARY.md approved checkpoint |
| A11Y-02 | 06-01-PLAN.md | ARIA live regions announce app state changes to screen readers | ✓ SATISFIED | `AppStateAnnouncer` (role=status, polite) for processing/results; `RetakeGuidance` (role=alert) for retake; all always-in-DOM; 23 tests pass |
| MENU-04 | 06-02-PLAN.md | App detects when a photo is unreadable and voice-guides user to retake it | ✓ SATISFIED | Quality gate in `useMenuExtraction.ts` (confidence < 0.3 \|\| warnings.length > 0); `RetakeGuidance` renders guidance, ScanButton, conditional proceed button; full state machine wired in `page.tsx` |

**No orphaned requirements** — REQUIREMENTS.md maps exactly A11Y-01, A11Y-02, MENU-04 to Phase 6; all three are claimed by plans.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None | — | — | — |

All "placeholder" grep hits were HTML form `placeholder` attributes in the settings page and TextInputFallback — these are legitimate input placeholders, not code stubs. No TODO/FIXME/empty-return patterns found in Phase 6 files.

### Human Verification Required

#### 1. VoiceOver End-to-End Flow on iOS Safari

**Test:** On an iOS device with VoiceOver enabled, open the app in Safari. Navigate through the full flow: hear the sr-only h1 announcement, double-tap Scan Menu (welcome TTS should play), take a photo, confirm processing announcement ("Reading your menu, 1 photo."), confirm results announcement ("Menu loaded. {name} is ready."), ask a voice question, navigate to Settings, confirm "Settings - MenuVoice" route announcement, navigate back and confirm "MenuVoice - Scan a Menu" announcement.

**Expected:** All state transitions announced without sighted assistance; no double-speak; audio plays through audio element not SpeechSynthesis.

**Why human:** VoiceOver announcement behavior, timing, double-speak prevention (`role=alert` without explicit `aria-live`), and iOS Safari autoplay policy all require a real device.

**Note:** 06-03-SUMMARY.md documents this checkpoint was approved by a human reviewer on 2026-03-31.

#### 2. Guided Retake Flow with Low-Quality Photo

**Test:** Deliberately photograph a very dark or blurry image. Verify: `role=alert` content is announced immediately, yellow warning panel displays, ScanButton is available for retake. Photograph another blurry image and verify "Attempt 2:" prefix in alert text and "Proceed with what I have" button appears.

**Expected:** Guidance text specific to the failure reason; correct deduplication prefix on second attempt; proceed button after 2+ attempts.

**Why human:** Requires the real Claude Vision API to return `extractionConfidence < 0.3` or non-empty `warnings` — cannot simulate with the development server alone.

#### 3. Welcome TTS Audio Element Verification

**Test:** On iOS Safari, tap Scan Menu and verify audio plays through the `<audio>` element (not SpeechSynthesis). Confirm welcome message does not repeat on a subsequent Scan Menu tap in the results state.

**Expected:** Audio plays without conflicting with VoiceOver screen reader; one-shot behavior confirmed.

**Why human:** The distinction between `<audio>` element and `SpeechSynthesis` can only be confirmed on a real device with VoiceOver active, where SpeechSynthesis would audibly conflict with the screen reader.

### Gaps Summary

No automated gaps. All 11 must-haves verified:
- AppState extended with retake variant and 3 new actions (EXTRACTION_LOW_QUALITY, PROCEED_ANYWAY, RETRY_CAPTURE)
- AppStateAnnouncer: always-in-DOM, `role="status"`, announces processing and results transitions
- Settings layout: server component, correct title for Next.js route announcer
- Main layout: title updated to "MenuVoice - Scan a Menu"
- RetakeGuidance: `role="alert"`, no `aria-live` (correct VoiceOver iOS pattern), yellow warning panel, deduplication prefix, conditional proceed button
- useMenuExtraction: quality gate dispatching EXTRACTION_LOW_QUALITY for confidence < 0.3 or warnings
- useVoiceLoop: `speakWelcome()` with `hasPlayedWelcomeRef` one-shot guard, TTSClient pipeline
- page.tsx: all three features wired (AppStateAnnouncer always in DOM, RetakeGuidance in retake state, handleIdleScan chains speakWelcome)
- 275 tests pass across 23 files; 0 regressions
- 5 documented commit hashes all verified in git history

The 3 human verification items require iOS VoiceOver device testing. The 06-03-SUMMARY.md documents that a human approved the VoiceOver end-to-end checkpoint during execution, which partially satisfies A11Y-01.

---

_Verified: 2026-03-30T08:00:00Z_
_Verifier: Claude (gsd-verifier)_
