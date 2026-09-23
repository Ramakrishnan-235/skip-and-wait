let activeDismissTimer: any = null;
let activeFadeTimer: any = null;

export function dismissToast() {
  if (activeDismissTimer) {
    clearTimeout(activeDismissTimer);
    activeDismissTimer = null;
  }
  if (activeFadeTimer) {
    clearTimeout(activeFadeTimer);
    activeFadeTimer = null;
  }
  const existing = document.getElementById('skip-and-wait-toast-container');
  if (existing) {
    existing.remove();
  }
}

export function showToast(message: string, durationMs = 2000) {
  // Clear any existing toast and pending dismissal timers
  dismissToast();

  const container = document.createElement('div');
  container.id = 'skip-and-wait-toast-container';

  // Apply isolated inline glassmorphism styles
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '2147483647',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 18px',
    background: 'rgba(17, 24, 39, 0.88)',
    backdropFilter: 'blur(12px)',
    webkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '9999px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
    fontWeight: '500',
    letterSpacing: '0.2px',
    pointerEvents: 'none',
    opacity: '0',
    transform: 'translateY(12px) scale(0.96)',
    transition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  });

  const iconSpan = document.createElement('span');
  iconSpan.textContent = '⚡';
  iconSpan.style.fontSize = '14px';

  const textSpan = document.createElement('span');
  textSpan.textContent = message;

  container.appendChild(iconSpan);
  container.appendChild(textSpan);
  document.body.appendChild(container);

  // Trigger entrance transition
  requestAnimationFrame(() => {
    container.style.opacity = '1';
    container.style.transform = 'translateY(0) scale(1)';
  });

  // Fade out & cleanup
  activeDismissTimer = setTimeout(() => {
    container.style.opacity = '0';
    container.style.transform = 'translateY(8px) scale(0.96)';
    activeFadeTimer = setTimeout(() => {
      container.remove();
      activeFadeTimer = null;
    }, 300);
    activeDismissTimer = null;
  }, durationMs);
}

