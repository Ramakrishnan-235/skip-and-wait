export class HeuristicSkipper {
  private observer: MutationObserver | null = null;
  private isThrottled = false;
  private bypassedElements = new WeakSet<Element>();
  private onBypassCallback?: (label: string, secondsSaved: number) => void;

  constructor(onBypass?: (label: string, secondsSaved: number) => void) {
    this.onBypassCallback = onBypass;
  }

  public start() {
    this.scan();

    this.observer = new MutationObserver(() => {
      if (this.isThrottled) return;
      this.isThrottled = true;

      requestAnimationFrame(() => {
        this.scan();
        this.isThrottled = false;
      });
    });

    const root = document.body || document.documentElement;
    if (root) {
      this.observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'style', 'class'],
      });
    }
  }

  public forceScanNow() {
    this.scan(true);
  }

  private scan(forceImmediateClick = false) {
    // 1. YouTube & Generic Ad Skip Buttons
    const skipSelectors = [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-skip-ad-button',
      'button.ytp-ad-skip-button-text',
      '[id*="skip-button"]',
      'button[aria-label*="Skip"]',
      'button[aria-label*="skip"]',
    ];

    for (const sel of skipSelectors) {
      const btn = document.querySelector<HTMLElement>(sel);
      if (btn && !this.bypassedElements.has(btn)) {
        if (btn.offsetParent !== null || btn.style.display !== 'none') {
          this.bypassedElements.add(btn);
          btn.click();
          if (this.onBypassCallback) {
            this.onBypassCallback('Video Ad Skipped', 15);
          }
          return;
        }
      }
    }

    // 2. Disabled Countdown Buttons on Download & Shortener Pages
    const potentialButtons = document.querySelectorAll<HTMLElement>(
      'button[disabled], a.disabled, input[type="button"][disabled], input[type="submit"][disabled], [class*="countdown"], [id*="countdown"], [id*="download"], [class*="download"]'
    );

    potentialButtons.forEach((el) => {
      if (this.bypassedElements.has(el)) return;

      const text = (el.textContent || (el as HTMLInputElement).value || '').trim();

      // Check if element contains countdown patterns, e.g. "Wait 15s", "Please wait (10)", "Download in 5 sec"
      const countdownRegex = /\b(?:wait|seconds?|sec|\d+\s*s)\b/i;
      const numberRegex = /\d+/;

      if (countdownRegex.test(text) || el.hasAttribute('disabled') || el.classList.contains('disabled')) {
        let estimatedSeconds = 10;
        const match = text.match(numberRegex);
        if (match) {
          const parsed = parseInt(match[0], 10);
          if (parsed > 0 && parsed <= 120) {
            estimatedSeconds = parsed;
          }
        }

        // Remove disabled state
        el.removeAttribute('disabled');
        el.classList.remove('disabled');
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'pointer';

        if (forceImmediateClick) {
          this.bypassedElements.add(el);
          el.click();
          if (this.onBypassCallback) {
            this.onBypassCallback('Countdown Bypassed', estimatedSeconds);
          }
        } else {
          // If countdown number reached 0 or button is an unlock button
          if (text.includes('0') || !text.match(/\d+/) || forceImmediateClick) {
            this.bypassedElements.add(el);
            setTimeout(() => {
              el.click();
              if (this.onBypassCallback) {
                this.onBypassCallback('Unlocked & Clicked Button', estimatedSeconds);
              }
            }, 300);
          }
        }
      }
    });

    // 3. Remove Hidden / Overlay Blockers
    const overlays = document.querySelectorAll<HTMLElement>('.modal-backdrop, [class*="overlay-timer"], [id*="timer_overlay"]');
    overlays.forEach((overlay) => {
      if (overlay && overlay.style.display !== 'none' && !this.bypassedElements.has(overlay)) {
        this.bypassedElements.add(overlay);
        overlay.style.display = 'none';
      }
    });
  }

  public stop() {
    this.observer?.disconnect();
  }
}
