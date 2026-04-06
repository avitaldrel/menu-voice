# Phase 8: Vercel Production Deployment - Research

**Researched:** 2026-04-05
**Domain:** Vercel deployment, Next.js 16 serverless/edge functions, CSP headers, usage tracking
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** App is fully public — anyone with the URL can use it, no authentication gate
- **D-02:** No rate limiting for v1 — deploy without request throttling
- **D-03:** Include usage tracking so the owner can see how much API spend is happening and by whom (track per-IP or per-session usage of Claude and OpenAI API calls)
- **D-04:** Vercel Hobby (free) tier — plan around its constraints
- **D-05:** Start with Vercel subdomain (e.g., menu-voice.vercel.app), add custom domain later
- **D-06:** No code changes needed for custom domain — just DNS config when ready
- **D-07:** Optimize streaming API routes for 10-second Hobby tier timeout — streaming keeps connection alive as long as first byte arrives within 10s
- **D-08:** Move `/api/menu/extract` to Edge Runtime specifically — multi-image Claude Vision calls can exceed 10s, Edge has no timeout for streaming
- **D-09:** Keep `/api/chat` and `/api/tts` as standard serverless — they stream responses and should stay within 10s limits
- **D-10:** Add explicit timeout handling as fallback for edge cases
- **D-11:** Essential security only — HTTPS (Vercel default), secure env var storage, basic CSP allowing blob: audio and microphone access
- **D-12:** Basic request validation on API routes — check Content-Type, validate request body shape, reject malformed requests
- **D-13:** No strict CSP or full security header suite for v1

### Claude's Discretion
- Exact CSP directive values for blob: audio URLs and microphone permissions
- Usage tracking implementation approach (logging, analytics service, or custom)
- Vercel project naming and configuration details
- Build optimization settings in next.config.ts

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Vercel is Next.js's native deployment platform. A Next.js 16 App Router project deploys to Vercel with near-zero configuration: connect a GitHub repo, add environment variables, and push. The core deployment is straightforward. The research surfaces several decisions from CONTEXT.md that require revision or reframing based on current Vercel behavior.

**Critical finding: The CONTEXT.md 10-second timeout assumption (D-07, D-08, D-09) is outdated.** As of April 23, 2025, Vercel Fluid Compute is enabled by default for all new projects, including Hobby. With Fluid Compute, the Hobby plan has a 300-second (5-minute) default and maximum duration — not 10 seconds. This fundamentally changes the Edge Runtime decision (D-08). The `/api/menu/extract` route does NOT need to move to Edge Runtime for timeout reasons. Keeping it on Node.js serverless with Fluid Compute is both simpler and recommended by Vercel themselves (Vercel now recommends migrating away from Edge Runtime to Node.js for improved performance and reliability).

**Second critical finding: `@anthropic-ai/sdk@0.80.0` supports Edge Runtime** (uses fetch-based shims with web environments), so D-08 is safe to implement if still desired, but is not necessary.

**Third important finding: the 4.5MB body size limit** is a real Vercel constraint but is mitigated: the app already performs client-side image resizing to ~500KB per image before sending, so even 5 pages of menu photos will total ~2.5MB, within the limit.

**Primary recommendation:** Keep all three API routes on Node.js runtime (no Edge Runtime needed). Remove the `maxDuration = 30` cap from `/api/menu/extract` (or raise it to 60) so Fluid Compute's 300s default applies. Add security headers and usage logging to complete the deployment.

---

## Timeout Reality Check (Supersedes D-07, D-08, D-09)

The CONTEXT.md decisions were based on an outdated 10-second Hobby tier limit. Current reality as of 2026:

| Plan | Runtime | Without Fluid Compute | With Fluid Compute (default since Apr 23, 2025) |
|------|---------|----------------------|--------------------------------------------------|
| Hobby | Node.js | 10s default, up to 60s configurable | **300s default AND max** |
| Hobby | Edge | 25s to first byte, 300s total streaming | 25s to first byte, 300s total streaming |
| Pro | Node.js | 15s default, up to 300s | 300s default, up to 800s |

Source: [Vercel Fluid Compute docs](https://vercel.com/docs/fluid-compute), [Vercel Hobby Plan docs](https://vercel.com/docs/plans/hobby)

**Key implication:** For a new Vercel project (Hobby), Fluid Compute is on by default, giving 300s. The existing `export const maxDuration = 30` in the route files is FINE — it correctly caps them at 30s as a safety limit, which is the right call for a menu vision API that shouldn't run indefinitely. The planner should keep this cap but document its purpose.

**The Edge Runtime decision (D-08) is no longer needed for timeout reasons.** However, the decision is locked by the user. The planner must implement it as decided. Research confirms it is safe: `@anthropic-ai/sdk@0.80.0` is compatible with Edge Runtime.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.1 | Framework | Already installed; Vercel-native |
| @anthropic-ai/sdk | 0.80.0 | Claude API client | Already installed; Edge Runtime compatible |
| openai | 6.33.0 | TTS via OpenAI | Already installed |
| vercel | CLI | Deploy/link project | Zero-config Next.js deployment |

### No Additional Libraries Needed
This phase is infrastructure/configuration. No new npm packages are required. All deployment work is:
1. Vercel dashboard/CLI configuration
2. `next.config.ts` additions (headers, runtime)
3. In-route changes (Edge Runtime export, usage logging via `console.log`)

**Installation (Vercel CLI — dev tool, not a project dependency):**
```bash
npm install -g vercel
```

---

## Architecture Patterns

### Recommended Deployment Flow

```
GitHub repo (main branch)
     |
     v
Vercel project (connected via dashboard import)
     |
     +-- Production deployment (auto on push to main)
     +-- Preview deployments (auto on PR branches)
```

### Pattern 1: Connect GitHub Repo via Dashboard
**What:** Import project from GitHub at vercel.com/new — Vercel auto-detects Next.js framework, configures build settings.
**When to use:** Always — this is the standard first-time setup.
**Steps:**
1. Go to vercel.com → New Project → Import Git Repository
2. Select the menu-voice GitHub repo
3. Vercel auto-detects: Framework=Next.js, Build Command=`next build`, Output Directory=`.next`
4. Add environment variables (ANTHROPIC_API_KEY, OPENAI_API_KEY) before first deploy
5. Click Deploy

Source: [Vercel Next.js deployment docs](https://vercel.com/docs/frameworks/full-stack/nextjs)

### Pattern 2: Environment Variables in Vercel Dashboard
**What:** Add secret env vars in Project Settings → Environment Variables. Select "Production" environment.
**When to use:** For all API keys — never commit to git.

```
Dashboard path: Project → Settings → Environment Variables
Keys to add:
  ANTHROPIC_API_KEY   → Production (required), Preview (optional)
  OPENAI_API_KEY      → Production (required), Preview (optional)
Environment: Production (mandatory), Preview (recommended for testing)
```

**Note:** Environment variables are encrypted at rest. Safe for API keys.
**Note:** Edge Runtime env vars are limited to 5KB per variable — not an issue for API keys.

Source: [Vercel environment variables docs](https://vercel.com/docs/environment-variables)

### Pattern 3: Edge Runtime Export (for /api/menu/extract per D-08)
**What:** Add `export const runtime = 'edge'` to the route file to opt into Edge Runtime.
**When to use:** As decided in D-08 — the planner must implement this.

```typescript
// Source: https://vercel.com/docs/functions/runtimes/edge
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
// Remove or keep maxDuration — Edge Runtime ignores maxDuration config
// Edge runtime: must send first byte within 25s, can stream up to 300s
```

**Important constraint:** Edge Runtime has a 1MB code size limit on Hobby. The `@anthropic-ai/sdk` import must be within this limit. At `@anthropic-ai/sdk@0.80.0`, the SDK is fetch-based and edge-compatible, but this should be verified during build.

**Fallback if Edge Runtime causes build size issues:** Remove `export const runtime = 'edge'` — Fluid Compute's 300s Node.js timeout is sufficient.

### Pattern 4: Security Headers in next.config.ts
**What:** Use the `headers()` async function in `next.config.ts` to set HTTP security headers on all routes.
**When to use:** Always — required by D-11.

```typescript
// Source: https://nextjs.org/docs/pages/api-reference/config/next-config-js/headers
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            // 'self' for same-origin, blob: for TTS audio element, https: for API calls
            // media-src blob: allows Audio element with blob: URL from TTS
            // connect-src https: allows fetch to Anthropic/OpenAI APIs
            // microphone access is controlled by Permissions-Policy, not CSP
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js requires unsafe-inline for hydration
              "style-src 'self' 'unsafe-inline'",
              "media-src 'self' blob:",  // blob: needed for TTS Audio element
              "connect-src 'self' https:",  // https: for Anthropic + OpenAI APIs
              "img-src 'self' blob: data:",  // blob: for camera preview, data: for base64
              "worker-src 'none'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            key: 'Permissions-Policy',
            // microphone=* allows microphone on all origins (required for Web Speech API)
            // camera=* allows camera for menu photo capture
            value: 'microphone=*, camera=*',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**CSP note:** Next.js 16 App Router uses inline scripts for hydration — `'unsafe-inline'` in `script-src` is required unless using nonce-based CSP (which D-13 defers). This is acceptable per D-11 (essential security only, no strict CSP for v1).

**Permissions-Policy note:** `microphone=*` is needed to permit the Web Speech API. If set to `microphone=()` (deny all), the browser blocks microphone access even with user consent prompts. The Web Speech API requires HTTPS (Vercel provides this automatically) AND a permissive microphone policy.

Source: [MDN CSP media-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/media-src)

### Pattern 5: Usage Tracking via console.log
**What:** Log per-API-call data to `console.log` in each API route. Vercel captures all `console.log` output in Runtime Logs, filterable by route for up to 1 hour on Hobby.
**When to use:** D-03 requires per-IP/per-session usage tracking. Console logging is the zero-dependency approach.

```typescript
// In /api/menu/extract POST handler:
const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
console.log(JSON.stringify({
  event: 'menu_extract',
  ip,
  imageCount: images.length,
  timestamp: new Date().toISOString(),
}));

// In /api/chat POST handler:
const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
console.log(JSON.stringify({
  event: 'chat_turn',
  ip,
  timestamp: new Date().toISOString(),
}));

// In /api/tts POST handler:
const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
console.log(JSON.stringify({
  event: 'tts',
  ip,
  textLength: text.length,
  timestamp: new Date().toISOString(),
}));
```

**Limitation:** Vercel Hobby logs are retained for only 1 hour (up to 4000 rows). For persistent tracking, logs would need to be drained to an external service — this is a v2 concern. V1 with console.log is sufficient for immediate spend monitoring.

Source: [Vercel Runtime Logs](https://vercel.com/docs/logs/runtime), [Vercel Function Logs](https://vercel.com/docs/functions/logs)

### Pattern 6: Request Validation (D-12)
**What:** Validate Content-Type header and required body fields at the top of each API route.
**When to use:** D-12 requires this on all three API routes.

```typescript
// At top of POST handler, before processing:
if (!request.headers.get('content-type')?.includes('application/json')) {
  return Response.json({ error: 'Content-Type must be application/json' }, { status: 415 });
}
```

**Note:** `/api/menu/extract` already validates body shape (images array, length checks). `/api/chat` already validates messages array. `/api/tts` already validates text field. Content-Type header check is the only missing validation.

### Anti-Patterns to Avoid
- **Setting `maxDuration` higher than needed:** The existing `maxDuration = 30` is correct and safe. Do not remove it — it protects against runaway functions.
- **Committing .env files:** ANTHROPIC_API_KEY and OPENAI_API_KEY must only exist in Vercel dashboard env vars and local `.env.local` (gitignored).
- **Using Edge Runtime without verifying bundle size:** Edge Runtime has a 1MB code size limit on Hobby. Verify build succeeds before committing to this approach.
- **Setting `Permissions-Policy: microphone=()`:** This blocks microphone access — the Web Speech API requires microphone=* (or self-origin allowlist).
- **Relying on Edge Runtime for long non-streaming calls:** Edge requires first byte within 25s. If `/api/menu/extract` doesn't stream, it must complete within 25s total on Edge Runtime.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTPS / SSL | Manual cert config | Vercel (automatic) | Vercel provisions and renews Let's Encrypt certs automatically; HTTP→HTTPS redirect is automatic (308) |
| Deployment pipeline | Custom CI/CD | Vercel GitHub integration | Auto-deploys on push to main; preview deploys on PRs |
| Environment secret storage | Encrypted config files | Vercel dashboard env vars | Encrypted at rest, scoped to environment (production/preview/development) |
| CDN / edge caching | Manual headers | Vercel CDN (automatic) | Static assets auto-cached at edge globally |
| Build caching | Custom | Vercel build cache (automatic) | Vercel caches node_modules and Next.js build artifacts between deployments |

**Key insight:** Vercel handles the entire infrastructure layer. The deployment work is configuration-only: env vars, next.config.ts headers, and one `export const runtime = 'edge'` line.

---

## Common Pitfalls

### Pitfall 1: Edge Runtime Code Size Limit (1MB on Hobby)
**What goes wrong:** Build or deployment fails with "Function size exceeded" error.
**Why it happens:** Edge Runtime on Hobby is limited to 1MB (after gzip). The `@anthropic-ai/sdk@0.80.0` is a fairly large package; combined with Next.js internals it may exceed the limit.
**How to avoid:** Run `next build` locally and check the build output for function sizes. If `/api/menu/extract` exceeds 1MB compressed, fall back to Node.js runtime (which has a 250MB limit) — Fluid Compute's 300s timeout makes this safe.
**Warning signs:** Build output shows "FUNCTION_SIZE_EXCEEDED" or deployment fails at the Edge Function bundling step.

### Pitfall 2: maxDuration = 30 Conflict with Edge Runtime
**What goes wrong:** `export const maxDuration = 30` in a route that also exports `export const runtime = 'edge'` — the maxDuration config is ignored by Edge Runtime (Edge has its own 25s first-byte / 300s streaming limits).
**Why it happens:** The two configs are independent. Vercel warns but doesn't error on this.
**How to avoid:** When converting `/api/menu/extract` to Edge Runtime, remove or keep the `maxDuration = 30` — it is silently ignored on Edge. Keep it as documentation of intent.
**Warning signs:** Function takes longer than 30s without being killed (because Edge ignores maxDuration).

### Pitfall 3: 4.5MB Request Body Limit
**What goes wrong:** Multiple large menu photos sent as base64 hit the 4.5MB Vercel body limit — returns HTTP 413.
**Why it happens:** Vercel enforces a hard 4.5MB request body limit on all functions (including Edge).
**How to avoid:** The app already mitigates this with client-side image resizing in `useMenuExtraction.ts` via `resizeImage()` (reduces 8-12MB raw → ~500KB JPEG per image). With this resize, even 8 menu pages stay under 4MB. Confirm the resizeImage target is ≤500KB.
**Warning signs:** `FUNCTION_PAYLOAD_TOO_LARGE` (HTTP 413) on real device testing with many menu photos.

### Pitfall 4: Permissions-Policy Blocking Microphone
**What goes wrong:** Deployed site shows microphone permission denied even after user grants permission in browser.
**Why it happens:** `Permissions-Policy: microphone=()` in response headers overrides browser permission, blocking the Web Speech API.
**How to avoid:** Set `Permissions-Policy: microphone=*, camera=*` (or `microphone=(self)` if stricter scope is wanted). NEVER set `microphone=()` on a site that uses the Web Speech API.
**Warning signs:** SpeechRecognition throws a `not-allowed` error on production but works locally.

### Pitfall 5: CSP Blocking TTS Audio Blob URLs
**What goes wrong:** TTS audio doesn't play on production — `<audio>` element with a blob: URL is blocked by Content-Security-Policy.
**Why it happens:** Default CSP `default-src 'self'` blocks blob: URLs. If `media-src` is not explicitly set to include `blob:`, blob: audio fails.
**How to avoid:** Include `media-src 'self' blob:` in the CSP header. Test TTS audio playback after deploying headers.
**Warning signs:** Audio element loads but plays silence; browser console shows CSP violation for blob: URL.

### Pitfall 6: Environment Variables Not Set Before First Deploy
**What goes wrong:** First deployment succeeds (build passes) but all API calls return 500 errors because env vars are missing.
**Why it happens:** Vercel builds succeed even without runtime env vars (they're injected at runtime, not build time). The API routes already check `if (!process.env.ANTHROPIC_API_KEY)` and return 500.
**How to avoid:** Add env vars in Vercel dashboard BEFORE clicking Deploy on first deployment. Verify by checking the deployment's environment variable settings.
**Warning signs:** All API routes return `{"error":"ANTHROPIC_API_KEY not configured"}` or similar.

### Pitfall 7: Non-streaming Extract Route Hitting 25s Edge Timeout
**What goes wrong:** `/api/menu/extract` on Edge Runtime returns a 504 timeout for complex multi-page menus.
**Why it happens:** `/api/menu/extract` currently does NOT stream — it makes a blocking Claude API call and returns JSON. On Edge Runtime, the entire response must begin within 25 seconds. A complex 5-page menu with Claude Vision may take >25s.
**How to avoid:** Either (a) accept this risk for v1 with simple menus, (b) add streaming to `/api/menu/extract` to send the first byte early, or (c) keep on Node.js runtime (Fluid Compute 300s). The planner should recommend (c) as the safe default, noting (a) is valid for the scope of this deployment.
**Warning signs:** `EDGE_FUNCTION_TIMEOUT` on complex menus; simple menus work fine.

---

## Code Examples

### next.config.ts — Complete Deployment Configuration
```typescript
// Source: https://vercel.com/docs/frameworks/full-stack/nextjs
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "media-src 'self' blob:",
              "connect-src 'self' https:",
              "img-src 'self' blob: data:",
              "worker-src 'none'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            key: 'Permissions-Policy',
            value: 'microphone=*, camera=*',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### Edge Runtime Export (if D-08 is implemented)
```typescript
// Add to top of src/app/api/menu/extract/route.ts
// Source: https://vercel.com/docs/functions/runtimes/edge
export const runtime = 'edge';
// Note: maxDuration is ignored by Edge Runtime — remove or keep as documentation
// Edge Runtime: first byte must arrive within 25s; can stream up to 300s
// This route does NOT currently stream, so the full response must arrive within 25s
```

### Usage Logging Pattern
```typescript
// Source: https://vercel.com/docs/functions/logs + https://vercel.com/docs/headers/request-headers
function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

// Call at start of each API route handler, after validation:
console.log(JSON.stringify({
  event: 'api_call',
  route: '/api/menu/extract',  // or /api/chat, /api/tts
  ip: getClientIP(request),
  imageCount: images.length,   // route-specific context
  timestamp: new Date().toISOString(),
}));
```

### Content-Type Request Validation (D-12)
```typescript
// Add to each API route before body parsing:
if (!request.headers.get('content-type')?.includes('application/json')) {
  return Response.json(
    { error: 'Content-Type must be application/json' },
    { status: 415 }
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hobby = 10s hard limit | Fluid Compute (default): 300s on Hobby | Apr 23, 2025 | Edge Runtime no longer required for timeout reasons on Hobby |
| Edge Runtime recommended for long AI calls | Node.js recommended by Vercel; Edge reserved for latency-sensitive, short ops | 2025 | Less need for Edge Runtime; simpler debugging |
| Manual log retention | Vercel Runtime Logs (1hr on Hobby) | Ongoing | Console.log is sufficient for v1 monitoring |
| maxDuration = 10 (Hobby default) | maxDuration = 300 (Hobby + Fluid Compute) | 2025 | Existing `maxDuration = 30` is a reasonable safety cap, not the platform limit |

**Deprecated/outdated in CONTEXT.md:**
- D-07 ("10-second Hobby tier timeout"): The default is now 300s with Fluid Compute. Streaming is no longer the only way to stay alive. Confidence: HIGH — verified via [Vercel Hobby plan docs](https://vercel.com/docs/plans/hobby) and [Fluid Compute docs](https://vercel.com/docs/fluid-compute).
- D-08 (Edge Runtime required for `/api/menu/extract`): Not required for timeout purposes. Still safe to implement if the user wants it. Risk: 1MB code size limit on Hobby, and the route is not streaming (blocking call must complete in 25s). Confidence: HIGH.

---

## Open Questions

1. **Will `/api/menu/extract` on Edge Runtime exceed the 1MB bundle size limit?**
   - What we know: Edge Runtime on Hobby has a 1MB (gzip) code size limit; `@anthropic-ai/sdk@0.80.0` is a sizable package
   - What's unclear: Exact gzip size of the bundled function with the SDK
   - Recommendation: Run `next build` and check build output before committing to Edge Runtime. The planner should make the Node.js runtime the safe default and treat Edge Runtime as the optional D-08 implementation.

2. **Does the non-streaming `/api/menu/extract` route handle the 25s Edge Runtime first-byte deadline for complex menus?**
   - What we know: The route calls Claude Vision with `max_tokens: 4096` and waits for the full response before returning JSON. Complex multi-page menus with Claude may take 20-35s.
   - What's unclear: Real-world latency for claude-sonnet-4-6 Vision calls in production
   - Recommendation: Planner should note this risk. If Edge Runtime is kept (D-08), either accept the risk for v1 or convert the route to streaming with JSON accumulation.

3. **Hobby plan log retention (1 hour) vs D-03 usage tracking goal**
   - What we know: Vercel Hobby retains logs for 1 hour, 4000 rows max
   - What's unclear: Whether this is sufficient for the owner to monitor spend
   - Recommendation: Console.log is sufficient for v1. The planner should document the limitation so the owner is aware. Log drain to an external service is a v2 improvement.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build / runtime | ✓ | v24.14.0 | — |
| npm | Package management | ✓ | 11.9.0 | — |
| Vercel CLI | CLI-based deploy/link | ✗ | — | Dashboard deploy (browser) |
| GitHub remote | Auto-deploy trigger | Unknown | — | Manual CLI push |
| ANTHROPIC_API_KEY | /api/menu/extract, /api/chat | Not verified (local .env.local exists via .env.example) | — | Routes return 500 if missing |
| OPENAI_API_KEY | /api/tts | Not verified (local .env.local exists via .env.example) | — | Route returns 500 if missing |

**Missing dependencies with no fallback:**
- API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY) must be added in Vercel dashboard before first deploy. The routes already validate for them and return HTTP 500 if absent.

**Missing dependencies with fallback:**
- Vercel CLI is not installed globally — use the Vercel dashboard browser import instead (functionally equivalent for initial setup; CLI can be installed as needed).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | vitest.config.ts |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

This phase is an infrastructure/deployment phase. Most verification is manual (real deployment, real browser). Automated tests cover pre-deployment safety checks only.

| Behavior | Test Type | Automated Command | Notes |
|----------|-----------|-------------------|-------|
| API routes return 500 without env vars | Manual smoke (Vercel) | — | Verifiable only against actual deployment |
| Security headers present on all routes | Manual / curl | `curl -I https://[url]` | Check CSP and Permissions-Policy in response |
| TTS audio plays (blob: not blocked) | Manual browser | — | Requires production deployment |
| Web Speech API works (mic not blocked) | Manual browser | — | Requires HTTPS + Permissions-Policy |
| /api/menu/extract processes images | Manual smoke | — | Requires Anthropic key in production |
| /api/chat streams responses | Manual smoke | — | Requires Anthropic key in production |
| Usage logs appear in Vercel dashboard | Manual (Vercel Runtime Logs) | — | Check logs after API calls |
| Existing unit tests still pass | Automated | `npm test` | Run before deploying to catch regressions |

### Sampling Rate
- **Pre-deploy gate:** `npm test` must be green before first push to Vercel-connected branch
- **Post-deploy smoke:** Manual verification against production URL for all 5 user flows
- **Phase gate:** All manual smoke tests pass on production URL before `/gsd:verify-work`

### Wave 0 Gaps
None for automated tests — existing test suite covers all previously implemented functionality. This phase adds no new business logic requiring new test files. All new behavior (CSP headers, Edge Runtime config, usage logging) is infrastructure-level and verified manually against the live deployment.

---

## Project Constraints (from CLAUDE.md)

| Directive | Constraint |
|-----------|-----------|
| TTS MUST use `<audio>` element | CSP `media-src 'self' blob:` is required — blob: URLs must be allowed |
| Voice loop: strict state machine | No deployment changes affect this |
| Photo capture: `<input type=file capture=environment>` | Camera API requires `camera=*` in Permissions-Policy |
| All menu photos in single Claude Vision call | The 4.5MB body limit is relevant; client-side resize mitigates it |
| Full menu JSON in system prompt | No deployment concern; happens at runtime |
| Streaming + sentence buffering | Streaming routes must keep connection alive; Fluid Compute handles this |
| Allergy info MUST include safety disclaimer | No deployment concern; happens in chat-prompt.ts |

---

## Sources

### Primary (HIGH confidence)
- [Vercel Fluid Compute docs](https://vercel.com/docs/fluid-compute) — default since Apr 23, 2025; Hobby 300s limit
- [Vercel Hobby Plan docs](https://vercel.com/docs/plans/hobby) — confirmed "10s default, configurable up to 60s" WITHOUT Fluid Compute; 300s with Fluid Compute
- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations) — 4.5MB body limit, 1MB Edge bundle (Hobby), memory limits
- [Vercel Edge Runtime docs](https://vercel.com/docs/functions/runtimes/edge) — 25s first-byte, 300s streaming, 1MB code limit, supported APIs
- [Vercel Function Duration config](https://vercel.com/docs/functions/configuring-functions/duration) — maxDuration precedence over Fluid defaults
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables) — setup, scoping, 5KB edge limit
- [Vercel Runtime Logs](https://vercel.com/docs/logs/runtime) — 1hr retention on Hobby, 4000 row limit
- [Vercel FUNCTION_PAYLOAD_TOO_LARGE](https://vercel.com/docs/errors/FUNCTION_PAYLOAD_TOO_LARGE) — 4.5MB hard limit documentation

### Secondary (MEDIUM confidence)
- [GitHub: anthropics/anthropic-sdk-typescript issue #292 (closed)](https://github.com/anthropics/anthropic-sdk-typescript/issues/292) — SDK streaming fix for Edge environments, merged and resolved
- [GitHub: anthropics/anthropic-sdk-typescript issue #380 (closed)](https://github.com/anthropics/anthropic-sdk-typescript/issues/380) — bedrock-sdk edge compatibility (resolved v0.23.0); general SDK edge support confirmed
- [Vercel Fluid Compute changelog](https://vercel.com/changelog/higher-defaults-and-limits-for-vercel-functions-running-fluid-compute) — 300s limits announced
- Verified SDK versions from project node_modules: `@anthropic-ai/sdk@0.80.0`, `openai@6.33.0`

### Tertiary (LOW confidence — use for context only)
- Various community discussions on Vercel timeout behavior (pre-Fluid Compute era) — outdated; superseded by official docs above

---

## Metadata

**Confidence breakdown:**
- Timeout/Fluid Compute behavior: HIGH — directly verified from official Vercel docs (April 2025 changelog)
- Edge Runtime compatibility for @anthropic-ai/sdk: HIGH — SDK v0.80.0 installed; issues confirmed closed and resolved
- CSP directives for blob: audio and microphone: HIGH — verified from MDN and Next.js docs
- Usage tracking approach: HIGH — console.log + Vercel Runtime Logs is the standard approach for Hobby
- 4.5MB body limit risk: MEDIUM — confirmed limit, mitigated by existing client-side resize (not measured to confirm stays under limit)
- Edge Runtime bundle size for @anthropic-ai/sdk: LOW — not measured; requires `next build` to verify

**Research date:** 2026-04-05
**Valid until:** 2026-07-05 (Vercel platform specs are stable; Fluid Compute defaults are recent but unlikely to change)
