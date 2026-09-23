export interface MediaHookOptions {
  muteAds: boolean;
  enabled?: boolean;
  onAdAccelerated?: (media: HTMLMediaElement) => void;
}

let activeOptions: MediaHookOptions = {
  muteAds: true,
  enabled: true,
};

const hookedMedia = new WeakSet<HTMLMediaElement>();
const notifiedMedia = new WeakSet<HTMLMediaElement>();

export function updateMediaHookOptions(options: Partial<MediaHookOptions>) {
  Object.assign(activeOptions, options);
}

export function getMediaHookOptions(): MediaHookOptions {
  return { ...activeOptions };
}

export function isAdMedia(el: HTMLMediaElement): boolean {
  try {
    // YouTube ad detection
    const ytAdShowing = document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay');
    if (ytAdShowing) return true;

    // Generic video ad container checks
    if (
      el.closest(
        '.video-ads, [class*="ad-container"], [class*="preroll"], [id*="ad-player"], .ytp-ad-module, [class*="ad-interrupting"]'
      ) !== null
    ) {
      return true;
    }

    // Check if video duration is short (typical for ads: <= 60s) with genuine ad ancestor
    if (el.duration && el.duration <= 60) {
      let current = el.parentElement;
      const adWordPattern = /\b(?:ad|ads|advert|preroll|midroll|sponsor|commercial)\b/i;
      const adPrefixPattern = /(?:^|[\s_-])ad(?:[\s_-]|$)/i;

      while (current && current !== document.body) {
        const classList = current.className && typeof current.className === 'string' ? current.className : '';
        const id = current.id || '';
        if (
          adWordPattern.test(classList) ||
          adPrefixPattern.test(classList) ||
          adWordPattern.test(id) ||
          adPrefixPattern.test(id)
        ) {
          return true;
        }
        current = current.parentElement;
      }
    }
  } catch {}
  return false;
}

export function patchMediaAPIs(options: MediaHookOptions) {
  Object.assign(activeOptions, options);

  if ((window as any).__SKIP_AND_WAIT_MEDIA_PATCHED__) {
    return;
  }
  (window as any).__SKIP_AND_WAIT_MEDIA_PATCHED__ = true;

  const originalPlay = HTMLMediaElement.prototype.play;

  function handleMediaElement(media: HTMLMediaElement) {
    if (!media || !(media instanceof HTMLMediaElement)) return;
    if (hookedMedia.has(media)) return;
    hookedMedia.add(media);

    const checkAndAccelerate = () => {
      if (activeOptions.enabled === false) return;

      if (isAdMedia(media)) {
        try {
          if (media.playbackRate < 16) {
            media.playbackRate = 16;
          }
          if (activeOptions.muteAds && !media.muted) {
            media.muted = true;
          }
          // Fast-forward toward the end to trigger natural ad completion
          if (isFinite(media.duration) && media.duration > 0 && media.currentTime < media.duration - 0.2) {
            media.currentTime = Math.max(0, media.duration - 0.1);
          }
          if (!notifiedMedia.has(media)) {
            notifiedMedia.add(media);
            if (activeOptions.onAdAccelerated) {
              activeOptions.onAdAccelerated(media);
            }
          }
        } catch {}
      } else {
        // Reset notification state when not in ad
        notifiedMedia.delete(media);
      }
    };

    // Reset notification state when media ends or source changes
    media.addEventListener('emptied', () => notifiedMedia.delete(media));
    media.addEventListener('ended', () => notifiedMedia.delete(media));

    // Listen to events to continuously enforce acceleration if ad is active
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

