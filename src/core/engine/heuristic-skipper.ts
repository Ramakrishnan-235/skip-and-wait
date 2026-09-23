export class HeuristicSkipper {
  private observer: MutationObserver | null = null;
  private isThrottled = false;
  private bypassedElements = new WeakSet<Element>();
  private pendingClickTimeouts = new Set<any>();
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

    // 2. Countdown Buttons and Gate Elements on Download & Shortener Pages
    const potentialButtons = document.querySelectorAll<HTMLElement>(
      'button, a.disabled, input[type="button"], input[type="submit"], [class*="countdown"], [id*="countdown"], [id*="download"], [class*="download"]'
    );

    const countdownRegex = /\b(?:wait|seconds?|sec|\d+\s*s)\b/i;
    const numberRegex = /\d+/;
    const gateClassOrIdRegex = /(?:countdown|timer|download|gate|shortener)/i;
    const unlockedActionRegex = /\b(?:download|get link|continue|skip|proceed|direct download)\b/i;

    potentialButtons.forEach((el) => {
      if (this.bypassedElements.has(el)) return;

      const text = (el.textContent || (el as HTMLInputElement).value || '').trim();
      const classAndId = `${el.className || ''} ${el.id || ''}`;
      const hasCountdownText = countdownRegex.test(text);
      const isGateElement = gateClassOrIdRegex.test(classAndId);

      // Element must be verified as a countdown or download gate
      if (!hasCountdownText && !isGateElement && !forceImmediateClick) {
        return;
      }

      // Check if disabled or has countdown pattern
      const isDisabled =
        el.hasAttribute('disabled') ||
        el.classList.contains('disabled') ||
        (el as HTMLButtonElement).disabled;

      if (hasCountdownText || isDisabled || isGateElement) {
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
        if ('disabled' in el) {
          (el as any).disabled = false;
        }
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'pointer';

        if (forceImmediateClick) {
          this.bypassedElements.add(el);
          el.click();
          if (this.onBypassCallback) {
            this.onBypassCallback('Countdown Bypassed', estimatedSeconds);
          }
        } else {
          // Auto-click when countdown reaches 0 or an unlocked gate action appears
          const isZeroCountdown = hasCountdownText && (text.includes('0') || /\b0\s*(?:s|sec|seconds?)\b/i.test(text));
          const isUnlockedGate = isGateElement && unlockedActionRegex.test(text);

          if (isZeroCountdown || isUnlockedGate) {
            this.bypassedElements.add(el);
            const timeoutId = setTimeout(() => {
              this.pendingClickTimeouts.delete(timeoutId);
              el.click();
              if (this.onBypassCallback) {
                this.onBypassCallback('Unlocked & Clicked Button', estimatedSeconds);
              }
            }, 300);
            this.pendingClickTimeouts.add(timeoutId);
          }
        }
      }
    });

    // 3. Remove Hidden / Overlay Blockers
    const overlays = document.querySelectorAll<HTMLElement>(
      '.modal-backdrop, [class*="overlay-timer"], [id*="timer_overlay"]'
    );
    overlays.forEach((overlay) => {
      if (overlay && overlay.style.display !== 'none' && !this.bypassedElements.has(overlay)) {
        this.bypassedElements.add(overlay);
        overlay.style.display = 'none';
      }
    });
  }

  public stop() {
    this.observer?.disconnect();
    this.observer = null;
    this.pendingClickTimeouts.forEach((tid) => clearTimeout(tid));
    this.pendingClickTimeouts.clear();
  }
}

