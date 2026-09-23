# Skip & Wait - Chrome Extension (Manifest V3)

> **Automatically accelerates and skips artificial countdown timers, waiting pages, and video ad interruptions to streamline web browsing.**

---

## Features

- ⚡ **Stealth Timer Acceleration**: Overrides client-side `setTimeout` and `setInterval` APIs (by default 10x) without altering `Function.prototype.toString`, completely avoiding anti-adblock detection.
- 🎬 **Video Ad Fast-Forwarding**: Dynamically detects ad players and pre-rolls on YouTube and other HTML5 video players, sets playback to 16x speed, mutes audio, and instantly triggers the "Skip Ad" button.
- 🛡️ **Tab Visibility Anti-Pause Spoofing**: Overrides `document.hidden` and `document.visibilityState` to prevent forced-delay pages from freezing countdowns when switching tabs.
- 🔗 **Declarative Recipe Engine**: Built-in recipes for top link shorteners (ShrinkMe, Adf.ly clones, Ouo.io), file hosting free-tier delays (Rapidgator, DDownload, Katfile, MediaFire), and direct URL parameter unmasking.
- 👁️ **Universal Heuristic Skipper**: Lightweight MutationObserver scans for disabled countdown buttons ("Wait 10s...", "Download in 5s"), removes disabled states, and auto-clicks the button upon reaching 0s.
- 📊 **Real-Time Dashboard & Stats**: Sleek dark-mode React popup dashboard tracking seconds saved today, lifetime time saved, total links bypassed, domain whitelist toggle, and an instant "Force Skip" button.
- 🍞 **Non-Intrusive Glassmorphism Toast**: Discreet bottom-right pill notification displaying saved time (e.g. `⚡ Timer Accelerated (-10s)`).
- ↩️ **YouTube Redirect Blocker & Auto-Return**: Detects when ad-shorteners or download gates unexpectedly redirect to YouTube, and automatically returns to the previous page with infinite-loop suppression.

---

## Technical Architecture (Dual-World Execution)

Manifest V3 isolates standard content scripts from the page's global JavaScript scope. This extension utilizes Chrome 111+ dual-world architecture:

```
[Web Page DOM]
      │
      ├──► [world: "MAIN"] (entrypoints/main.content.ts)
      │     - Hooks window.setTimeout, setInterval, clearTimeout
      │     - Hooks HTMLMediaElement.prototype.play
      │     - Spoofs document.hidden & document.visibilityState
      │     - Communicates via postMessage protocol
      │
      └──► [world: "ISOLATED"] (entrypoints/isolated.content.ts)
            - Executes RecipeEngine & Heuristic MutationObserver
            - Mounts glassmorphism Toast notifications
            - Accesses browser.storage & browser.runtime APIs
            - Sends badge updates to Background Service Worker

[Background Service Worker] (entrypoints/background.ts)
      - Manages chrome.alarms for daily stats rollover at midnight
      - Updates dynamic tab badge text (e.g., "15s")
```

---

## Installation & Running Locally

### 1. Install Dependencies

```bash
npm install
```

### 2. Development Mode (Hot Module Replacement)

```bash
npm run dev
```

WXT will launch a dedicated Chromium browser instance with the extension pre-loaded and live reload enabled.

### 3. Build for Production

```bash
npm run build
```

The compiled extension will be generated in `.output/chrome-mv3`.

### 4. Load in Google Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the directory: `d:\skip and wait\.output\chrome-mv3`.

### 5. Package for Chrome Web Store

```bash
npm run zip
```

Produces a store-ready zip file at `.output/skip-and-wait-1.0.0-chrome.zip` (~92 KB).

---

## Running Automated Tests

```bash
npm run test
```

Executes the Vitest unit test suite covering:

- Timer hook speedup factors & micro-delay preservation.
- Stealth `Function.prototype.toString` preservation.
- Recipe URL pattern matching & base64 parameter extraction.
- Storage defaults and midnight rollover math.

---

## Project Structure

```
d:/skip and wait/
├── entrypoints/
│   ├── background.ts                  # Service Worker (alarms, storage, badges)
│   ├── main.content.ts                # Main World content script (stealth hooks)
│   ├── isolated.content.ts            # Isolated World script (recipes, heuristics, IPC)
│   └── popup/                         # React Toolbar Popup Dashboard
│       ├── App.tsx
│       ├── main.tsx
│       ├── style.css
│       └── index.html
├── src/
│   ├── core/
│   │   ├── hooks/                     # Stealth timer, media & visibility hooks
│   │   ├── engine/                    # Heuristic countdown skipper
│   │   └── ipc/                       # Cross-world communication bridge
│   ├── recipes/                       # Recipe catalogue & matching engine
│   ├── storage/                       # Typed Chrome storage wrapper & stats
│   ├── types/                         # TypeScript interfaces
│   └── ui/                            # Toast notification component
├── tests/
│   └── unit/                          # Vitest unit test suites
└── wxt.config.ts                      # WXT Manifest V3 build configuration
```
