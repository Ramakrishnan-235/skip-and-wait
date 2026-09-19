import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEFAULT_SETTINGS, DEFAULT_STATS, getTodayDateString } from '../../src/storage/defaults';
import { getSettings, saveSettings, getStats, recordBypass, subscribeToSettings } from '../../src/storage';

describe('Storage Defaults & Helpers', () => {
  it('has valid default settings enabled by default', () => {
    expect(DEFAULT_SETTINGS.enabled).toBe(true);
    expect(DEFAULT_SETTINGS.autoSkipShorteners).toBe(true);
    expect(DEFAULT_SETTINGS.autoSkipFileHosts).toBe(true);
    expect(DEFAULT_SETTINGS.autoAccelerateVideoAds).toBe(true);
    expect(DEFAULT_SETTINGS.speedMultiplier).toBe(10);
    expect(DEFAULT_SETTINGS.antiPauseSpoofing).toBe(true);
    expect(Array.isArray(DEFAULT_SETTINGS.whitelist)).toBe(true);
  });

  it('generates valid today date string in YYYY-MM-DD format', () => {
    const today = getTodayDateString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('initializes default stats with zero values and current date', () => {
    expect(DEFAULT_STATS.totalSecondsSaved).toBe(0);
    expect(DEFAULT_STATS.totalLinksBypassed).toBe(0);
    expect(DEFAULT_STATS.todaySecondsSaved).toBe(0);
    expect(DEFAULT_STATS.todayLinksBypassed).toBe(0);
    expect(DEFAULT_STATS.lastResetDate).toBe(getTodayDateString());
  });
});

describe('Storage Operations & Lifecycle', () => {
  let mockLocalStorage: Record<string, any>;
  let changeListeners: Array<(changes: Record<string, any>, area: string) => void>;

  beforeEach(() => {
    mockLocalStorage = {};
    changeListeners = [];

    (globalThis as any).browser = {
      storage: {
        local: {
          get: vi.fn(async (key?: string) => {
            if (!key) return { ...mockLocalStorage };
            return { [key]: mockLocalStorage[key] };
          }),
          set: vi.fn(async (items: Record<string, any>) => {
            Object.assign(mockLocalStorage, items);
          }),
        },
        onChanged: {
          addListener: vi.fn((fn) => changeListeners.push(fn)),
          removeListener: vi.fn((fn) => {
            changeListeners = changeListeners.filter((l) => l !== fn);
          }),
        },
      },
    };
  });

  it('returns default settings when storage is empty', async () => {
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('saves settings and merges partial updates', async () => {
    await saveSettings({ speedMultiplier: 16, enabled: false });

    const settings = await getSettings();
    expect(settings.speedMultiplier).toBe(16);
    expect(settings.enabled).toBe(false);
    expect(settings.autoSkipShorteners).toBe(true); // preserved from defaults
  });

  it('returns default stats initially', async () => {
    const stats = await getStats();
    expect(stats.totalSecondsSaved).toBe(0);
    expect(stats.lastResetDate).toBe(getTodayDateString());
  });

  it('automatically rolls over today stats when date changes', async () => {
    mockLocalStorage['skip_and_wait_stats'] = {
      totalSecondsSaved: 100,
      totalLinksBypassed: 5,
      todaySecondsSaved: 50,
      todayLinksBypassed: 2,
      lastResetDate: '2020-01-01', // Stale date
    };

    const stats = await getStats();
    expect(stats.totalSecondsSaved).toBe(100);
    expect(stats.totalLinksBypassed).toBe(5);
    expect(stats.todaySecondsSaved).toBe(0);
    expect(stats.todayLinksBypassed).toBe(0);
    expect(stats.lastResetDate).toBe(getTodayDateString());
  });

  it('records bypass increments accurately', async () => {
    await recordBypass(15);
    let stats = await getStats();

    expect(stats.totalSecondsSaved).toBe(15);
    expect(stats.todaySecondsSaved).toBe(15);
    expect(stats.totalLinksBypassed).toBe(1);
    expect(stats.todayLinksBypassed).toBe(1);

    await recordBypass(25);
    stats = await getStats();

    expect(stats.totalSecondsSaved).toBe(40);
    expect(stats.todaySecondsSaved).toBe(40);
    expect(stats.totalLinksBypassed).toBe(2);
    expect(stats.todayLinksBypassed).toBe(2);
  });

  it('subscribes to settings changes and unsubscribes cleanly', () => {
    let notifiedSettings: any = null;
    const unsubscribe = subscribeToSettings((settings) => {
      notifiedSettings = settings;
    });

    expect(changeListeners.length).toBe(1);

    // Trigger change event
    changeListeners[0]!(
      {
        skip_and_wait_settings: {
          newValue: { ...DEFAULT_SETTINGS, speedMultiplier: 20 },
        },
      },
      'local'
    );

    expect(notifiedSettings).toBeDefined();
    expect(notifiedSettings.speedMultiplier).toBe(20);

    unsubscribe();
    expect(changeListeners.length).toBe(0);
  });
});
