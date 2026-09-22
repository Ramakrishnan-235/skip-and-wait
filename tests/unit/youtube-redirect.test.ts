import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkAndHandleYouTubeRedirect,
  isYouTubeHost,
  isExemptReferrer,
} from '../../src/core/engine/youtube-redirect-guard';

describe('YouTube Redirect Guard & Auto-Return', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('Host and Referrer Classification', () => {
    it('correctly identifies YouTube hostnames', () => {
      expect(isYouTubeHost('youtube.com')).toBe(true);
      expect(isYouTubeHost('www.youtube.com')).toBe(true);
      expect(isYouTubeHost('m.youtube.com')).toBe(true);
      expect(isYouTubeHost('youtu.be')).toBe(true);

      expect(isYouTubeHost('notyoutube.com')).toBe(false);
      expect(isYouTubeHost('myoutube.com.fake.org')).toBe(false);
      expect(isYouTubeHost('google.com')).toBe(false);
      expect(isYouTubeHost('rapidgator.net')).toBe(false);
    });

    it('identifies search engines and major social platforms as exempt referrers', () => {
      expect(isExemptReferrer('google.com')).toBe(true);
      expect(isExemptReferrer('www.google.co.uk')).toBe(true);
      expect(isExemptReferrer('bing.com')).toBe(true);
      expect(isExemptReferrer('duckduckgo.com')).toBe(true);
      expect(isExemptReferrer('reddit.com')).toBe(true);
      expect(isExemptReferrer('twitter.com')).toBe(true);
      expect(isExemptReferrer('x.com')).toBe(true);
      expect(isExemptReferrer('t.co')).toBe(true);

      expect(isExemptReferrer('shrinkme.io')).toBe(false);
      expect(isExemptReferrer('linkvertise.com')).toBe(false);
      expect(isExemptReferrer('adf.ly')).toBe(false);
      expect(isExemptReferrer('rapidgator.net')).toBe(false);
      expect(isExemptReferrer('unknown-ad-server.net')).toBe(false);
    });
  });

  describe('Redirect Interception & Navigation', () => {
    it('does nothing when blockYouTubeRedirects is false', () => {
      let blocked = false;
      const result = checkAndHandleYouTubeRedirect({
        currentHostname: 'www.youtube.com',
        referrer: 'https://shrinkme.io/download',
        blockYouTubeRedirects: false,
        onBlock: () => {
          blocked = true;
        },
      });

      expect(result).toBe(false);
      expect(blocked).toBe(false);
    });

    it('does nothing when current site is not YouTube', () => {
      const result = checkAndHandleYouTubeRedirect({
        currentHostname: 'rapidgator.net',
        referrer: 'https://linkvertise.com/file',
        blockYouTubeRedirects: true,
      });

      expect(result).toBe(false);
    });

    it('does nothing when there is no referrer (direct URL entry)', () => {
      const result = checkAndHandleYouTubeRedirect({
        currentHostname: 'www.youtube.com',
        referrer: '',
        blockYouTubeRedirects: true,
      });

      expect(result).toBe(false);
    });

    it('does nothing when navigating internally within YouTube', () => {
      const result = checkAndHandleYouTubeRedirect({
        currentHostname: 'www.youtube.com',
        referrer: 'https://www.youtube.com/watch?v=sample',
        blockYouTubeRedirects: true,
      });

      expect(result).toBe(false);
    });

    it('does not block intentional YouTube visits from Google Search', () => {
      let blocked = false;
      const result = checkAndHandleYouTubeRedirect({
        currentHostname: 'www.youtube.com',
        referrer: 'https://www.google.com/search?q=funny+cats',
        blockYouTubeRedirects: true,
        onBlock: () => {
          blocked = true;
        },
      });

      expect(result).toBe(false);
      expect(blocked).toBe(false);
    });

    it('intercepts redirect from link shortener and calls history.back() when history is present', () => {
      let onBlockCalled = false;
      let labelReceived = '';
      let secondsSaved = 0;

      const historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
      Object.defineProperty(window.history, 'length', { value: 3, configurable: true });

      const result = checkAndHandleYouTubeRedirect({
        currentHostname: 'www.youtube.com',
        referrer: 'https://shrinkme.io/ad-gateway',
        blockYouTubeRedirects: true,
        onBlock: (label, sec) => {
          onBlockCalled = true;
          labelReceived = label;
          secondsSaved = sec;
        },
      });

      expect(result).toBe(true);
      expect(onBlockCalled).toBe(true);
      expect(labelReceived).toContain('Blocked YouTube Redirect');
      expect(secondsSaved).toBe(5);
      expect(historyBackSpy).toHaveBeenCalledTimes(1);

      historyBackSpy.mockRestore();
    });

    it('falls back to window.location.href when history.length is 1', () => {
      Object.defineProperty(window.history, 'length', { value: 1, configurable: true });

      const originalHref = window.location.href;
      const targetReferrer = 'https://rapidgator.net/file/123';

      const result = checkAndHandleYouTubeRedirect({
        currentHostname: 'www.youtube.com',
        referrer: targetReferrer,
        blockYouTubeRedirects: true,
      });

      expect(result).toBe(true);
      expect(window.location.href).toBe(targetReferrer);

      window.location.href = originalHref;
    });

    it('suppresses infinite redirect loop within 4 seconds via sessionStorage', () => {
      const historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
      Object.defineProperty(window.history, 'length', { value: 2, configurable: true });

      // First redirect: accepted
      const firstResult = checkAndHandleYouTubeRedirect({
        currentHostname: 'www.youtube.com',
        referrer: 'https://shortener.com/gate',
        blockYouTubeRedirects: true,
      });
      expect(firstResult).toBe(true);
      expect(historyBackSpy).toHaveBeenCalledTimes(1);

      // Immediate second redirect: suppressed by loop guard
      const secondResult = checkAndHandleYouTubeRedirect({
        currentHostname: 'www.youtube.com',
        referrer: 'https://shortener.com/gate',
        blockYouTubeRedirects: true,
      });
      expect(secondResult).toBe(false);
      expect(historyBackSpy).toHaveBeenCalledTimes(1); // Not called again

      historyBackSpy.mockRestore();
    });
  });
});
