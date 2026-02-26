# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This project is in the **architectural/planning phase** — only documentation exists. The implementation follows the four phases defined in `ARCHITECTURE.md`. When building, start from Phase 1 and progress sequentially.

## Commands

Once the project is scaffolded (Next.js 14):

```bash
npm install       # Install dependencies
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Production build
npm run lint      # ESLint
```

## Architecture

The Companion Protocol is a browser-native workflow guidance tool. It works by:
1. Capturing the user's screen via `getDisplayMedia()`
2. Running OCR (Tesseract.js) on snapshots locally at ~1 FPS
3. Matching detected text against a `workflow` config (trigger/instruction pairs)
4. Displaying the current instruction in a floating Picture-in-Picture (PiP) window via `canvas.captureStream()` → `<video>.requestPictureInPicture()`

**All processing is local — no data leaves the browser.**

### Tech Stack

- **Next.js 14** (App Router)
- **Tailwind CSS**
- **Zustand** — workflow state machine
- **Tesseract.js** — OCR on captured frames
- **HTML5 Canvas API** — `outputCanvas` (400×150px display) and `analysisCanvas` (hidden, for snapshots)
- **Web APIs** — `MediaDevices.getDisplayMedia`, `HTMLVideoElement.requestPictureInPicture`, `HTMLCanvasElement.captureStream`

### Key Hooks (to be implemented)

| Hook | Responsibility |
|------|---------------|
| `useScreenShare` | Calls `getDisplayMedia`, manages stream lifecycle and permission errors |
| `usePiP` | Connects `outputCanvas.captureStream(30)` to a hidden `<video>`, exposes `togglePiP()` |
| `useVision` | 1000ms loop: draws frame → `analysisCanvas` → `Tesseract.recognize()` → returns normalized `foundText` |
| `useGuide` | Subscribes to `foundText`, advances workflow steps when trigger keyword is detected, returns `currentInstruction` |

### Workflow Config Shape

```json
[
  { "step": 1, "trigger": "settings", "instruction": "Click 'Settings' in the sidebar" },
  { "step": 2, "trigger": "api keys", "instruction": "Select 'API Keys' tab" }
]
```

### PiP Canvas Rendering

`outputCanvas` (400×150px) uses black background with large yellow centered text. The canvas stream feeds into a hidden `<video>` element that enters PiP mode — this is the only way to render custom content in a PiP window (browsers only allow video elements in PiP, not arbitrary DOM).

### Phase Build Order

1. **Phase 1 (Engine):** Screen capture + PiP with static "Hello World" canvas content
2. **Phase 2 (Vision):** Add OCR loop, show live detected text in debug UI
3. **Phase 3 (Brain):** Connect vision output to workflow state machine, render instructions to canvas
4. **Phase 4 (Polish):** "Connection Lost" / "Scanning..." states, production deployment config

Detailed AI prompts for building each phase are in `ARCHITECTURE.md`.
