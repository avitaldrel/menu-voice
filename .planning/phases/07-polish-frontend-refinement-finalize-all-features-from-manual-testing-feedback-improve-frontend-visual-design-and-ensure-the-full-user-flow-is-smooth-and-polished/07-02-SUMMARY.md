---
phase: 07-polish-frontend-refinement
plan: "02"
subsystem: state-transitions-tts
tags: [animation, tts, accessibility, fade, speechsynthesis-removal]
dependency_graph:
  requires: [07-01]
  provides: [fade-panel-component, processing-cycling-messages, tts-fadeout, speechsynthesis-free-app]
  affects: [page.tsx, tts-client, useVoiceLoop, ProcessingState, RetakeGuidance]
tech_stack:
  added: []
  patterns:
    - "FadePanel uses requestAnimationFrame for deferred opacity mount (avoids synchronous paint)"
    - "ProcessingState cycling messages via setInterval with modulo index — visual only, ARIA static"
    - "TTSClient.fadeAndStop ramps audio volume over 200ms (10 steps x 20ms) before pausing"
    - "speakText hook method exposes TTSClient to page-level callers without prop drilling complexity"
    - "RetakeGuidance speakText prop enables TTSClient injection while keeping component decoupled"
key_files:
  created:
    - src/components/FadePanel.tsx
  modified:
    - src/components/ProcessingState.tsx
    - src/app/page.tsx
    - src/lib/tts-client.ts
    - src/hooks/useVoiceLoop.ts
    - src/components/RetakeGuidance.tsx
    - src/lib/__tests__/tts-client.test.ts
decisions:
  - "startListening() MUST be called before speakWelcome() — SPEECH_RESULT is a no-op in idle state; state machine must be in listening for the transition to work"
  - "fadeAndStop callback deferred 200ms but queue/buffer/isPlaying cleared immediately — prevents new sentences from starting while fade plays out"
  - "RetakeGuidance speakText prop is optional (speakText?) for backward compatibility with existing tests that do not pass it"
  - "Processing interval useEffect adds speakText to deps array — React linting requirement since speakText is a useCallback that changes reference on ensureInstances change"
metrics:
  duration: "5 minutes"
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_modified: 7
requirements_satisfied:
  - D-07
  - D-08
  - D-09
  - D-10
  - D-11
---

# Phase 7 Plan 2: State Transitions, Processing Polish, and TTS Bug Fixes Summary

Smooth fade-in transitions between all app states, cycling processing messages, 200ms TTS fade-out on interrupt, and elimination of all SpeechSynthesis violations from page.tsx and RetakeGuidance.

## What Was Built

### Task 1: FadePanel component, ProcessingState cycling messages, and state panel wrapping

**FadePanel.tsx** — New reusable component that fades children from opacity-0 to opacity-100 on mount using `requestAnimationFrame` to avoid synchronous paint. Supports durations of 200ms, 300ms (default), or 400ms via Tailwind utility classes.

**ProcessingState.tsx** — Added `PROCESSING_MESSAGES` array with 4 strings: "Reading your menu...", "Finding categories...", "Almost done...", "Just a moment...". Visual display cycles through them every 4 seconds with `setInterval` using modulo arithmetic. ARIA sr-only region continues to show the static `{isVisible ? message : ''}` prop from page.tsx — never the cycling message. Spinner color updated from `border-black` to `border-accent` per new palette. Added `animate-pulse` to the cycling text paragraph.

**page.tsx** — Added `import { FadePanel }` and wrapped all 5 state panels:
- Welcome: `<FadePanel duration={400}>` (slower, entry is the success path)
- Idle: `<FadePanel>` (default 300ms)
- Results: `<FadePanel>` (default 300ms — makes D-09 auto-overview transition visually smooth as results panel fades in while overview TTS begins)
- Retake: `<FadePanel duration={200}>` (faster for error-path states)
- Error: `<FadePanel duration={200}>` (faster for error-path states)

ARIA live regions (AppStateAnnouncer, ProcessingState role=status, VoiceStateIndicator) are NOT wrapped in FadePanel per RESEARCH.md Pitfall 4.

### Task 2: TTSClient fade-out and SpeechSynthesis violation fixes

**tts-client.ts** — Added private `fadeAndStop(onDone: () => void)` method that ramps `audio.volume` from current value to 0 over 200ms (10 intervals at 20ms each), then resets volume to 1 and calls the callback. `stop()` now uses `fadeAndStop` for the audio pause and blob URL revocation, while queue/buffer/isPlaying are cleared immediately to prevent new sentences from starting during the fade.

**page.tsx handleStart** — Replaced the entire inline TTS block (raw `fetch('/api/tts')`, `new Audio()`, `SpeechSynthesisUtterance` fallback) with:
```typescript
startListening(); // idle -> listening (REQUIRED before speakWelcome)
speakWelcome();   // SPEECH_RESULT now works (listening -> processing -> speaking -> listening)
setTimeout(() => cameraInputRef.current?.click(), 4000);
```
`startListening()` is called first because `SPEECH_RESULT` dispatched by `speakWelcome()` is a no-op in `idle` state — the voice state machine must already be in `listening`.

**page.tsx processing interval** — Replaced `SpeechSynthesisUtterance` + `speechSynthesis.speak()` with `speakText('Still reading your menu, one moment please.')`. Added `speakText` to the `useEffect` deps array.

**useVoiceLoop.ts** — Added `speakText` function using `ttsClientRef.current?.queueText(text); ttsClientRef.current?.flush()`. Added to return type annotation and returned object.

**RetakeGuidance.tsx** — Added optional `speakText?: (text: string) => void` prop. Replaced the entire `useEffect` TTS block (fetch + Audio + SpeechSynthesisUtterance fallback) with:
```typescript
if (!spokenRef.current && speakText) {
  spokenRef.current = true;
  speakText(fullMessage);
  setTimeout(() => { if (onVoiceResponse) onVoiceResponse(); }, 5000);
}
```
No `fetch`, no `new Audio()`, no `SpeechSynthesisUtterance`, no `speechSynthesis.speak`.

**tts-client.test.ts** — Updated the `stop()` test to separate immediate effects (speechSynthesis.cancel) from deferred effects (audio.pause after fade). Added new test using `vi.useFakeTimers()` + `vi.advanceTimersByTime(220)` to verify audio.pause is called after the 200ms fade completes.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all TTS paths fully wired through TTSClient. No placeholder data or hardcoded empty values that flow to UI rendering.

## Self-Check: PASSED
