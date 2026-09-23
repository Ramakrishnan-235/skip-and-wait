import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import App from '../../entrypoints/popup/App';
import { DEFAULT_SETTINGS, DEFAULT_STATS } from '../../src/storage/defaults';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Popup Dashboard React UI', () => {
  let container: HTMLDivElement;
  let root: any;
  let mockStorage: Record<string, any>;
  let sentTabMessages: Array<{ tabId: number; message: any }>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockStorage = {};
    sentTabMessages = [];

    (globalThis as any).browser = {
      storage: {
        local: {
          get: vi.fn(async (key?: string) => {
            if (!key) return { ...mockStorage };
            return { [key]: mockStorage[key] };
          }),
          set: vi.fn(async (items: Record<string, any>) => {
            Object.assign(mockStorage, items);
          }),
        },
      },
      tabs: {
        query: vi.fn(async () => [
          {
            id: 123,
            url: 'https://rapidgator.net/file/abc',
          },
        ]),
        sendMessage: vi.fn(async (tabId: number, message: any) => {
          sentTabMessages.push({ tabId, message });
        }),
      },
    };
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
    container.remove();
    document.body.innerHTML = '';
  });

  it('renders dashboard with brand, stats cards and current domain', async () => {
    mockStorage['skip_and_wait_stats'] = {
      ...DEFAULT_STATS,
      todaySecondsSaved: 125, // 2m 5s
      todayLinksBypassed: 4,
      totalSecondsSaved: 3665, // 1h 1m
    };

    root = createRoot(container);
    await act(async () => {
      root.render(<App />);
    });

    expect(container.textContent).toContain('Skip & Wait');
    expect(container.textContent).toContain('v1.0.0');
    expect(container.textContent).toContain('Active');
    expect(container.textContent).toContain('2m 5s');
    expect(container.textContent).toContain('1h 1m');
    expect(container.textContent).toContain('rapidgator.net');
    expect(container.textContent).toContain('Link Shorteners');
    expect(container.textContent).toContain('File Hosting Gates');
    expect(container.textContent).toContain('Video Ad Acceleration');
    expect(container.textContent).toContain('Anti-Pause Tab Spoofing');
    expect(container.textContent).toContain('Block YouTube Redirects');
  });

  it('toggles master power state between Active and Paused', async () => {
    root = createRoot(container);
    await act(async () => {
      root.render(<App />);
    });

    const powerBtn = container.querySelector<HTMLButtonElement>('.power-toggle-btn')!;
    expect(powerBtn).not.toBeNull();
    expect(powerBtn.textContent).toContain('Active');

    await act(async () => {
      powerBtn.click();
    });

    expect(powerBtn.textContent).toContain('Paused');
    expect(mockStorage['skip_and_wait_settings'].enabled).toBe(false);

    // Toggle back
    await act(async () => {
      powerBtn.click();
    });

    expect(powerBtn.textContent).toContain('Active');
    expect(mockStorage['skip_and_wait_settings'].enabled).toBe(true);
  });

  it('toggles domain whitelist status', async () => {
    root = createRoot(container);
    await act(async () => {
      root.render(<App />);
    });

    const siteCheckbox = container.querySelector<HTMLInputElement>('.site-header input[type="checkbox"]')!;
    expect(siteCheckbox).not.toBeNull();
    // Initially not whitelisted -> checkbox is checked (active)
    expect(siteCheckbox.checked).toBe(true);

    // Toggle to disable on this site (add to whitelist)
    await act(async () => {
      siteCheckbox.click();
    });

    expect(mockStorage['skip_and_wait_settings'].whitelist).toContain('rapidgator.net');
  });

  it('dispatches FORCE_SKIP_PAGE message to the active tab when clicking Force Skip', async () => {
    root = createRoot(container);
    await act(async () => {
      root.render(<App />);
    });

    const forceSkipBtn = container.querySelector<HTMLButtonElement>('.force-skip-btn')!;
    expect(forceSkipBtn).not.toBeNull();

    await act(async () => {
      forceSkipBtn.click();
    });

    expect(sentTabMessages.length).toBe(1);
    expect(sentTabMessages[0]).toEqual({
      tabId: 123,
      message: { type: 'FORCE_SKIP_PAGE' },
    });
  });

  it('toggles individual automation features', async () => {
    root = createRoot(container);
    await act(async () => {
      root.render(<App />);
    });

    const toggleItems = container.querySelectorAll<HTMLElement>('.toggle-item');
    expect(toggleItems.length).toBe(5);

    // Click on Video Ad Acceleration toggle (index 2)
    await act(async () => {
      toggleItems[2]!.click();
    });
    expect(mockStorage['skip_and_wait_settings'].autoAccelerateVideoAds).toBe(false);

    // Click on Block YouTube Redirects toggle (index 4)
    await act(async () => {
      toggleItems[4]!.click();
    });
    expect(mockStorage['skip_and_wait_settings'].blockYouTubeRedirects).toBe(false);
  });

  it('updates speed multiplier setting when clicking speed pill buttons', async () => {
    root = createRoot(container);
    await act(async () => {
      root.render(<App />);
    });

    const speedPills = container.querySelectorAll<HTMLButtonElement>('.speed-pill');
    expect(speedPills.length).toBe(4); // 2x, 5x, 10x, 16x

    // Click on 16x pill (index 3)
    await act(async () => {
      speedPills[3]!.click();
    });

    expect(mockStorage['skip_and_wait_settings'].speedMultiplier).toBe(16);
    expect(speedPills[3]!.classList.contains('active')).toBe(true);
  });
});

