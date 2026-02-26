# The Companion Protocol

A zero-install, browser-native guidance system for web workflows.

## Concept

Instead of injecting code into a foreign website (which requires a browser extension), the user streams that website to us. We process the video stream (at low FPS) to understand their context, and overlay instructions using a "floating" Picture-in-Picture window that stays on top of their screen.

## Key Features

- **Zero Install:** No browser extension required.
- **Privacy First:** All processing happens in the user's browser. No video is uploaded.
- **Universal:** Works on any website, even secure ones (banking, admin panels), because we analyze pixels, not DOM.

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/companion-protocol.git
    cd companion-protocol
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```

4.  **Open the app:**
    Visit `http://localhost:3000` (or your local URL).

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the detailed technical specification, AI prompts, and implementation phases.

## License

MIT
