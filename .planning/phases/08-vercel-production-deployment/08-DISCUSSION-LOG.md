# Phase 8: Vercel Production Deployment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 08-vercel-production-deployment
**Areas discussed:** Access & cost control, Domain & URL, Streaming & timeouts, Security headers

---

## Access & Cost Control

### Q1: Who should be able to use the deployed app?

| Option | Description | Selected |
|--------|-------------|----------|
| Fully public (Recommended) | Anyone with the URL can use it. Add server-side rate limiting to prevent abuse. | |
| Password-gated | Simple shared password or invite code before accessing. | |
| Just me / demo only | Deploy for personal use or demos. | |

**User's choice:** Fully public
**Notes:** None

### Q2: How to handle API cost protection?

| Option | Description | Selected |
|--------|-------------|----------|
| IP-based rate limiting | Limit requests per IP. Simple, no auth needed. | |
| Daily usage cap | Set a global daily limit. Hard cost ceiling. | |
| No limits for now | Deploy without rate limiting. Monitor usage and add limits later. | |

**User's choice:** Other — "No limits but include tracking of how much is spent by who"
**Notes:** User wants usage tracking/monitoring rather than hard limits

### Q3: Vercel plan tier?

| Option | Description | Selected |
|--------|-------------|----------|
| Hobby (free) | 10s timeout, 100GB bandwidth. Fine for demos and light usage. | |
| Pro ($20/month) | 60s timeout, 1TB bandwidth, faster builds. | |
| Not sure yet | Plan for Hobby and note where Pro would be needed. | |

**User's choice:** Hobby (free)
**Notes:** None

---

## Domain & URL

### Q1: What URL should the app live at?

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel subdomain (Recommended) | Deploy to menu-voice.vercel.app. Free, instant, HTTPS. | |
| Custom domain | Connect your own domain. More professional. | |
| Both | Start with Vercel subdomain, add custom domain later. | |

**User's choice:** Both — start with subdomain, add custom domain later
**Notes:** None

---

## Streaming & Timeouts

### Q1: How to handle 10-second timeout on Hobby tier?

| Option | Description | Selected |
|--------|-------------|----------|
| Optimize for 10s limit (Recommended) | Streaming keeps connection alive. Verify and add timeout fallback. | |
| Use Edge Runtime | Convert API routes to Edge Runtime (no timeout). Limited Node.js API. | |
| Plan for Pro tier later | Deploy on Hobby, upgrade if timeouts become an issue. | |

**User's choice:** Optimize for 10s limit
**Notes:** None

### Q2: How to handle menu extraction route specifically?

| Option | Description | Selected |
|--------|-------------|----------|
| Edge Runtime for extraction | Move just /api/menu/extract to Edge Runtime. No timeout for streaming. | |
| Keep serverless, add chunking | Process images in smaller batches across multiple requests. | |
| Accept the risk | Most single-page menus process in under 10s. Document as limitation. | |

**User's choice:** Edge Runtime for extraction
**Notes:** None

---

## Security Headers

### Q1: How much security hardening for initial deployment?

| Option | Description | Selected |
|--------|-------------|----------|
| Essential only (Recommended) | HTTPS, secure env vars, basic CSP for blob: audio and mic. | |
| Full hardening | Strict CSP, X-Frame-Options, all security headers. | |
| Vercel defaults | Don't add custom security headers. | |

**User's choice:** Essential only
**Notes:** None

### Q2: API route request validation?

| Option | Description | Selected |
|--------|-------------|----------|
| Basic validation | Check Content-Type, validate request body shape, reject malformed. | |
| Origin checking | Only allow requests from own domain. | |
| Skip for now | API routes already validate input shape. | |

**User's choice:** Basic validation
**Notes:** None

---

## Claude's Discretion

- Exact CSP directive values
- Usage tracking implementation approach
- Vercel project naming
- Build optimization settings

## Deferred Ideas

None — discussion stayed within phase scope
