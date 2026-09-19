import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, DEFAULT_STATS, getTodayDateString } from '../../src/storage/defaults';

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
