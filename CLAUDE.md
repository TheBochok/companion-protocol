# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Dev server at http://localhost:3000
npm run build     # Production build (uses `output: 'standalone'`)
npm run lint      # ESLint via next lint
npm start         # Serve standalone build; reads $PORT
```

There is no test suite. Required env vars: `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (used by the OAuth callback).

Note: this is Next.js 14 — config must be `next.config.mjs` (not `.ts`).

## High-Level Architecture

**Via** is a browser-native visual AI guide. The user states a goal in natural language, shares their screen, and the app overlays step-by-step pointers in a Picture-in-Picture window. There is no "workflow config" anymore — guidance is generated on the fly by Gemini from the live screen + the user's goal. The `lib/workflow.ts` / `store/workflowStore.ts` files are legacy and unused.

### Request flow on each captured frame

1. `useScreenShare` calls `getDisplayMedia` and exposes a `MediaStream`.
2. `useVision` (the orchestrator — most logic lives here) attaches the stream to a hidden `<video>`, runs a 150ms diff loop against a tiny 64×36 canvas, and only fires a real OCR call when pixels change beyond `CHANGE_THRESHOLD` or the 2s heartbeat elapses.
3. On a change, it draws the frame to `analysisCanvas` (capped at 1920×1080), sends JPEG base64 to `/api/vision` along with: goal, prior `currentInstruction`, completed-step `history`, optional one-shot `userContext` (from chat), and a Gemini-managed `memory` string.
4. `/api/vision` calls Gemini (`gemini-3.1-flash-lite-preview`, `thinkingBudget: 0`) with the previous + current screenshots and a long prompt that constrains it to return `{ instruction, bbox: [ymin, xmin, ymax, xmax] in 0–1000, memory }`.
5. If a bbox is returned, `useVision` immediately sets the coarse `target` in `coordinateStore` for responsive UI, then fires `/api/refine` with a padded crop of the same frame to get a more precise click center (`cx`, `cy`), and updates the target.
6. `PiPOverlay` (rendered into the Document PiP window via `ReactDOM.createRoot`) reads `target` from the store and draws a glowing dot + ping ring + zoom animation, with the instruction in a floating glass pill.

### Critical behaviors that are not obvious from a single file

- **Generation counter for cancellation.** `useVision` keeps `generationRef`. `forceInstruction` (called from chat replies) increments it; any in-flight Gemini response whose `myGeneration` no longer matches is silently discarded. This is how chat overrides race with vision without flicker.
- **Two-confirmation debouncing.** `SWITCH_CONFIRM = 2` and `COMPLETIONS_REQUIRED = 2`: the model must agree on a new instruction (or on "Goal complete") for two consecutive frames before the UI switches. Single-frame oscillations are absorbed.
- **AbortController on big diffs.** If a major scene change (`BIG_CHANGE_THRESHOLD = 0.08`) happens while a request is in flight, the in-flight request is aborted and a new one fires immediately.
- **Pre-flight research.** When a stream first attaches with a goal, `useVision` fires `/api/research` (Gemini + Google Search grounding) once and stores the result in `memoryRef`, which gets injected into every subsequent vision call as background context.
- **Tab/scroll instructions skip bbox.** If the instruction matches `/switch.{0,20}tab/i` or `/scroll|swipe/i`, the target is cleared and the overlay shows a swipe animation instead of a dot.

### PiP architecture

- Primary path: **Document Picture-in-Picture** (Chrome 116+, `window.documentPictureInPicture.requestWindow`). All main-document stylesheets are cloned into the PiP window, plus a `CRITICAL_CSS` block of keyframes (`pip-ping`, `pip-slide-up`, `pip-pulse`, `pip-swipe-up/down`, `pip-think`). A React root is mounted into a div in the PiP `body`. Because both windows share the JS context, the same Zustand store and React state work seamlessly — `CompanionApp` calls `updatePiP(props)` from a `useEffect` whenever inputs change.
- Fallback: **Canvas PiP** (`canvas.captureStream(30) → <video>.requestPictureInPicture()`), used when Document PiP isn't available. In this mode `outputCanvas` is drawn by a RAF loop in `CompanionApp` using helpers in `lib/drawCanvas.ts`.
- Both `getDisplayMedia()` and `requestWindow()` need user activation; `handleStartGuide` chains them in a single click handler so the screen-share grant carries activation through to the PiP call.

### Auth & routing

- Route groups: `app/(marketing)` (landing, login, signup, OAuth callback) and `app/(companion)` (the actual app at `/app`).
- `middleware.ts` does two things:
  1. Rewrites the `app.usevia.tech` subdomain to `/app/*` internally (no browser redirect).
  2. Refreshes the Supabase session cookie and gates `/app/**` (redirect to `/login`) and `/login`/`/signup` (redirect to `/app` if already signed in).
- `app/(companion)/layout.tsx` re-checks auth server-side as defense in depth.
- `lib/supabase/client.ts` (browser, `createBrowserClient`) and `lib/supabase/server.ts` (SSR with `next/headers` cookies) are the two factories. API routes that write to Postgres use a **third** client built from `SUPABASE_SERVICE_ROLE_KEY` directly (`@supabase/supabase-js`) because the analytics/feedback tables have all Data API access revoked — only the service role can reach them.

### API routes (all server-side Gemini proxies + Supabase writers)

| Route | Purpose |
|---|---|
| `POST /api/vision` | Per-frame guidance — returns `{instruction, bbox, memory}`. Most prompt-engineering lives here. |
| `POST /api/refine` | Zoom-refine the click center inside the bbox crop. |
| `POST /api/chat` | User asks Via a question; returns `{reply, instruction}`. The instruction is force-applied via `forceInstruction`. |
| `POST /api/clarify` | Pre-flight: decide if the goal is specific enough or ask one question. Defaults to `ready: true` on any failure. |
| `POST /api/research` | One-shot background briefing on the goal (Gemini + Google Search grounding). |
| `POST /api/feedback` | Free-form user feedback → `general_feedback` table. |
| `POST/PATCH/PUT /api/analytics` | Insert/update `guidance_events` (per-instruction with screenshot keyframe + `acted` flag) and `session_feedback` (👍/👎 + reason). |

### State stores

- `useCoordinateStore` — single `target: {x, y, width, height} | null` in normalized 0–1 coords. The only cross-component channel for the bbox.
- `useWorkflowStore` — **legacy, unused at runtime.** Kept around with `lib/workflow.ts` and `components/WorkflowEditor.tsx` from the original trigger-based design.

### UI states in `CompanionApp`

Three phases: `idle` (goal entry, with mode toggle for "Find a Guide" vs "Create Guides" lead capture) → `clarifying` (chat with `/api/clarify`, max 2 AI turns before forcing ready) → `active` (PiP open, live chat panel mirrored between the in-page card and the PiP overlay via `liveChatMessages` + `onChat`). Plus a mobile fallback (no `getDisplayMedia` on touch devices) with email reminder capture.
