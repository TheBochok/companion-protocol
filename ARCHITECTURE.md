# Companion Protocol - Technical Architecture

## Overview

This project implements a "Remote Assistant" that guides users through workflows on third-party sites without extensions.

**Mechanism:**
1.  User visits our site (`companion.yurik.ai`).
2.  User shares their screen (via `getDisplayMedia`).
3.  We process the stream locally (low FPS snapshots).
4.  We overlay instructions on a floating **Picture-in-Picture (PiP)** window.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **State:** Zustand (Workflow state machine)
- **Vision:** Tesseract.js (OCR) + HTML5 Canvas API

---

## Implementation Phases

### Phase 1: The Engine (Stream & PiP)

**Goal:** Verify the PiP window pops out and updates with static content.

**Key Components:**
- `useScreenShare`: Handles `navigator.mediaDevices.getDisplayMedia`.
- `outputCanvas`: The "Display" canvas (400x150px).
- `usePiP`: Manages the Picture-in-Picture window (`video.requestPictureInPicture()`).
- **Debug UI:** "Start Sharing", "Toggle Companion Mode", live canvas preview.

### Phase 2: The Vision System (The "Eye")

**Goal:** Read text from the user's screen.

**Key Components:**
- `analysisCanvas`: Hidden canvas for snapshots.
- `useVision`:
    - Loops every ~1000ms.
    - Draws current frame to `analysisCanvas`.
    - Runs `Tesseract.recognize()` to extract text.
    - Returns normalized text string.

### Phase 3: The Brain (Workflow State Machine)

**Goal:** Connect vision to display logic.

**Key Components:**
- `workflow` Config: JSON array of steps (`trigger`, `instruction`).
- `useGuide` Hook:
    - Subscribes to `foundText` from Vision.
    - Matches trigger keywords.
    - Updates `currentInstruction`.
- **Rendering Loop:** Updates `outputCanvas` with the new instruction text.

### Phase 4: Polish & UX

**Goal:** Production-ready UI and stability.

**Key Components:**
- **Canvas Styling:** "Native notification" look (progress bar, readable font).
- **Edge Cases:** "Connection Lost" screen, "Scanning..." loader.
- **Deployment:** Standalone output config.

---

## AI Prompts for Development

Use these prompts with an AI editor (Cursor/Windsurf) to build the core components.

### Prompt 1: The Engine

> **Role:** Senior Frontend Architect.
> **Task:** Build the core "Mirror Engine" that handles screen capture and Picture-in-Picture rendering.
>
> **Requirements:**
> 1.  Create a `useScreenShare` hook that requests `navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })`. Handle permissions and error states.
> 2.  Create a hidden `<canvas ref="outputCanvas" />` (size: 400x150px). This will be our "Display" for the user.
> 3.  Create a `usePiP` hook that:
>     - Takes the `outputCanvas` stream (`canvas.captureStream(30)`).
>     - Assigns it to a hidden `<video>` element.
>     - Exposes a `togglePiP()` function that calls `video.requestPictureInPicture()`.
> 4.  Build a debug UI:
>     - A "Start Sharing" button.
>     - A "Toggle Companion Mode" (PiP) button.
>     - Show the *live canvas content* on the page so I can see what is being sent to PiP.
>
> **Constraint:** Do NOT implement OCR yet. Just ensure we can draw text (e.g., "Hello World - [Timestamp]") to the canvas and see it update live in the floating PiP window.

### Prompt 2: The Vision System

> **Role:** Computer Vision Engineer.
> **Task:** Implement the "Vision Loop" that reads the user's screen.
>
> **Requirements:**
> 1.  Take the `MediaStream` from `useScreenShare`.
> 2.  Create a second hidden `<canvas ref="analysisCanvas" />` to capture snapshots.
> 3.  Implement a `useVision` hook that:
>     - Runs a loop every **1000ms** (1s).
>     - Draws the current video frame to `analysisCanvas`.
>     - Runs `Tesseract.recognize()` to extract text.
>     - Returns the `foundText` string (normalized to lowercase).
> 4.  **Optimization:** Do not run OCR if the stream is inactive. Use the 'fast' Tesseract mode if available.
> 5.  Update the UI to show a live log: "👀 Seeing: [Last detected text...]".

### Prompt 3: The Brain

> **Role:** Systems Architect.
> **Task:** Connect the Vision System to the Display System using a State Machine.
>
> **Requirements:**
> 1.  Create a `workflow` config object (mock data):
>     ```json
>     [
>       { "step": 1, "trigger": "settings", "instruction": "Click 'Settings' ⚙️ in the sidebar" },
>       { "step": 2, "trigger": "api keys", "instruction": "Select 'API Keys' tab" },
>       { "step": 3, "trigger": "secret", "instruction": "DONE! Copy your key." }
>     ]
>     ```
> 2.  Create a `useGuide` hook that:
>     - Subscribes to `foundText` from `useVision`.
>     - Checks if the current step's `trigger` keyword exists in `foundText`.
>     - If yes -> Advance to next step.
>     - Returns the `currentInstruction`.
> 3.  **The Rendering Loop:**
>     - Update the `outputCanvas` (Phase 1) to draw the `currentInstruction` text.
>     - Style it nicely: Black background, huge Yellow text, centered.
>
> **Goal:** I should be able to open a text file, type "settings", and see the PiP window automatically change to the next instruction.
