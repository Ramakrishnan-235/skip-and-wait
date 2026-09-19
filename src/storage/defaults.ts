import type { UserSettings, SkipStats } from '../types';

export const DEFAULT_SETTINGS: UserSettings = {
  enabled: true,
  autoSkipShorteners: true,
  autoSkipFileHosts: true,
  autoAccelerateVideoAds: true,
  speedMultiplier: 10,
  muteVideoAds: true,
  showToastNotification: true,
  antiPauseSpoofing: true,
  whitelist: [],
  blacklist: [],
};

export const getTodayDateString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const DEFAULT_STATS: SkipStats = {
  totalSecondsSaved: 0,
  totalLinksBypassed: 0,
  todaySecondsSaved: 0,
  todayLinksBypassed: 0,
  lastResetDate: getTodayDateString(),
};
