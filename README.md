# Via

**Visual AI guidance for any web app, with zero install.**

Live at **[usevia.tech](https://usevia.tech)**.

You tell Via what you're trying to do. You share your screen. A small Picture-in-Picture window floats above everything else and points to the next thing to click — in real time, on any website, from your bank's admin panel to AWS IAM. No browser extension, no DOM injection, no integration work.

---

## How it works

1. **You state a goal** in plain English ("Find and download a computer vision paper on arXiv").
2. **You share your screen** via the browser's native screen-share prompt.
3. **Via watches and points.** A floating window stays on top of your other windows, with a glowing dot on the next element to click and a one-line instruction underneath. When you act, it advances. Ask it questions inline if you get stuck.

Under the hood, every meaningful frame change is sent to **Google Gemini** with your goal and what you've already done. Gemini returns the next step plus a bounding box; a second pass refines the click point inside a zoomed crop. The PiP window is a real DOM React tree (via the [Document Picture-in-Picture API](https://developer.chrome.com/docs/web-platform/document-picture-in-picture)), not a canvas hack — so the overlay renders sharp text, animations, and even an embedded chat.

## Why screen sharing

The screen-share + PiP architecture was a deliberate choice to drive friction to zero. There is nothing to download — no browser extension to install and approve, no native app, no SDK to bolt into a product. You open a URL, share a tab, and you're guided. The trade-off is that Via reads pixels rather than the DOM, which is exactly why it works on sites we have no integration with — banking portals, internal admin tools, anything behind SSO.

## Privacy

Frames are sent to a server-side Gemini proxy for analysis — they are not stored. Per-step keyframes (small JPEG thumbnails) and the generated instructions are written to a Supabase `guidance_events` table, scoped to your account, and used to improve the product. Nothing is shared with third parties beyond Google (for the model call) and Supabase (for storage).

If you'd rather not send screen content anywhere, this app isn't for you — the entire premise depends on a vision model.

## Tech stack

- **[Next.js 14](https://nextjs.org/)** (App Router, standalone output)
- **[Tailwind CSS](https://tailwindcss.com/)**
- **[Google Gemini](https://ai.google.dev/)** (`gemini-3.1-flash-lite-preview`) for vision, refinement, clarification, research, and chat
- **[Supabase](https://supabase.com/)** for auth (email + Google OAuth) and Postgres analytics
- **Document Picture-in-Picture API** + `getDisplayMedia` (Chromium 116+ required)
- **[Zustand](https://zustand.docs.pmnd.rs/)** for the lightweight cross-component state

## Browser support

Via depends on the **Document Picture-in-Picture API**, which currently means Chrome, Edge, Brave, Arc, Opera, and other Chromium-based browsers (version 116+). Safari and Firefox aren't supported yet. There's no mobile experience — touch devices show a "come back on a laptop" page.

## Local development

Requires Node 18+ and a Chromium browser.

```bash
git clone https://github.com/TheBochok/companion-protocol.git
cd companion-protocol
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

Open http://localhost:3000.

### Required env vars

| Variable | Where to get it |
|---|---|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings → API (server-only; never expose) |
| `NEXT_PUBLIC_SITE_URL` | The origin used for OAuth redirects, e.g. `http://localhost:3000` in dev |

The Supabase project needs three tables: `guidance_events`, `session_feedback`, and `general_feedback`. The exact schemas aren't pinned in the repo yet — check the inserts in `app/api/analytics/route.ts` and `app/api/feedback/route.ts` for the column shapes.

### Scripts

```bash
npm run dev     # Start the dev server
npm run build   # Production build (output: 'standalone')
npm run lint    # ESLint
npm start       # Serve the standalone build (reads $PORT)
```

## Project layout

```
app/
  (marketing)/      # Landing, login, signup, OAuth callback
  (companion)/app/  # The actual product (auth-gated)
  api/              # Gemini + Supabase proxies
components/
  CompanionApp.tsx  # Top-level orchestrator
  PiPOverlay.tsx    # Rendered into the Document PiP window
  landing/          # Marketing site sections
hooks/
  useScreenShare.ts # getDisplayMedia + lifecycle
  usePiP.ts         # Document PiP (with canvas-PiP fallback)
  useVision.ts      # The frame loop, debouncing, and Gemini calls
lib/supabase/       # Browser & SSR auth clients
middleware.ts       # Session refresh + app.usevia.tech subdomain rewrite
```

## License

MIT — see `LICENSE`.
