import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { patchTimerAPIs } from '../../src/core/hooks/timer-hook';

describe('Timer Hook Interception', () => {
  let originalSetTimeout: typeof setTimeout;
  let originalSetInterval: typeof setInterval;

  beforeEach(() => {
    // Set up mock window if not in browser environment
    if (typeof window === 'undefined') {
      (globalThis as any).window = globalThis;
    }
    delete (window as any).__SKIP_AND_WAIT_TIMERS_PATCHED__;
    originalSetTimeout = window.setTimeout;
    originalSetInterval = window.setInterval;
  });

  afterEach(() => {
    window.setTimeout = originalSetTimeout;
    window.setInterval = originalSetInterval;
    delete (window as any).__SKIP_AND_WAIT_TIMERS_PATCHED__;
  });

  it('accelerates long delays by the speed multiplier', async () => {
    let capturedOriginal = 0;
    let capturedScaled = 0;

    patchTimerAPIs({
      speedMultiplier: 10,
      onAccelerate: (orig, scaled) => {
        capturedOriginal = orig;
        capturedScaled = scaled;
      },
    });

    const start = Date.now();
    await new Promise<void>((resolve) => {
      window.setTimeout(() => {
        resolve();
      }, 500); // 500ms should be scaled to ~50ms
    });
    const elapsed = Date.now() - start;

    expect(capturedOriginal).toBe(500);
    expect(capturedScaled).toBe(50);
    // 50ms instead of 500ms delay
    expect(elapsed).toBeLessThan(250);
  });

  it('preserves small UI micro-delays <= 150ms without scaling', () => {
    let calledAccelerate = false;

    patchTimerAPIs({
      speedMultiplier: 10,
      onAccelerate: () => {
        calledAccelerate = true;
      },
    });

    window.setTimeout(() => {}, 100);
    expect(calledAccelerate).toBe(false);
  });

  it('preserves native toString representation for stealth', () => {
    patchTimerAPIs({ speedMultiplier: 10 });

    const str = window.setTimeout.toString();
    expect(str).toBe(originalSetTimeout.toString());
    expect(window.setTimeout.name).toBe(originalSetTimeout.name);
  });
});
