# MenuVoice — Vercel Production Deployment Guide

This is a step-by-step guide for deploying the MenuVoice app to Vercel. Follow every step in order.

---

## Phase 1: Push Code to GitHub

The local repo has no remote yet. We need to create a GitHub repo and push.

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Fill in:
   - **Repository name:** `menu-voice`
   - **Description:** `Voice-first menu accessibility app for blind and visually impaired diners`
   - **Visibility:** Public (or Private — either works with Vercel)
   - Do NOT initialize with README, .gitignore, or license (the local repo already has content)
3. Click **Create repository**

### Step 2: Push Local Code to GitHub

Open a terminal in the project directory (`C:\Users\2fire\All Coding\menu voice`) and run these commands one at a time:

```
git remote add origin https://github.com/2firemaster/menu-voice.git
```

```
git branch -M main
```

```
git push -u origin main
```

If prompted for credentials, use a GitHub Personal Access Token (PAT):
- Go to https://github.com/settings/tokens
- Click **Generate new token (classic)**
- Select scopes: `repo` (full control)
- Copy the token and use it as the password when prompted

### Step 3: Verify Push Succeeded

Go to https://github.com/2firemaster/menu-voice and confirm the code is there. You should see files like `next.config.ts`, `src/`, `package.json`, etc.

---

## Phase 2: Deploy to Vercel

### Step 4: Import Project in Vercel

1. Go to https://vercel.com/new
2. If not logged in, log in with the GitHub account (`2firemaster`)
3. Under **Import Git Repository**, find `menu-voice` in the list
   - If it doesn't appear, click **Adjust GitHub App Permissions** and grant access to the `menu-voice` repo
4. Click **Import** next to `menu-voice`

### Step 5: Configure Project Settings

On the project configuration page:

1. **Framework Preset** should auto-detect as **Next.js** — if not, select it manually
2. **Root Directory:** Leave as `.` (default)
3. **Build Command:** Leave as default (`next build`)
4. **Output Directory:** Leave as default
5. **Node.js Version:** Leave as default (18.x or 20.x — both work)

### Step 6: Add Environment Variables (CRITICAL — Do This BEFORE Deploying)

On the same configuration page, scroll down to **Environment Variables** section.

Add these two variables:

**Variable 1:**
- **Name:** `ANTHROPIC_API_KEY`
- **Value:** (paste the Anthropic API key)
- **Environment:** Select **Production**, **Preview**, and **Development** (all three)
- Source for the key: https://console.anthropic.com/settings/keys

**Variable 2:**
- **Name:** `OPENAI_API_KEY`
- **Value:** (paste the OpenAI API key)
- **Environment:** Select **Production**, **Preview**, and **Development** (all three)
- Source for the key: https://platform.openai.com/api-keys

### Step 7: Deploy

1. Click the **Deploy** button
2. Wait for the build to complete (typically 1-2 minutes)
3. The build log should show:
   - `Creating an optimized production build...`
   - Route listing showing `/api/chat`, `/api/menu/extract`, `/api/tts`
   - `Build completed successfully`
4. After deploy succeeds, note the production URL: `https://menu-voice.vercel.app` (or similar — Vercel may add a suffix if `menu-voice` is taken)

### If Build Fails

- Check the build log for errors
- Most common issue: missing environment variables — go to **Settings → Environment Variables** and verify both keys are set
- If Edge Runtime bundle size error appears for `/api/menu/extract`: this is a known risk; report it back

---

## Phase 3: Smoke Test the Live Deployment

Open the production URL in a browser (preferably Chrome on mobile for full camera/mic testing).

### Test 1: Page Loads
- Navigate to the production URL (e.g., `https://menu-voice.vercel.app`)
- **Pass if:** Home page renders with the "Scan Your Menu" button visible
- **Fail if:** Blank page, error, or CSP errors in browser console (open DevTools → Console)

### Test 2: Security Headers Present
- Open Chrome DevTools (F12) → Network tab → Reload the page
- Click on the main document request (first one, the HTML page)
- Click **Headers** tab, scroll to **Response Headers**
- **Pass if ALL of these headers are present:**
  - `Content-Security-Policy` — should contain `media-src 'self' blob:`
  - `Permissions-Policy` — should contain `microphone=*, camera=*`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Fail if:** Any of the 5 headers are missing

### Test 3: Menu Photo Capture
- Tap/click **Scan Your Menu**
- Take a photo of any restaurant menu (or a photo of a menu on screen)
- Wait for processing (may take 5-15 seconds)
- **Pass if:** Menu items appear as a summary after processing
- **Fail if:** Error message, timeout, or blank response

### Test 4: Voice Conversation
- After a menu is loaded, the voice interface should auto-start
- Speak a question like "What's good for someone who doesn't eat gluten?"
- Wait for the response
- **Pass if:** You hear a spoken TTS response (audio plays through speakers)
- **Fail if:** No audio, microphone not working, or CSP blocks audio playback

### Test 5: Usage Logs in Vercel Dashboard
- Go to the Vercel Dashboard for the project
- Click the **Logs** tab (or **Runtime Logs**)
- After running Tests 3-4, check for JSON log entries
- **Pass if:** Log entries appear with fields like `event`, `ip`, `timestamp`
  - Example: `{"event":"menu_extract","ip":"...","imageCount":1,"timestamp":"..."}`
- **Fail if:** No log entries appear after using the app

### Test 6: Settings Page
- Navigate to the production URL + `/settings` (e.g., `https://menu-voice.vercel.app/settings`)
- **Pass if:** Settings page loads, you can add and remove allergies/preferences
- **Fail if:** 404, blank page, or settings don't save

---

## Phase 4: Report Results

After completing all tests, report back with:

1. **Production URL** (the `*.vercel.app` address)
2. **Test results** — which of the 6 tests passed or failed
3. **Any errors** seen in browser console or Vercel build/runtime logs
4. **Screenshots** of any failures (optional but helpful)

### Expected Outcome

All 6 tests should pass. The app should be fully functional at the public URL with:
- Menu scanning via camera
- AI-powered voice conversation about menu items
- Text-to-speech audio responses
- Allergy/preference settings
- Security headers protecting the app
- Usage logging for monitoring

---

## API Key Locations (Quick Reference)

| Key | Where to get it |
|-----|----------------|
| ANTHROPIC_API_KEY | https://console.anthropic.com/settings/keys |
| OPENAI_API_KEY | https://platform.openai.com/api-keys |

## Vercel Dashboard Locations (Quick Reference)

| Action | Where |
|--------|-------|
| New project | https://vercel.com/new |
| Project settings | Vercel Dashboard → Select project → Settings |
| Environment variables | Settings → Environment Variables |
| Runtime logs | Vercel Dashboard → Select project → Logs |
| Deployments | Vercel Dashboard → Select project → Deployments |
