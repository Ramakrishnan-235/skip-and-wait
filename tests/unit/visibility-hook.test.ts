import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  patchVisibilityAPIs,
  updateVisibilityHookOptions,
} from '../../src/core/hooks/visibility-hook';

describe('Visibility Hook Anti-Pause Spoofing', () => {
  let originalAddEventListener: typeof EventTarget.prototype.addEventListener;
  let originalRemoveEventListener: typeof EventTarget.prototype.removeEventListener;

  beforeEach(() => {
    delete (window as any).__SKIP_AND_WAIT_VISIBILITY_PATCHED__;
    originalAddEventListener = EventTarget.prototype.addEventListener;
    originalRemoveEventListener = EventTarget.prototype.removeEventListener;
  });

  afterEach(() => {
    EventTarget.prototype.addEventListener = originalAddEventListener;
    EventTarget.prototype.removeEventListener = originalRemoveEventListener;
    delete (window as any).__SKIP_AND_WAIT_VISIBILITY_PATCHED__;
  });


  it('spoofs document.hidden to always be false', () => {
    patchVisibilityAPIs();
    expect(document.hidden).toBe(false);
  });

  it('spoofs document.visibilityState to always be "visible"', () => {
    patchVisibilityAPIs();
    expect(document.visibilityState).toBe('visible');
  });

  it('intercepts visibilitychange event listeners with document target', () => {
    patchVisibilityAPIs();

    let eventFired = false;
    let targetDoc: any = null;

    document.addEventListener('visibilitychange', (evt: Event) => {
      eventFired = true;
      targetDoc = evt.target;
    });

    document.dispatchEvent(new Event('visibilitychange'));

    expect(eventFired).toBe(true);
    expect(targetDoc).toBe(document);
  });

  it('intercepts webkitvisibilitychange event listeners', () => {
    patchVisibilityAPIs();

    let eventFired = false;
    document.addEventListener('webkitvisibilitychange', () => {
      eventFired = true;
    });

    document.dispatchEvent(new Event('webkitvisibilitychange'));
    expect(eventFired).toBe(true);
  });

  it('supports listener object with handleEvent method', () => {
    patchVisibilityAPIs();

    let handled = false;
    const listenerObj = {
      handleEvent(evt: Event) {
        handled = true;
      },
    };

    document.addEventListener('visibilitychange', listenerObj);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(handled).toBe(true);
  });

  it('passes normal non-visibility events directly without wrapping', () => {
    patchVisibilityAPIs();

    let clickHandled = false;
    window.addEventListener('click', () => {
      clickHandled = true;
    });

    window.dispatchEvent(new Event('click'));
    expect(clickHandled).toBe(true);
  });

  it('does not re-patch if already initialized', () => {
    patchVisibilityAPIs();
    const patchedListener = EventTarget.prototype.addEventListener;

    patchVisibilityAPIs();
    expect(EventTarget.prototype.addEventListener).toBe(patchedListener);
  });

  it('correctly unregisters visibilitychange listeners with removeEventListener', () => {
    patchVisibilityAPIs();

    let count = 0;
    const listener = () => {
      count++;
    };

    document.addEventListener('visibilitychange', listener);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(count).toBe(1);

    document.removeEventListener('visibilitychange', listener);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(count).toBe(1);
  });

  it('spoofs document.hasFocus() to return true when enabled and respects toggle', () => {
    patchVisibilityAPIs();

    expect(typeof document.hasFocus).toBe('function');
    expect(document.hasFocus()).toBe(true);

    updateVisibilityHookOptions(false);
    // When disabled, calls underlying hasFocus
    expect(typeof document.hasFocus()).toBe('boolean');
  });
});

