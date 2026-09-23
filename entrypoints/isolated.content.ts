import { IPCBridge } from '../src/core/ipc/bridge';
import { RecipeEngine } from '../src/recipes/engine';
import { HeuristicSkipper } from '../src/core/engine/heuristic-skipper';
import { showToast } from '../src/ui/toast';
import { getSettings, recordBypass, subscribeToSettings } from '../src/storage';
import { checkAndHandleYouTubeRedirect } from '../src/core/engine/youtube-redirect-guard';
import type { ActiveConfigPayload, UserSettings } from '../src/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'ISOLATED',
  async main() {
    const currentHost = window.location.hostname;
    let settings = await getSettings();
    const bridge = new IPCBridge(false);
    let totalSessionSaved = 0;
    let heuristicSkipper: HeuristicSkipper | null = null;

    // Helper to send current active config to Main World
    const syncToMainWorld = (cfg: UserSettings) => {
      const isWhitelisted = Array.isArray(cfg.whitelist) && cfg.whitelist.includes(currentHost);
      const isSiteEnabled = !isWhitelisted;
      bridge.send<ActiveConfigPayload>('SYNC_CONFIG', {
        enabled: cfg.enabled,
        speedMultiplier: cfg.speedMultiplier,
        autoAccelerateVideoAds: cfg.autoAccelerateVideoAds,
        muteVideoAds: cfg.muteVideoAds,
        antiPauseSpoofing: cfg.antiPauseSpoofing,
        autoSkipShorteners: cfg.autoSkipShorteners,
        isCurrentSiteEnabled: isSiteEnabled,
      });
    };

    // 1. Initial config sync with Main World
    syncToMainWorld(settings);

    // 2. Helper to notify user and record stats
    const handleBypassNotification = async (label: string, seconds: number) => {
      totalSessionSaved += seconds;
      await recordBypass(seconds);

      if (settings.showToastNotification) {
        showToast(`⚡ ${label} (-${seconds}s)`);
      }

      // Notify background to update tab badge
      try {
        browser.runtime.sendMessage({
          type: 'UPDATE_BADGE',
          payload: { secondsSaved: totalSessionSaved },
        });
      } catch {}
    };

    // 3. Check YouTube redirect guard
    const isWhitelistedInitial = Array.isArray(settings.whitelist) && settings.whitelist.includes(currentHost);
    if (settings.enabled && !isWhitelistedInitial && settings.blockYouTubeRedirects) {
      const wasRedirected = checkAndHandleYouTubeRedirect({
        blockYouTubeRedirects: true,
        onBlock: (label, seconds) => {
          handleBypassNotification(label, seconds);
        },
      });
      if (wasRedirected) {
        return;
      }
    }

    // 4. Listen for events from Main World stealth hooks
    bridge.on('TIMER_ACCELERATED', (payload: { secondsSaved: number }) => {
      const isWhitelisted = Array.isArray(settings.whitelist) && settings.whitelist.includes(currentHost);
      if (settings.enabled && !isWhitelisted) {
        handleBypassNotification('Timer Accelerated', payload.secondsSaved || 10);
      }
    });

    bridge.on('VIDEO_AD_SKIPPED', (payload: { secondsSaved: number }) => {
      const isWhitelisted = Array.isArray(settings.whitelist) && settings.whitelist.includes(currentHost);
      if (settings.enabled && !isWhitelisted && settings.autoAccelerateVideoAds) {
        handleBypassNotification('Video Ad Skipped', payload.secondsSaved || 15);
      }
    });

    // 5. Recipe Engine Execution
    const startRecipesIfAllowed = () => {
      const isWhitelisted = Array.isArray(settings.whitelist) && settings.whitelist.includes(currentHost);
      if (!settings.enabled || isWhitelisted) return;

      const recipeEngine = new RecipeEngine();
      const matchingRecipes = recipeEngine.findMatchingRecipes(window.location.href);

      if (matchingRecipes.length > 0) {
        for (const recipe of matchingRecipes) {
          // Check if specific recipe type is disabled
          if (recipe.type === 'shortener' && !settings.autoSkipShorteners) continue;
          if (recipe.type === 'filehost' && !settings.autoSkipFileHosts) continue;
          if (recipe.type === 'video' && !settings.autoAccelerateVideoAds) continue;

          // Direct URL parameter extraction (e.g. ?url=...)
          const directUrl = recipeEngine.tryDirectExtract(recipe, window.location.href);
          if (directUrl) {
            handleBypassNotification('Direct Destination Found', 15);
            window.location.href = directUrl;
            return;
          }

          // Execute recipe steps when DOM is ready
          const runSteps = async () => {
            if (recipe.steps) {
              for (const step of recipe.steps) {
                await recipeEngine.executeStep(step);
              }
            }
          };

          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', runSteps);
          } else {
            runSteps();
          }
        }
      }
    };

    startRecipesIfAllowed();

    // 6. Start Heuristic Skipper for dynamic / unknown countdown gates
    heuristicSkipper = new HeuristicSkipper((label, secondsSaved) => {
      const isWhitelisted = Array.isArray(settings.whitelist) && settings.whitelist.includes(currentHost);
      if (settings.enabled && !isWhitelisted) {
        handleBypassNotification(label, secondsSaved);
      }
    });

    if (settings.enabled && !isWhitelistedInitial) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => heuristicSkipper?.start());
      } else {
        heuristicSkipper.start();
      }
    }

    // 7. Subscribe to runtime settings changes from popup
    subscribeToSettings((updated) => {
      settings = updated;
      syncToMainWorld(updated);

      const isWhitelisted = Array.isArray(updated.whitelist) && updated.whitelist.includes(currentHost);
      if (!updated.enabled || isWhitelisted) {
        heuristicSkipper?.stop();
      } else {
        heuristicSkipper?.start();
      }
    });

    // 8. Listen for runtime messages from Popup UI (e.g. Force Skip button)
    browser.runtime.onMessage.addListener((message: any) => {
      if (message && message.type === 'FORCE_SKIP_PAGE') {
        bridge.send('FORCE_SKIP');
        heuristicSkipper?.forceScanNow();
        handleBypassNotification('Manual Force Skip Triggered', 10);
      }
    });

    console.log('[Skip & Wait] Isolated world coordinator active.');
  },
});

