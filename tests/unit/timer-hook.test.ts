import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { patchTimerAPIs } from '../../src/core/hooks/timer-hook';

describe('Timer Hook Interception', () => {
  let originalSetTimeout: typeof setTimeout;
  let originalSetInterval: typeof setInterval;
  let originalClearTimeout: typeof clearTimeout;
  let originalClearInterval: typeof clearInterval;

  beforeEach(() => {
    if (typeof window === 'undefined') {
      (globalThis as any).window = globalThis;
    }
    delete (window as any).__SKIP_AND_WAIT_TIMERS_PATCHED__;
    delete (window as any).__skip_and_wait_fast_forward_all;
    originalSetTimeout = window.setTimeout;
    originalSetInterval = window.setInterval;
    originalClearTimeout = window.clearTimeout;
    originalClearInterval = window.clearInterval;
  });

  afterEach(() => {
    window.setTimeout = originalSetTimeout;
    window.setInterval = originalSetInterval;
    window.clearTimeout = originalClearTimeout;
    window.clearInterval = originalClearInterval;
    delete (window as any).__SKIP_AND_WAIT_TIMERS_PATCHED__;
    delete (window as any).__skip_and_wait_fast_forward_all;
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

    expect(window.setTimeout.toString()).toBe(originalSetTimeout.toString());
    expect(window.setTimeout.name).toBe(originalSetTimeout.name);
    expect(window.setInterval.toString()).toBe(originalSetInterval.toString());
    expect(window.setInterval.name).toBe(originalSetInterval.name);
    expect(window.clearTimeout.toString()).toBe(originalClearTimeout.toString());
    expect(window.clearInterval.toString()).toBe(originalClearInterval.toString());
  });

  it('accelerates setInterval for delays > 150ms', async () => {
    let capturedOriginal = 0;
    let capturedScaled = 0;

    patchTimerAPIs({
      speedMultiplier: 10,
      onAccelerate: (orig, scaled) => {
        capturedOriginal = orig;
        capturedScaled = scaled;
      },
    });

    let ticks = 0;
    await new Promise<void>((resolve) => {
      const intervalId = window.setInterval(() => {
        ticks++;
        if (ticks >= 2) {
          window.clearInterval(intervalId);
          resolve();
        }
      }, 300); // Scaled to max(25, 30ms)
    });

    expect(capturedOriginal).toBe(300);
    expect(capturedScaled).toBe(30);
    expect(ticks).toBe(2);
  });

  it('preserves setInterval delays <= 150ms', () => {
    let calledAccelerate = false;

    patchTimerAPIs({
      speedMultiplier: 10,
      onAccelerate: () => {
        calledAccelerate = true;
      },
    });

    const id = window.setInterval(() => {}, 100);
    window.clearInterval(id);
    expect(calledAccelerate).toBe(false);
  });

  it('forwards additional arguments to setTimeout callback', async () => {
    patchTimerAPIs({ speedMultiplier: 10 });

    const result = await new Promise<string>((resolve) => {
      window.setTimeout(
        (val: string) => {
          resolve(val);
        },
        200,
        'hello-world'
      );
    });

    expect(result).toBe('hello-world');
  });

  it('handles string code in setTimeout as fallback', async () => {
    patchTimerAPIs({ speedMultiplier: 10 });

    (window as any).__test_string_handler_ran = false;
    window.setTimeout('window.__test_string_handler_ran = true;' as any, 200);

    await new Promise((r) => setTimeout(r, 60));
    expect((window as any).__test_string_handler_ran).toBe(true);
    delete (window as any).__test_string_handler_ran;
  });

  it('clears active timers on clearTimeout and clearInterval', () => {
    patchTimerAPIs({ speedMultiplier: 10 });

    const timeoutId = window.setTimeout(() => {}, 1000);
    expect(() => window.clearTimeout(timeoutId)).not.toThrow();

    const intervalId = window.setInterval(() => {}, 1000);
    expect(() => window.clearInterval(intervalId)).not.toThrow();
  });

  it('exposes and executes __skip_and_wait_fast_forward_all', () => {
    patchTimerAPIs({ speedMultiplier: 10 });

    expect(typeof (window as any).__skip_and_wait_fast_forward_all).toBe('function');

    let ran = false;
    window.setTimeout(() => {
      ran = true;
    }, 5000);

    (window as any).__skip_and_wait_fast_forward_all();
    expect(ran).toBe(false);
  });

  it('prevents double patching if already patched', () => {
    patchTimerAPIs({ speedMultiplier: 10 });
    const firstPatchedSetTimeout = window.setTimeout;

    patchTimerAPIs({ speedMultiplier: 5 });
    expect(window.setTimeout).toBe(firstPatchedSetTimeout);
  });
});
