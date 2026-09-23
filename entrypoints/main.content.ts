import { patchTimerAPIs, updateTimerHookOptions } from '../src/core/hooks/timer-hook';
import { patchMediaAPIs, updateMediaHookOptions } from '../src/core/hooks/media-hook';
import { patchVisibilityAPIs, updateVisibilityHookOptions } from '../src/core/hooks/visibility-hook';
import { IPCBridge } from '../src/core/ipc/bridge';
import type { ActiveConfigPayload } from '../src/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    const bridge = new IPCBridge(true);

    // 1. Initialize stealth timer hook
    patchTimerAPIs({
      speedMultiplier: 10,
      enabled: true,
      onAccelerate: (orig, scaled) => {
        const saved = Math.round((orig - scaled) / 1000);
        if (saved > 1) {
          bridge.send('TIMER_ACCELERATED', { secondsSaved: saved });
        }
      },
    });

    // 2. Initialize video ad speedup & mute hook
    patchMediaAPIs({
      muteAds: true,
      enabled: true,
      onAdAccelerated: () => {
        bridge.send('VIDEO_AD_SKIPPED', { secondsSaved: 15 });
      },
    });

    // 3. Initialize anti-pause tab visibility spoofing
    patchVisibilityAPIs(true);

    // 4. Synchronize settings dynamically from isolated world
    bridge.on<ActiveConfigPayload>('SYNC_CONFIG', (config) => {
      if (!config) return;
      const isOverallActive = config.enabled && config.isCurrentSiteEnabled;

      updateTimerHookOptions({
        enabled: isOverallActive && config.autoSkipShorteners,
        speedMultiplier: config.speedMultiplier,
      });

      updateMediaHookOptions({
        enabled: isOverallActive && config.autoAccelerateVideoAds,
        muteAds: config.muteVideoAds,
      });

      updateVisibilityHookOptions(isOverallActive && config.antiPauseSpoofing);
    });

    // 5. Listen for manual force-skip signals from isolated world
    bridge.on('FORCE_SKIP', () => {
      try {
        if ((window as any).__skip_and_wait_fast_forward_all) {
          (window as any).__skip_and_wait_fast_forward_all();
        }
        document.querySelectorAll('video').forEach((v) => {
          if (v instanceof HTMLMediaElement && !v.paused) {
            v.playbackRate = 16;
            if (v.duration) {
              v.currentTime = v.duration;
            }
          }
        });
      } catch (e) {
        console.error('[Skip & Wait Main] Force skip error:', e);
      }
    });

    console.log('[Skip & Wait] Main world stealth hooks successfully attached.');
  },
});

