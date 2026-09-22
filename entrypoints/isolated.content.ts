import { IPCBridge } from '../src/core/ipc/bridge';
import { RecipeEngine } from '../src/recipes/engine';
import { HeuristicSkipper } from '../src/core/engine/heuristic-skipper';
import { showToast } from '../src/ui/toast';
import { getSettings, recordBypass } from '../src/storage';
import { checkAndHandleYouTubeRedirect } from '../src/core/engine/youtube-redirect-guard';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'ISOLATED',
  async main() {
    const currentHost = window.location.hostname;
    const settings = await getSettings();

    // Check if extension is globally enabled or whitelisted
    if (!settings.enabled) return;
    if (settings.whitelist && settings.whitelist.includes(currentHost)) {
      console.log(`[Skip & Wait] Domain ${currentHost} is whitelisted. Skipping.`);
      return;
    }

    const bridge = new IPCBridge(false);
    let totalSessionSaved = 0;

    // Helper to notify user and record stats
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

    // Check if redirected to YouTube from an external site, and auto-return if enabled
    const wasRedirected = checkAndHandleYouTubeRedirect({
      blockYouTubeRedirects: settings.blockYouTubeRedirects,
      onBlock: (label, seconds) => {
        handleBypassNotification(label, seconds);
      },
    });
    if (wasRedirected) {
      return;
    }

    // 1. Listen for events from Main World stealth hooks
    bridge.on('TIMER_ACCELERATED', (payload: { secondsSaved: number }) => {
      handleBypassNotification('Timer Accelerated', payload.secondsSaved || 10);
    });

    bridge.on('VIDEO_AD_SKIPPED', (payload: { secondsSaved: number }) => {
      handleBypassNotification('Video Ad Skipped', payload.secondsSaved || 15);
    });

    // 2. Execute Recipe Engine
    const recipeEngine = new RecipeEngine();
    const matchingRecipes = recipeEngine.findMatchingRecipes(window.location.href);

    if (matchingRecipes.length > 0) {
      for (const recipe of matchingRecipes) {
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

    // 3. Start Heuristic Skipper for dynamic / unknown pages
    const heuristicSkipper = new HeuristicSkipper((label, secondsSaved) => {
      handleBypassNotification(label, secondsSaved);
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => heuristicSkipper.start());
    } else {
      heuristicSkipper.start();
    }

    // 4. Listen for runtime messages from Popup UI (e.g. Force Skip button)
    browser.runtime.onMessage.addListener((message: any) => {
      if (message && message.type === 'FORCE_SKIP_PAGE') {
        bridge.send('FORCE_SKIP');
        heuristicSkipper.forceScanNow();
        handleBypassNotification('Manual Force Skip Triggered', 10);
      }
    });

    console.log('[Skip & Wait] Isolated world coordinator active.');
  },
});
