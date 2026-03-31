# Phase 6: Accessibility Hardening & Guided Retake - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden the app for fully voice-only operation on iOS Safari with VoiceOver. Audit and fix all ARIA live regions for state change announcements. Add guided retake flow when captured photos are unreadable. Add skip navigation and welcome message. Goal: a blind user completes the entire flow without sighted assistance.

</domain>

<decisions>
## Implementation Decisions

### ARIA Live Region Strategy
- All app state transitions need ARIA announcements: menu loaded, extraction started/complete, error occurred, listening started/stopped, speaking started, settings saved — comprehensive coverage (A11Y-02)
- Audit all existing components for correct aria-live, role, and announce timing; fix any wrong or missing
- Use Next.js route change detection + aria-live region in layout for page transitions; VoiceOver needs explicit announcement
- Existing `<audio>` element approach per CLAUDE.md already avoids VoiceOver/TTS overlap — verify on iOS Safari; add short delay before ARIA announces after TTS ends

### Guided Retake Flow (MENU-04)
- Detect unreadable photos via `extractionConfidence` from Claude Vision + `warnings[]` array — low confidence (<0.3) or warnings trigger retake guidance
- Specific spoken advice via TTS: "The photo is too dark — try moving closer to a light source and retake" using warning text from extraction
- Auto-prompt for retake: if quality is low, speak guidance and re-present capture button; user can retake or proceed with partial data
- Unlimited retake attempts — user decides when to stop. After 2 low-quality attempts, offer "Would you like to proceed with what I have?"

### VoiceOver End-to-End Flow
- Welcome message on first load: "Welcome to MenuVoice. Tap anywhere to start, then photograph your menu." Focus lands on scan button
- Settings page: standard form navigation with VoiceOver — already implemented in Phase 5 with aria-labels and descriptive buttons
- Add "Skip to main content" link — standard a11y pattern, lightweight
- Test and fix iOS Safari-specific quirks: autoplay policy for TTS, getUserMedia for mic, input[capture] for camera. Document workarounds.

### Claude's Discretion
- Exact ARIA role and aria-live attribute choices per component
- Welcome message exact wording
- iOS Safari workaround implementations

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ErrorState.tsx` — already has `role="alert"`
- `src/components/ProcessingState.tsx` — already has `role="status"` + `aria-live="polite"`
- `src/components/VoiceStateIndicator.tsx` — already has `role="status"` + `aria-live="polite"` with sr-only text
- `src/components/ScanButton.tsx` — file input is sr-only + aria-hidden + tabIndex=-1
- `src/lib/menu-schema.ts` — `Menu.extractionConfidence` and `Menu.warnings[]` already exist for guided retake logic

### Established Patterns
- Screen reader text uses `sr-only` Tailwind class
- Error states use `role="alert"` (implicitly assertive)
- Status updates use `role="status"` + `aria-live="polite"`
- VoiceStateIndicator renders sr-only live region always in DOM — content change triggers announcements

### Integration Points
- `src/app/layout.tsx` — skip nav link and route change announcer go here
- `src/app/page.tsx` — welcome message logic, guided retake flow integration
- `src/hooks/useMenuExtraction.ts` — retake detection logic after extraction completes
- All component files — ARIA audit and fixes

</code_context>

<specifics>
## Specific Ideas

- Menu extraction already returns `extractionConfidence` (0-1) and `warnings[]` array — these are the inputs for guided retake
- The placeholder settings page was replaced in Phase 5 — settings accessibility is already in place
- VoiceStateIndicator's sr-only live region pattern can be reused for new announcements

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
