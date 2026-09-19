import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { patchMediaAPIs } from '../../src/core/hooks/media-hook';

describe('Media Hook Ad Acceleration', () => {
  let originalPlay: typeof HTMLMediaElement.prototype.play;

  beforeEach(() => {
    delete (window as any).__SKIP_AND_WAIT_MEDIA_PATCHED__;
    originalPlay = HTMLMediaElement.prototype.play;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    HTMLMediaElement.prototype.play = originalPlay;
    delete (window as any).__SKIP_AND_WAIT_MEDIA_PATCHED__;
    document.body.innerHTML = '';
  });

  it('accelerates YouTube ad video when ad overlay class exists', () => {
    const adIndicator = document.createElement('div');
    adIndicator.className = 'ad-showing';
    document.body.appendChild(adIndicator);

    const video = document.createElement('video');
    Object.defineProperty(video, 'duration', { value: 30, writable: true });
    video.currentTime = 0;
    video.playbackRate = 1;
    video.muted = false;
    document.body.appendChild(video);

    let accelerated = false;
    patchMediaAPIs({
      muteAds: true,
      onAdAccelerated: (el) => {
        accelerated = true;
      },
    });

    // Calling play triggers handleMediaElement and checkAndAccelerate
    video.play();

    expect(video.playbackRate).toBe(16);
    expect(video.muted).toBe(true);
    expect(video.currentTime).toBeCloseTo(29.9, 1);
    expect(accelerated).toBe(true);
  });

  it('accelerates video nested in .video-ads container', () => {
    const container = document.createElement('div');
    container.className = 'video-ads';
    const video = document.createElement('video');
    Object.defineProperty(video, 'duration', { value: 15, writable: true });
    video.currentTime = 0;
    container.appendChild(video);
    document.body.appendChild(container);

    let accelerated = false;
    patchMediaAPIs({
      muteAds: true,
      onAdAccelerated: () => {
        accelerated = true;
      },
    });

    video.dispatchEvent(new Event('timeupdate'));

    expect(video.playbackRate).toBe(16);
    expect(video.muted).toBe(true);
    expect(video.currentTime).toBeCloseTo(14.9, 1);
    expect(accelerated).toBe(true);
  });

  it('does not alter normal, non-ad videos', () => {
    const video = document.createElement('video');
    Object.defineProperty(video, 'duration', { value: 300, writable: true });
    video.currentTime = 10;
    video.playbackRate = 1;
    video.muted = false;
    document.body.appendChild(video);

    let accelerated = false;
    patchMediaAPIs({
      muteAds: true,
      onAdAccelerated: () => {
        accelerated = true;
      },
    });

    video.play();
    video.dispatchEvent(new Event('timeupdate'));

    expect(video.playbackRate).toBe(1);
    expect(video.muted).toBe(false);
    expect(video.currentTime).toBe(10);
    expect(accelerated).toBe(false);
  });

  it('respects muteAds: false option', () => {
    const adIndicator = document.createElement('div');
    adIndicator.className = 'ytp-ad-player-overlay';
    document.body.appendChild(adIndicator);

    const video = document.createElement('video');
    Object.defineProperty(video, 'duration', { value: 20, writable: true });
    video.muted = false;
    document.body.appendChild(video);

    patchMediaAPIs({ muteAds: false });

    video.play();

    expect(video.playbackRate).toBe(16);
    expect(video.muted).toBe(false);
  });

  it('attaches to existing media elements on initial patch', () => {
    const video = document.createElement('video');
    const adContainer = document.createElement('div');
    adContainer.className = 'preroll-ad';
    adContainer.appendChild(video);
    document.body.appendChild(adContainer);

    Object.defineProperty(video, 'duration', { value: 15, writable: true });

    let accelerated = false;
    patchMediaAPIs({
      muteAds: true,
      onAdAccelerated: () => {
        accelerated = true;
      },
    });

    video.dispatchEvent(new Event('play'));
    expect(video.playbackRate).toBe(16);
    expect(accelerated).toBe(true);
  });

  it('prevents double patching if already initialized', () => {
    patchMediaAPIs({ muteAds: true });
    const patchedPlay = HTMLMediaElement.prototype.play;

    patchMediaAPIs({ muteAds: false });
    expect(HTMLMediaElement.prototype.play).toBe(patchedPlay);
  });
});
