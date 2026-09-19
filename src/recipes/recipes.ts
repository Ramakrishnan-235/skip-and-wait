import type { SkipRecipe } from '../types';

export const BUILTIN_RECIPES: SkipRecipe[] = [
  // 1. YouTube Ad Skipping
  {
    id: 'youtube-ad-skipper',
    name: 'YouTube Ad Fast-Forward & Skip',
    type: 'video',
    hostPatterns: ['youtube\\.com', 'youtu\\.be'],
    steps: [
      {
        action: 'click',
        targetSelector: '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button-text',
      },
    ],
  },

  // 2. Generic Query Parameter Redirection Bypasses (e.g., ?url=http..., ?dest=http...)
  {
    id: 'generic-query-redirect',
    name: 'Generic URL Parameter Unmasker',
    type: 'redirect',
    hostPatterns: ['linkvertise\\.com', 'ouo\\.io', 'ouo\\.press', 'shrinkme\\.io', 'shorturl\\.at'],
    directExtract: {
      queryParam: 'url',
      decodeBase64: true,
    },
  },

  // 3. Adf.ly & Clones
  {
    id: 'adfly-style-shorteners',
    name: 'Adfly Style Gateway',
    type: 'shortener',
    hostPatterns: ['adf\\.ly', 'ay\\.gy', 'j\\.gs', 'q\\.gs'],
    steps: [
      {
        action: 'unhide',
        targetSelector: '#skip_bufl, #skip_button, a.skip',
      },
      {
        action: 'click',
        targetSelector: '#skip_bufl, #skip_button, a.skip',
        delayMs: 300,
      },
    ],
  },

  // 4. ShrinkMe & Similar Multi-step Shorteners
  {
    id: 'shrinkme-style-shortener',
    name: 'ShrinkMe & Safelink Gateway',
    type: 'shortener',
    hostPatterns: ['shrinkme\\.io', 'shrinke\\.me', 'clik\\.pw', 'zagl\\.info'],
    steps: [
      {
        action: 'unhide',
        targetSelector: '#btn-main, .btn-captcha, #invisibleCaptchaFinished, a.get-link',
      },
      {
        action: 'click',
        targetSelector: '#btn-main, .btn-captcha, a.get-link',
        delayMs: 500,
      },
    ],
  },

  // 5. Rapidgator Free Tier Delay
  {
    id: 'rapidgator-filehost',
    name: 'Rapidgator Free Download',
    type: 'filehost',
    hostPatterns: ['rapidgator\\.net'],
    steps: [
      {
        action: 'click',
        targetSelector: 'a.btn-free, .bt_free',
      },
      {
        action: 'unhide',
        targetSelector: '#btn_download, .btn-download',
      },
    ],
  },

  // 6. DDownload Free Tier
  {
    id: 'ddownload-filehost',
    name: 'DDownload Countdown Bypass',
    type: 'filehost',
    hostPatterns: ['ddownload\\.com'],
    steps: [
      {
        action: 'unhide',
        targetSelector: '#downloadbtn, .download-btn',
      },
      {
        action: 'click',
        targetSelector: '#downloadbtn',
        delayMs: 500,
      },
    ],
  },

  // 7. Katfile Delay Reducer
  {
    id: 'katfile-filehost',
    name: 'Katfile Free Download Gate',
    type: 'filehost',
    hostPatterns: ['katfile\\.com'],
    steps: [
      {
        action: 'unhide',
        targetSelector: '#downloadbtn, input[type="submit"][value*="Download"]',
      },
      {
        action: 'click',
        targetSelector: '#downloadbtn',
        delayMs: 300,
      },
    ],
  },

  // 8. MediaFire Direct Auto-Click
  {
    id: 'mediafire-autoclick',
    name: 'MediaFire Instant Trigger',
    type: 'filehost',
    hostPatterns: ['mediafire\\.com'],
    steps: [
      {
        action: 'click',
        targetSelector: '#downloadButton, .download_link a',
        delayMs: 200,
      },
    ],
  },
];
