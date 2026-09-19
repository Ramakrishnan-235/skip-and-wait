export function patchVisibilityAPIs() {
  if ((window as any).__SKIP_AND_WAIT_VISIBILITY_PATCHED__) {
    return;
  }
  (window as any).__SKIP_AND_WAIT_VISIBILITY_PATCHED__ = true;

  try {
    Object.defineProperty(document, 'hidden', {
      get: () => false,
      configurable: true,
    });

    Object.defineProperty(document, 'visibilityState', {
      get: () => 'visible',
      configurable: true,
    });

    // Intercept visibilitychange event listeners
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) {
      if (type === 'visibilitychange' || type === 'webkitvisibilitychange') {
        // Wrap listener to filter out hidden events
        const wrappedListener = function (this: any, evt: Event) {
          try {
            Object.defineProperty(evt, 'target', { value: document, configurable: true });
          } catch {}
          if (typeof listener === 'function') {
            listener.call(this, evt);
          } else if (listener && typeof listener.handleEvent === 'function') {
            listener.handleEvent(evt);
          }
        };
        return originalAddEventListener.call(this, type, wrappedListener, options);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  } catch (e) {
    console.error('[Skip & Wait] Failed to patch visibility APIs:', e);
  }
}
