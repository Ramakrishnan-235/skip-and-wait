let isVisibilityHookEnabled = true;

export function updateVisibilityHookOptions(enabled: boolean) {
  isVisibilityHookEnabled = enabled;
}

export function patchVisibilityAPIs(initialEnabled = true) {
  isVisibilityHookEnabled = initialEnabled;

  if ((window as any).__SKIP_AND_WAIT_VISIBILITY_PATCHED__) {
    return;
  }
  (window as any).__SKIP_AND_WAIT_VISIBILITY_PATCHED__ = true;

  try {
    const docProto = Document.prototype;
    const originalHiddenDesc =
      Object.getOwnPropertyDescriptor(docProto, 'hidden') ||
      Object.getOwnPropertyDescriptor(document, 'hidden');
    const originalVisibilityDesc =
      Object.getOwnPropertyDescriptor(docProto, 'visibilityState') ||
      Object.getOwnPropertyDescriptor(document, 'visibilityState');

    Object.defineProperty(document, 'hidden', {
      get: () => {
        if (!isVisibilityHookEnabled && originalHiddenDesc?.get) {
          return originalHiddenDesc.get.call(document);
        }
        return false;
      },
      configurable: true,
    });

    Object.defineProperty(document, 'visibilityState', {
      get: () => {
        if (!isVisibilityHookEnabled && originalVisibilityDesc?.get) {
          return originalVisibilityDesc.get.call(document);
        }
        return 'visible';
      },
      configurable: true,
    });

    // Spoof document.hasFocus to prevent blur pauses
    const originalHasFocus = document.hasFocus;
    if (typeof originalHasFocus === 'function') {
      const customHasFocus = function (this: Document) {
        if (isVisibilityHookEnabled) return true;
        return originalHasFocus.call(this);
      };
      try {
        Object.defineProperty(customHasFocus, 'name', { value: originalHasFocus.name, configurable: true });
        Object.defineProperty(customHasFocus, 'length', { value: originalHasFocus.length, configurable: true });
        customHasFocus.toString = () => originalHasFocus.toString();
      } catch {}
      document.hasFocus = customHasFocus;
    }

    // Intercept visibilitychange event listeners with bidirectional WeakMap
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    const wrappedListenersMap = new WeakMap<EventListenerOrEventListenerObject, EventListener>();

    EventTarget.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) {
      if ((type === 'visibilitychange' || type === 'webkitvisibilitychange') && listener) {
        const wrappedListener = function (this: any, evt: Event) {
          if (!isVisibilityHookEnabled) {
            if (typeof listener === 'function') {
              listener.call(this, evt);
            } else if (listener && typeof listener.handleEvent === 'function') {
              listener.handleEvent(evt);
            }
            return;
          }

          try {
            Object.defineProperty(evt, 'target', { value: document, configurable: true });
          } catch {}

          if (typeof listener === 'function') {
            listener.call(this, evt);
          } else if (listener && typeof listener.handleEvent === 'function') {
            listener.handleEvent(evt);
          }
        };

        wrappedListenersMap.set(listener, wrappedListener);
        return originalAddEventListener.call(this, type, wrappedListener, options);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };

    EventTarget.prototype.removeEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ) {
      if ((type === 'visibilitychange' || type === 'webkitvisibilitychange') && listener) {
        const wrapped = wrappedListenersMap.get(listener);
        if (wrapped) {
          wrappedListenersMap.delete(listener);
          return originalRemoveEventListener.call(this, type, wrapped, options);
        }
      }
      return originalRemoveEventListener.call(this, type, listener, options);
    };
  } catch (e) {
    console.error('[Skip & Wait] Failed to patch visibility APIs:', e);
  }
}

