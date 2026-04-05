# Phase 8: Vercel Production Deployment - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy the complete MenuVoice Next.js app to Vercel production so it is publicly accessible on the web. Configure environment variables, ensure all API routes function as serverless/edge functions, verify the full user flow (scan menu -> voice conversation -> TTS output) works end-to-end on the public URL, and add usage tracking and essential security.

</domain>

<decisions>
## Implementation Decisions

### Access & Cost Control
- **D-01:** App is fully public — anyone with the URL can use it, no authentication gate
- **D-02:** No rate limiting for v1 — deploy without request throttling
- **D-03:** Include usage tracking so the owner can see how much API spend is happening and by whom (track per-IP or per-session usage of Claude and OpenAI API calls)
- **D-04:** Vercel Hobby (free) tier — plan around its constraints

### Domain & URL
- **D-05:** Start with Vercel subdomain (e.g., menu-voice.vercel.app), add custom domain later
- **D-06:** No code changes needed for custom domain — just DNS config when ready

### Streaming & Timeouts
- **D-07:** Optimize streaming API routes for 10-second Hobby tier timeout — streaming keeps connection alive as long as first byte arrives within 10s
- **D-08:** Move `/api/menu/extract` to Edge Runtime specifically — multi-image Claude Vision calls can exceed 10s, Edge has no timeout for streaming
- **D-09:** Keep `/api/chat` and `/api/tts` as standard serverless — they stream responses and should stay within 10s limits
- **D-10:** Add explicit timeout handling as fallback for edge cases

### Security
- **D-11:** Essential security only — HTTPS (Vercel default), secure env var storage, basic CSP allowing blob: audio and microphone access
- **D-12:** Basic request validation on API routes — check Content-Type, validate request body shape, reject malformed requests
- **D-13:** No strict CSP or full security header suite for v1

### Claude's Discretion
- Exact CSP directive values for blob: audio URLs and microphone permissions
- Usage tracking implementation approach (logging, analytics service, or custom)
- Vercel project naming and configuration details
- Build optimization settings in next.config.ts

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Configuration
- `next.config.ts` — Currently empty; deployment config goes here
- `.env.example` — Defines required env vars: ANTHROPIC_API_KEY, OPENAI_API_KEY
- `package.json` — Build scripts, dependencies (Next.js 16, Anthropic SDK, OpenAI SDK)

### API Routes (must verify serverless/edge compatibility)
- `src/app/api/chat/route.ts` — Chat streaming route (standard serverless)
- `src/app/api/menu/extract/route.ts` — Menu extraction with Claude Vision (move to Edge Runtime)
- `src/app/api/tts/route.ts` — TTS route calling OpenAI (standard serverless)

### Core Architecture
- `CLAUDE.md` — Critical architecture decisions (TTS via audio element, voice state machine, photo capture approach)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Standard Next.js 16 App Router structure — Vercel-native, no special config needed
- API routes already use standard Next.js route handlers (Request/Response) — serverless-compatible

### Established Patterns
- Streaming responses in chat route — uses ReadableStream, Vercel supports this natively
- Environment variables accessed via process.env — Vercel env var injection is compatible
- No server-side database — IndexedDB is client-only, no migration needed

### Integration Points
- `next.config.ts` — Add Edge Runtime config, security headers, any deployment-specific settings
- `.env.example` — Document all required env vars for Vercel dashboard setup
- API route files — Add Edge Runtime export where needed, request validation middleware

</code_context>

<specifics>
## Specific Ideas

- Usage tracking should show per-IP or per-session API call counts so the owner can monitor spend
- The app should work identically on Vercel as it does locally — no feature degradation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-vercel-production-deployment*
*Context gathered: 2026-04-05*
