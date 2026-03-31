---
phase: 04-smart-conversation-decision-support
plan: 01
subsystem: chat-prompt
tags: [system-prompt, recommendation, comparison, decision-support, tdd, conv-03, conv-04, conv-05]
dependency_graph:
  requires: [03-02]
  provides: [CONV-03, CONV-04, CONV-05]
  affects: [src/app/api/chat/route.ts]
tech_stack:
  added: []
  patterns: [natural-language RESPONSE RULES in system prompt, keyword-based unit test assertions]
key_files:
  modified:
    - src/lib/chat-prompt.ts
    - src/lib/__tests__/chat-prompt.test.ts
decisions:
  - Appended 7 new RESPONSE RULES as natural-language bullet directives inside existing template literal — no schema or function signature changes
  - Comparison rule explicitly unlocks price mention to resolve conflict with "prices only when asked" blanket rule
  - Interest carry-forward rule uses "interest" + "earlier" keywords; ordinal rule anchors to "prior responses" for testability
metrics:
  duration: 3 minutes
  completed: 2026-03-31
  tasks_completed: 2
  files_modified: 2
---

# Phase 04 Plan 01: Smart Conversation & Decision Support — Summary

System prompt engineering phase adding 7 behavioral RESPONSE RULES to `buildSystemPrompt()` covering recommendation clarification, interest carry-forward, ordinal reference resolution, voice-optimized comparison format with price unlock, proactive narrowing trigger, decisive recommendation, and single-item "can't decide" handler — completing CONV-03, CONV-04, and CONV-05 with 8 new unit tests and zero regressions across 189 total tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add unit tests for Phase 4 response rules (TDD RED) | 4a46fa5 | src/lib/__tests__/chat-prompt.test.ts |
| 2 | Add 7 response rules to buildSystemPrompt (TDD GREEN) | 72f2c45 | src/lib/chat-prompt.ts |

## What Was Built

**`src/lib/chat-prompt.ts`** — Extended from 6 to 13 RESPONSE RULES, adding:

1. Recommendation rule (CONV-03): ask one clarifying question for broad preferences, then suggest 2-3 items
2. Interest carry-forward rule (CONV-03): lean toward items similar to those shown interest in earlier in conversation
3. Ordinal reference resolution rule (CONV-04): resolve "the first one" / "that second dish" from prior responses
4. Comparison format rule (CONV-05): contrastive single-sentence structure with price per item, 2-3 item max
5. Proactive narrowing rule (CONV-05): offer "Would you like help narrowing it down?" after 3+ item exchanges
6. Clear recommendation rule (CONV-05): end comparisons with "I'd suggest the [item] because [brief reason]"
7. Can't decide rule (CONV-05): ask one mood/hunger question then give ONE recommendation, not multiple options

**`src/lib/__tests__/chat-prompt.test.ts`** — 8 new tests appended to existing `describe('buildSystemPrompt', ...)` block asserting on concept keywords (not exact phrases) for each new rule.

## Verification Results

- `npx vitest run src/lib/__tests__/chat-prompt.test.ts` — 16 tests passed (8 new + 8 existing)
- `npx vitest run` — 189 tests passed, 0 failures across 18 test files
- `grep -c "^- " src/lib/chat-prompt.ts` — 13 rules confirmed
- All CONV-03/04/05 keywords verified present: "clarifying question", "interest...earlier", "prior responses", "comparing items", "price" with comparison context, "narrowing it down", "I'd suggest", "can't decide"

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this phase is system prompt text additions only. No UI components, no data fetching, no placeholders.

## Self-Check: PASSED

- `src/lib/chat-prompt.ts` — FOUND (verified via grep with 13 rules)
- `src/lib/__tests__/chat-prompt.test.ts` — FOUND (verified via test run, 16 passed)
- Commit 4a46fa5 — FOUND (`git log --oneline -5`)
- Commit 72f2c45 — FOUND (`git log --oneline -5`)
