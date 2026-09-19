export interface MediaHookOptions {
  muteAds: boolean;
  onAdAccelerated?: (media: HTMLMediaElement) => void;
}

export function patchMediaAPIs(options: MediaHookOptions) {
  if ((window as any).__SKIP_AND_WAIT_MEDIA_PATCHED__) {
    return;
  }
  (window as any).__SKIP_AND_WAIT_MEDIA_PATCHED__ = true;

  const originalPlay = HTMLMediaElement.prototype.play;

  function isAdMedia(el: HTMLMediaElement): boolean {
    try {
      // YouTube ad detection
      const ytAdShowing = document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay');
      if (ytAdShowing) return true;

      // Generic video ad container checks
      if (
        el.closest('.video-ads, [class*="ad-container"], [class*="preroll"], [id*="ad-player"]') !== null
      ) {
        return true;
      }

      // Check if video duration is very short (typical for ads: < 60s) while parent or sibling has ad classes
      if (el.duration && el.duration <= 60) {
        const hasAdAncestor = !!el.closest('[class*="ad"], [id*="ad"]');
        if (hasAdAncestor) return true;
      }
    } catch {}
    return false;
  }

  function handleMediaElement(media: HTMLMediaElement) {
    if (!media || !(media instanceof HTMLMediaElement)) return;

    const checkAndAccelerate = () => {
      if (isAdMedia(media)) {
        // Boost playback rate to maximum allowed
        try {
          if (media.playbackRate < 16) {
            media.playbackRate = 16;
          }
          if (options.muteAds && !media.muted) {
            media.muted = true;
          }
          // Fast-forward toward the end to trigger natural ad completion
          if (isFinite(media.duration) && media.duration > 0 && media.currentTime < media.duration - 0.2) {
            media.currentTime = Math.max(0, media.duration - 0.1);
          }
          if (options.onAdAccelerated) {
            options.onAdAccelerated(media);
          }
        } catch {}
      }
    };

    // Listen to timeupdate to continuously enforce acceleration if ad is active
    media.addEventListener('timeupdate', checkAndAccelerate);
    media.addEventListener('loadedmetadata', checkAndAccelerate);
    media.addEventListener('play', checkAndAccelerate);
  }

  HTMLMediaElement.prototype.play = function () {
    handleMediaElement(this);
    return originalPlay.call(this);
  };

  // Check any existing media elements already in the DOM
  document.querySelectorAll('video, audio').forEach((el) => {
    if (el instanceof HTMLMediaElement) {
      handleMediaElement(el);
    }
  });
}
