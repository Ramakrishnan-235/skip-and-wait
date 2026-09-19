import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTodayDateString } from '../../src/storage/defaults';

describe('Background Service Worker', () => {
  let installListeners: Array<(details: any) => Promise<void>>;
  let alarmListeners: Array<(alarm: any) => Promise<void>>;
  let messageListeners: Array<(message: any, sender: any, sendResponse: any) => void>;
  let createdAlarms: Record<string, any>;
  let badgeText: Record<number, string>;
  let badgeColor: Record<number, string>;
  let mockStorage: Record<string, any>;

  beforeEach(async () => {
    installListeners = [];
    alarmListeners = [];
    messageListeners = [];
    createdAlarms = {};
    badgeText = {};
    badgeColor = {};
    mockStorage = {};

    (globalThis as any).defineBackground = (fn: () => void) => fn;

    (globalThis as any).browser = {
      runtime: {
        onInstalled: {
          addListener: vi.fn((fn) => installListeners.push(fn)),
        },
        onMessage: {
          addListener: vi.fn((fn) => messageListeners.push(fn)),
        },
      },
      alarms: {
        create: vi.fn((name: string, info: any) => {
          createdAlarms[name] = info;
        }),
        onAlarm: {
          addListener: vi.fn((fn) => alarmListeners.push(fn)),
        },
      },
      action: {
        setBadgeText: vi.fn(({ tabId, text }: { tabId: number; text: string }) => {
          badgeText[tabId] = text;
        }),
        setBadgeBackgroundColor: vi.fn(({ tabId, color }: { tabId: number; color: string }) => {
          badgeColor[tabId] = color;
        }),
      },
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
    };

    // Dynamically import background script
    const backgroundModule = await import('../../entrypoints/background');
    const initBackground: any = backgroundModule.default;
    initBackground();
  });

  it('sets up alarms and initializes storage on first install', async () => {
    expect(installListeners.length).toBeGreaterThan(0);

    await installListeners[0]!({ reason: 'install' });

    expect(createdAlarms['DAILY_STATS_CHECK']).toBeDefined();
    expect(createdAlarms['DAILY_STATS_CHECK'].periodInMinutes).toBe(60);
  });

  it('rolls over daily stats when DAILY_STATS_CHECK alarm fires on a new day', async () => {
    mockStorage['skip_and_wait_stats'] = {
      totalSecondsSaved: 200,
      totalLinksBypassed: 8,
      todaySecondsSaved: 50,
      todayLinksBypassed: 3,
      lastResetDate: '2022-01-01', // Outdated date
    };

    expect(alarmListeners.length).toBeGreaterThan(0);
    await alarmListeners[0]!({ name: 'DAILY_STATS_CHECK' });

    const updatedStats = mockStorage['skip_and_wait_stats'];
    expect(updatedStats).toBeDefined();
    expect(updatedStats.todaySecondsSaved).toBe(0);
    expect(updatedStats.todayLinksBypassed).toBe(0);
    expect(updatedStats.lastResetDate).toBe(getTodayDateString());
    expect(updatedStats.totalSecondsSaved).toBe(200);
  });

  it('updates tab badge text and color when UPDATE_BADGE message is received', () => {
    expect(messageListeners.length).toBeGreaterThan(0);

    messageListeners[0]!(
      { type: 'UPDATE_BADGE', payload: { secondsSaved: 25 } },
      { tab: { id: 101 } },
      () => {}
    );

    expect(badgeText[101]).toBe('25s');
    expect(badgeColor[101]).toBe('#10B981');
  });

  it('ignores badge updates if secondsSaved <= 0 or tab has no id', () => {
    messageListeners[0]!(
      { type: 'UPDATE_BADGE', payload: { secondsSaved: 0 } },
      { tab: { id: 102 } },
      () => {}
    );
    expect(badgeText[102]).toBeUndefined();

    messageListeners[0]!(
      { type: 'UPDATE_BADGE', payload: { secondsSaved: 15 } },
      { tab: undefined },
      () => {}
    );
    expect(Object.keys(badgeText).length).toBe(0);
  });
});
