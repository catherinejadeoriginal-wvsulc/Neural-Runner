# AGENTS.md

## What lives here
This repository is built and maintained with the help of AI coding agents.

## Models in use
- Gemini (cloud) — used for content generation, brainstorming.
- Gemma 4 2B via Ollama or LM Studio (local) — used for offline work and code review.

## Responsible AI rules
- Every model output is reviewed by a human before it is merged.
- No personal data, credentials, or proprietary code is sent to a public model.
- AI assistance is disclosed in PR descriptions and in the README footer.
- Known limitations: small local models may hallucinate citations; we verify every citation against the source PDF.
- High-risk changes (auth, payments, student records) require a second human reviewer.

## Escalation
If a model produces something that looks wrong, stop and ask a human.

---

## 🤖 Developer Agent Onboarding Guide

This section is dedicated to coding agents onboarding to the Neural-Runner project. It outlines the codebase structure, tech stack, core systems, styling guidelines, and dev workflows to facilitate rapid, bug-free implementations.

### 🛠️ Tech Stack Spec
- **Frontend Core:** React 19, TypeScript, and Vite.
- **Styling System:** Tailwind CSS v4 using the modern `@theme` directive in CSS.
- **Telemetry & Machine Learning:** TensorFlow.js and the Teachable Machine Image SDK, loaded dynamically via CDN links.
- **Icons & Animation:** [lucide-react](file:///d:/original/Neural-Runner/package.json#L17) and Framer Motion (`motion`).

---

### 📂 Directory Layout

Here is an architectural map of where everything lives in the workspace:

- [`package.json`](file:///d:/original/Neural-Runner/package.json) — Dependencies, metadata, and script directives.
- [`vite.config.ts`](file:///d:/original/Neural-Runner/vite.config.ts) — Vite builder configuration (configured with custom HMR settings).
- [`index.html`](file:///d:/original/Neural-Runner/index.html) — HTML template shell.
- [`src/`](file:///d:/original/Neural-Runner/src) — Application source code:
  - [`main.tsx`](file:///d:/original/Neural-Runner/src/main.tsx) — Main entrypoint.
  - [`App.tsx`](file:///d:/original/Neural-Runner/src/App.tsx) — Root application orchestrator. Coordinates score tracker state, mute states, and controller mode toggling.
  - [`types.ts`](file:///d:/original/Neural-Runner/src/types.ts) — Global TypeScript interfaces and custom types for obstacles, actions, and machine learning mappings.
  - [`index.css`](file:///d:/original/Neural-Runner/src/index.css) — Stylesheet importing Tailwind CSS v4, containing custom color tokens and retro arcade utilities (CRT scanline effects, text-glows, pixel border shadows).
  - [`components/`](file:///d:/original/Neural-Runner/src/components) — Reusable React components:
    - [`GameCanvas.tsx`](file:///d:/original/Neural-Runner/src/components/GameCanvas.tsx) — HTML5 Canvas platformer engine. Coordinates game physics, collision checks, dynamic obstacle creation, and retro score tracking.
    - [`MappingPanel.tsx`](file:///d:/original/Neural-Runner/src/components/MappingPanel.tsx) — Calibration deck. Houses webcam feed canvas, TensorFlow loader forms, gesture mappings, and confidence simulator controls.
  - [`hooks/`](file:///d:/original/Neural-Runner/src/hooks) — Custom React hooks:
    - [`useTeachableMachine.ts`](file:///d:/original/Neural-Runner/src/hooks/useTeachableMachine.ts) — Manages dynamic imports of TensorFlow and Teachable Machine libraries from CDN, media stream devices, and prediction loop operations.
  - [`utils/`](file:///d:/original/Neural-Runner/src/utils) — Helper functions and tools:
    - [`audio.ts`](file:///d:/original/Neural-Runner/src/utils/audio.ts) — High-fidelity sound effects synthesizer built with Web Audio API (creates custom sawtooth, square, and triangle oscillators dynamically).
- [`TASKS.md`](file:///d:/original/Neural-Runner/TASKS.md) — Current sprint roadmap and user stories.
- [`PROMPTS.md`](file:///d:/original/Neural-Runner/PROMPTS.md) — Historical log of prompt instructions and intent ratings.
- [`DESIGN.md`](file:///d:/original/Neural-Runner/DESIGN.md) — Architectural goals and UX blueprints.

---

### ⚙️ Developer Workflow

Always run these standard shell processes within the project root directory during development:

1. **Launch Local Server:**
   ```powershell
   npm run dev
   ```
   Runs the development server locally on port `3000` (binding to `0.0.0.0`).
2. **Type Checking & Verification:**
   ```powershell
   npm run lint
   ```
   Fires TypeScript compiler check without writing output files (`tsc --noEmit`). Ensure this runs cleanly without errors before declaring tasks complete.
3. **Build Bundle Validation:**
   ```powershell
   npm run build
   ```
   Compiles codebase into the production distribution bundle (`dist/`).
4. **HMR and Editor Performance:**
   Note that Hot Module Replacement is controlled by the `DISABLE_HMR` environment variable inside [`vite.config.ts`](file:///d:/original/Neural-Runner/vite.config.ts). When building or code-editing inside resource-constrained sandboxes, disabling file watchers optimizes CPU utilization.

---

### 🕹️ Core Subsystem Architecture

#### 1. Teachable Machine Integration
The model loader and camera stream telemetry live inside [`useTeachableMachine.ts`](file:///d:/original/Neural-Runner/src/hooks/useTeachableMachine.ts). It performs:
- **CDN Loading:** Scripts are injected dynamically upon request to keep local bundle sizes light.
- **Prediction Loop:** Utilizes `requestAnimationFrame` to sample frames from a hidden HTML `<video>` element, feeding them to the loaded model.
- **Probability Filter:** Matches confidence thresholds with active class settings to toggle either `JUMP`, `CROUCH`, or `NONE` active actions.
- **Simulator Mode:** Fallback mode mapping fake probability sliders to target outputs.

#### 2. Game Rendering Engine
The canvas-based runner game lives in [`GameCanvas.tsx`](file:///d:/original/Neural-Runner/src/components/GameCanvas.tsx):
- Coordinates the standard running dino physics loop (velocity, gravity, terminal speed limits).
- Checks bounding-box collision parameters between the runner object and obstacles (cacti, pterodactyls, rocks).
- Triggers particle systems when milestone triggers occur or standard collisions happen.

#### 3. Sound Synthesis
Sound plays procedurally using the browser Web Audio API in [`audio.ts`](file:///d:/original/Neural-Runner/src/utils/audio.ts):
- Bypasses traditional audio permissions by lazy-initializing the `AudioContext` only after the user triggers a click event (e.g., toggling the sound dashboard controls).
- Uses customized synthesizer methods to form authentic 8-bit sound effects (e.g., sweeping oscillator frequencies).

---

### 🎨 Coding & Design Standards

Coding agents must strictly adhere to the following conventions:

1. **Cyberpunk Design System & Aesthetics**
   - Retain the retro green-glow cyberpunk aesthetic.
   - Use Tailwind utility classes corresponding to themes declared in [`index.css`](file:///d:/original/Neural-Runner/src/index.css) (e.g. `bg-cyber-bg`, `text-cyber-green`, `bg-cyber-panel`, `shadow-cyber`, `text-glow`).
2. **Strict TypeScript Annotations**
   - Avoid using `any` type overrides where possible.
   - Define all custom game attributes, obstacle structures, or telemetry models in [`types.ts`](file:///d:/original/Neural-Runner/src/types.ts).
3. **Audio-Play Compatibility**
   - Never start sound effects automatically on initialization. Always trigger synthesizer functions using lazy-loaded methods hooked onto user inputs.
4. **Memory Leak Prevention**
   - Ensure all `requestAnimationFrame` references and media stream tracks are fully disposed of during component unmount cycles.
