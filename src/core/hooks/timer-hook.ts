export interface TimerHookOptions {
  speedMultiplier: number;
  enabled?: boolean;
  onAccelerate?: (originalDelay: number, scaledDelay: number) => void;
}

let activeOptions: TimerHookOptions = {
  speedMultiplier: 10,
  enabled: true,
};

export function updateTimerHookOptions(options: Partial<TimerHookOptions>) {
  Object.assign(activeOptions, options);
}

export function getTimerHookOptions(): TimerHookOptions {
  return { ...activeOptions };
}

export function patchTimerAPIs(options: TimerHookOptions) {
  Object.assign(activeOptions, options);

  if ((window as any).__SKIP_AND_WAIT_TIMERS_PATCHED__) {
    return;
  }
  (window as any).__SKIP_AND_WAIT_TIMERS_PATCHED__ = true;

  const originalSetTimeout = window.setTimeout;
  const originalSetInterval = window.setInterval;
  const originalClearTimeout = window.clearTimeout;
  const originalClearInterval = window.clearInterval;

  // Preserve native function representations
  const preserveToString = (fn: Function, original: Function) => {
    Object.defineProperty(fn, 'name', { value: original.name, configurable: true });
    Object.defineProperty(fn, 'length', { value: original.length, configurable: true });
    fn.toString = () => original.toString();
  };

  const activeTimers = new Set<any>();

  const customSetTimeout = function (
    handler: TimerHandler,
    timeout?: number,
    ...args: any[]
  ): number {
    const delay = typeof timeout === 'number' ? timeout : 0;
    let scaled = delay;

    const isEnabled = activeOptions.enabled !== false;
    const multiplier = Math.max(1, Math.min(100, activeOptions.speedMultiplier || 1));

    // Only scale delays > 150ms when enabled and multiplier > 1
    if (isEnabled && multiplier > 1 && delay > 150) {
      scaled = Math.max(10, Math.floor(delay / multiplier));
      if (activeOptions.onAccelerate) {
        activeOptions.onAccelerate(delay, scaled);
      }
    }

    const timerId = (originalSetTimeout as any).call(
      window,
      (...cbArgs: any[]) => {
        activeTimers.delete(timerId);
        if (typeof handler === 'function') {
          handler(...cbArgs);
        } else {
          try {
            // Direct string handler fallback
            (0, eval)(handler);
          } catch (e) {
            console.error('[Skip & Wait] String timeout execution error:', e);
          }
        }
      },
      scaled,
      ...args
    );

    activeTimers.add(timerId);
    return timerId as any;
  };

  const customSetInterval = function (
    handler: TimerHandler,
    timeout?: number,
    ...args: any[]
  ): number {
    const delay = typeof timeout === 'number' ? timeout : 0;
    let scaled = delay;

    const isEnabled = activeOptions.enabled !== false;
    const multiplier = Math.max(1, Math.min(100, activeOptions.speedMultiplier || 1));

    if (isEnabled && multiplier > 1 && delay > 150) {
      scaled = Math.max(25, Math.floor(delay / multiplier));
      if (activeOptions.onAccelerate) {
        activeOptions.onAccelerate(delay, scaled);
      }
    }

    const timerId = (originalSetInterval as any).call(window, handler as any, scaled, ...args);
    activeTimers.add(timerId);
    return timerId as any;
  };

  const customClearTimeout = function (timerId?: number) {
    if (timerId !== undefined) {
      activeTimers.delete(timerId);
    }
    return originalClearTimeout.call(window, timerId);
  };

  const customClearInterval = function (timerId?: number) {
    if (timerId !== undefined) {
      activeTimers.delete(timerId);
    }
    return originalClearInterval.call(window, timerId);
  };

  preserveToString(customSetTimeout, originalSetTimeout);
  preserveToString(customSetInterval, originalSetInterval);
  preserveToString(customClearTimeout, originalClearTimeout);
  preserveToString(customClearInterval, originalClearInterval);

  window.setTimeout = customSetTimeout as any;
  window.setInterval = customSetInterval as any;
  window.clearTimeout = customClearTimeout as any;
  window.clearInterval = customClearInterval as any;

  // Expose emergency fast forward helper
  (window as any).__skip_and_wait_fast_forward_all = () => {
    activeTimers.forEach((id) => {
      try {
        originalClearTimeout(id);
        originalClearInterval(id);
      } catch {}
    });
    activeTimers.clear();
  };
}

