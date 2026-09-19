import { getSettings, getStats, saveSettings } from '../src/storage';
import { getTodayDateString } from '../src/storage/defaults';

export default defineBackground(() => {
  console.log('[Skip & Wait] Background Service Worker initialized.');

  // 1. First install setup & daily alarms
  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
      console.log('[Skip & Wait] First install detected. Initializing storage.');
      await getSettings();
      await getStats();
    }

    // Set up a daily midnight alarm for stats rollover
    browser.alarms.create('DAILY_STATS_CHECK', {
      periodInMinutes: 60, // Check hourly for day change
    });
  });

  // 2. Alarm listener for daily rollover
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'DAILY_STATS_CHECK') {
      const stats = await getStats();
      const today = getTodayDateString();
      if (stats.lastResetDate !== today) {
        console.log('[Skip & Wait] Rolling over daily stats.');
        await browser.storage.local.set({
          skip_and_wait_stats: {
            ...stats,
            todaySecondsSaved: 0,
            todayLinksBypassed: 0,
            lastResetDate: today,
          },
        });
      }
    }
  });

  // 3. Message handling (badge updates, popup queries)
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'UPDATE_BADGE' && sender.tab?.id) {
      const seconds = message.payload?.secondsSaved || 0;
      if (seconds > 0) {
        browser.action.setBadgeText({
          tabId: sender.tab.id,
          text: `${seconds}s`,
        });
        browser.action.setBadgeBackgroundColor({
          tabId: sender.tab.id,
          color: '#10B981', // Emerald green
        });
      }
    }
  });
});
