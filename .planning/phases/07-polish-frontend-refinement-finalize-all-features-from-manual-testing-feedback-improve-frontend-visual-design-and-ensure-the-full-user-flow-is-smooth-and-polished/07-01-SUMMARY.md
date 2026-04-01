---
phase: 07-polish-frontend-refinement
plan: "01"
subsystem: ui-design-system
tags: [design-tokens, color-migration, accessibility, tailwind-v4, oklch]
dependency_graph:
  requires: []
  provides: [warm-palette-design-tokens, component-color-migration, accent-teal-buttons]
  affects: [all-ui-components, globals-css, layout]
tech_stack:
  added: []
  patterns:
    - "Tailwind v4 @theme OKLCH color tokens in globals.css"
    - "CSS variable naming: --color-{name} auto-generates utility classes bg-{name}, text-{name}"
    - "60/30/10 color ratio: cream background (60%), muted surfaces (30%), teal accent (10%)"
key_files:
  created: []
  modified:
    - src/app/globals.css
    - src/app/layout.tsx
    - src/components/Header.tsx
    - src/components/VoiceButton.tsx
    - src/components/ScanButton.tsx
    - src/components/MenuSummary.tsx
    - src/components/TranscriptDisplay.tsx
    - src/components/RetakeGuidance.tsx
    - src/components/ErrorState.tsx
    - src/app/page.tsx
    - src/components/MicPermissionPrompt.tsx
    - src/components/TextInputFallback.tsx
    - src/app/__tests__/layout.test.tsx
    - src/components/__tests__/VoiceButton.test.tsx
    - src/components/__tests__/ScanButton.test.tsx
    - src/components/__tests__/RetakeGuidance.test.tsx
decisions:
  - "OKLCH @theme tokens replace hex :root vars — Tailwind v4 CSS-first, no tailwind.config.js"
  - "ScanButton variant prop (primary/secondary) enables single component for both hero and subdued use cases"
  - "MicPermissionPrompt and TextInputFallback migrated despite not in plan file_list — plan verification required zero bg-black in src/components/"
  - "VoiceButton test updated from w-20/h-20 (80px) to w-24/h-24 (96px) — test was wrong, component was right per UI-SPEC"
metrics:
  duration: "11 minutes"
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 16
requirements_satisfied:
  - D-01
  - D-02
  - D-03
  - D-04
  - D-05
  - D-06
  - D-13
  - D-14
  - D-15
---

# Phase 7 Plan 1: Warm Palette Design System and Component Color Migration Summary

Replaced stark black/white/gray aesthetic with warm restaurant-friendly palette using OKLCH teal/sage accent, warm cream backgrounds, and muted warm surfaces across all 9 UI components plus page.tsx.

## What Was Built

### Task 1: Design tokens, layout body, and Header updates

**globals.css** — Replaced the legacy `:root` hex variable block and `@theme inline` proxy with a direct `@theme` block containing 9 OKLCH color tokens:
- `--color-background`: `oklch(97% 0.015 85)` — warm cream (60% of screen surface)
- `--color-foreground`: `oklch(22% 0.01 85)` — warm near-black
- `--color-muted` + `--color-muted-foreground`: warm light gray surfaces
- `--color-accent` + `--color-accent-hover` + `--color-accent-foreground`: teal/sage (hue 185)
- `--color-destructive` + `--color-destructive-foreground`: muted red for retake flow
- `--color-warning-surface` + `--color-warning-border` + `--color-warning-text`: warm amber warning palette
- `prefers-reduced-motion: reduce` block disabling all transitions/animations (WCAG 2.3.3)
- Dark mode block removed (deferred to v2 per UI-SPEC)

**layout.tsx** — Body class migrated from `bg-white text-black` to `bg-background text-foreground`. Skip link updated to use `bg-accent text-accent-foreground focus:rounded-lg`.

**Header.tsx** — Teal "Voice" span (`text-accent`), `bg-background` header, `border-muted` divider, settings gear tap target enlarged from 40px to 44px via `p-2.5`, descriptive `aria-label="Open Settings — manage allergies and preferences"` (D-13), visible Settings text span for sm+ viewports.

### Task 2: Component color migration

**VoiceButton.tsx** — `idle`/`listening` use `bg-accent text-accent-foreground`; `listening` ring changed from `ring-blue-600` to `ring-accent`; `processing`/`speaking` use `bg-muted text-muted-foreground`; `error` uses `bg-muted text-muted-foreground/60`; focus ring updated to `focus-visible:outline-accent`.

**ScanButton.tsx** — Added `variant?: 'primary' | 'secondary'` and `label?: string` props. Primary: accent colors with shadow. Secondary: muted/subdued style with `min-h-[48px]` and no shadow, for the results footer.

**MenuSummary.tsx** — Category buttons: `bg-muted hover:bg-muted/80`; borders: `border-muted`; dietary badges: `bg-accent/15 text-accent`; warning panel: `bg-warning-surface border-warning-border text-warning-text`; text metadata: `text-muted-foreground`.

**TranscriptDisplay.tsx** — Container: `bg-muted rounded-xl`; both user and assistant text: `text-foreground`.

**RetakeGuidance.tsx** — Guidance panel: `text-warning-text bg-warning-surface border border-warning-border rounded-xl` (D-14 warm visual distinction); proceed button: `bg-muted text-foreground` with `focus-visible:outline-accent`.

**ErrorState.tsx** — Retry button: `bg-accent text-accent-foreground active:bg-accent-hover`.

**page.tsx** — Welcome button: `bg-accent text-accent-foreground`, text changed from "Start" to "Scan My Menu", `aria-label` updated (D-04). Idle state subtext: `text-muted-foreground`. Results state: MenuSummary wrapped in `max-h-[40vh] overflow-y-auto rounded-xl` (D-15 — voice interface always visible). Results footer ScanButton: `variant="secondary" label="Scan New Menu"` with `border-muted` divider.

**MicPermissionPrompt.tsx + TextInputFallback.tsx** — Migrated to accent/muted/warning-surface palette (Rule 2 deviation — plan verification required zero `bg-black` in all of `src/components/`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Migrated MicPermissionPrompt and TextInputFallback**
- **Found during:** Task 2 final verification
- **Issue:** Plan's overall verification required `grep for bg-black in src/components/ returns zero matches`, but plan's `files_modified` list omitted MicPermissionPrompt and TextInputFallback, both of which had `bg-black` buttons
- **Fix:** Updated both components to use accent/muted/warning-surface palette tokens
- **Files modified:** `src/components/MicPermissionPrompt.tsx`, `src/components/TextInputFallback.tsx`
- **Commit:** 576d1f7

**2. [Rule 1 - Bug] Fixed VoiceButton test asserting wrong circle size**
- **Found during:** Task 2 test run
- **Issue:** Pre-existing test asserted `w-20 h-20` (80px) but the component has `w-24 h-24` (96px) per UI-SPEC ("VoiceButton: 96px diameter — established in Phase 2, do not reduce")
- **Fix:** Updated test to assert `w-24 h-24`
- **Files modified:** `src/components/__tests__/VoiceButton.test.tsx`
- **Commit:** 576d1f7

## Pre-existing Failures (out of scope)

11 tests were failing before this plan and remain failing (not caused by this plan's changes):
- `src/lib/__tests__/thinking-chime.test.ts` (7 tests) — AudioContext mock issues
- `src/lib/__tests__/app-state.test.ts` (3 tests) — RETRY/RESET/RETRY_CAPTURE transitions
- `src/app/api/tts/__tests__/route.test.ts` (1 test) — OpenAI SDK mock mismatch

These are tracked for investigation in later plans.

## Known Stubs

None — all color migrations are fully wired through CSS variables. No placeholder text or hardcoded empty data.

## Self-Check: PASSED

Files created/modified verified:
- `src/app/globals.css` — contains `--color-accent: oklch(55% 0.12 185)` ✓
- `src/app/layout.tsx` — contains `bg-background text-foreground` ✓
- `src/components/Header.tsx` — contains `text-accent`, `p-2.5`, `sm:not-sr-only` ✓
- `src/components/VoiceButton.tsx` — contains `bg-accent text-accent-foreground`, no `bg-black` ✓
- `src/components/ScanButton.tsx` — contains `variant` prop ✓
- `src/components/MenuSummary.tsx` — contains `bg-warning-surface`, `bg-accent/15 text-accent` ✓
- `src/components/TranscriptDisplay.tsx` — contains `bg-muted rounded-xl` ✓
- `src/components/RetakeGuidance.tsx` — contains `bg-warning-surface`, `rounded-xl` ✓
- `src/components/ErrorState.tsx` — contains `bg-accent text-accent-foreground` ✓
- `src/app/page.tsx` — contains `max-h-[40vh] overflow-y-auto`, `Scan My Menu`, `variant="secondary"` ✓

Commits verified:
- b95b13b: feat(07-01): design tokens, layout body migration, and Header warm palette ✓
- 576d1f7: feat(07-01): component color migration — warm palette across all UI ✓

Test results: 268 passing, 11 pre-existing failures (not caused by this plan) ✓
