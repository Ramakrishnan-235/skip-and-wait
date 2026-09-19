import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { showToast } from '../../src/ui/toast';

describe('Toast UI Notification', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts toast container with message and icon in document body', () => {
    showToast('Timer Accelerated (-10s)');

    const container = document.getElementById('skip-and-wait-toast-container');
    expect(container).not.toBeNull();
    expect(container?.textContent).toContain('⚡');
    expect(container?.textContent).toContain('Timer Accelerated (-10s)');
  });

  it('replaces existing toast to prevent multiple toasts from stacking', () => {
    showToast('First Message');
    const firstContainer = document.getElementById('skip-and-wait-toast-container');

    showToast('Second Message');
    const containers = document.querySelectorAll('#skip-and-wait-toast-container');

    expect(containers.length).toBe(1);
    expect(containers[0]!.textContent).toContain('Second Message');
    expect(document.body.contains(firstContainer)).toBe(false);
  });

  it('has proper glassmorphism styling attributes', () => {
    showToast('Testing Styles');
    const container = document.getElementById('skip-and-wait-toast-container')!;

    expect(container.style.position).toBe('fixed');
    expect(container.style.bottom).toBe('24px');
    expect(container.style.right).toBe('24px');
    expect(container.style.zIndex).toBe('2147483647');
  });

  it('removes toast container after durationMs expires', async () => {
    showToast('Temporary Toast', 50);

    expect(document.getElementById('skip-and-wait-toast-container')).not.toBeNull();

    // Wait for durationMs (50ms) + fade transition (300ms) + buffer
    await new Promise((r) => setTimeout(r, 420));

    expect(document.getElementById('skip-and-wait-toast-container')).toBeNull();
  });
});
