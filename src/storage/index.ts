import type { UserSettings, SkipStats } from '../types';
import { DEFAULT_SETTINGS, DEFAULT_STATS, getTodayDateString } from './defaults';

const SETTINGS_KEY = 'skip_and_wait_settings';
const STATS_KEY = 'skip_and_wait_stats';

export async function getSettings(): Promise<UserSettings> {
  try {
    const result = await browser.storage.local.get(SETTINGS_KEY);
    if (result && result[SETTINGS_KEY]) {
      return { ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] };
    }
  } catch (err) {
    console.error('[Skip & Wait] Failed to load settings:', err);
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await browser.storage.local.set({ [SETTINGS_KEY]: updated });
  return updated;
}

export async function getStats(): Promise<SkipStats> {
  try {
    const result = await browser.storage.local.get(STATS_KEY);
    const today = getTodayDateString();
    let stats: SkipStats = result && result[STATS_KEY] ? { ...DEFAULT_STATS, ...result[STATS_KEY] } : DEFAULT_STATS;

    if (stats.lastResetDate !== today) {
      stats = {
        ...stats,
        todaySecondsSaved: 0,
        todayLinksBypassed: 0,
        lastResetDate: today,
      };
      await browser.storage.local.set({ [STATS_KEY]: stats });
    }
    return stats;
  } catch (err) {
    console.error('[Skip & Wait] Failed to load stats:', err);
    return DEFAULT_STATS;
  }
}

export async function recordBypass(secondsSaved: number = 10): Promise<SkipStats> {
  const stats = await getStats();
  const today = getTodayDateString();

  const isNewDay = stats.lastResetDate !== today;
  const updated: SkipStats = {
    totalSecondsSaved: stats.totalSecondsSaved + secondsSaved,
    totalLinksBypassed: stats.totalLinksBypassed + 1,
    todaySecondsSaved: (isNewDay ? 0 : stats.todaySecondsSaved) + secondsSaved,
    todayLinksBypassed: (isNewDay ? 0 : stats.todayLinksBypassed) + 1,
    lastResetDate: today,
  };

  await browser.storage.local.set({ [STATS_KEY]: updated });
  return updated;
}

export function subscribeToSettings(callback: (settings: UserSettings) => void): () => void {
  const listener = (changes: Record<string, any>, areaName: string) => {
    if (areaName === 'local' && changes[SETTINGS_KEY]) {
      callback({ ...DEFAULT_SETTINGS, ...changes[SETTINGS_KEY].newValue });
    }
  };

  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
