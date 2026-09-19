import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HeuristicSkipper } from '../../src/core/engine/heuristic-skipper';

describe('HeuristicSkipper Universal Countdown & Ad Bypasser', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('detects and clicks modern YouTube ad skip button', () => {
    const skipBtn = document.createElement('button');
    skipBtn.className = 'ytp-ad-skip-button-modern';
    skipBtn.textContent = 'Skip';
    document.body.appendChild(skipBtn);

    let clicked = false;
    skipBtn.addEventListener('click', () => {
      clicked = true;
    });

    let bypassLabel = '';
    let bypassSeconds = 0;

    const skipper = new HeuristicSkipper((label, seconds) => {
      bypassLabel = label;
      bypassSeconds = seconds;
    });

    skipper.start();

    expect(clicked).toBe(true);
    expect(bypassLabel).toBe('Video Ad Skipped');
    expect(bypassSeconds).toBe(15);

    skipper.stop();
  });

  it('detects and clicks generic skip buttons matching aria-label', () => {
    const skipBtn = document.createElement('button');
    skipBtn.setAttribute('aria-label', 'Skip in 5s');
    document.body.appendChild(skipBtn);

    let clicked = false;
    skipBtn.addEventListener('click', () => {
      clicked = true;
    });

    const skipper = new HeuristicSkipper();
    skipper.start();

    expect(clicked).toBe(true);
    skipper.stop();
  });

  it('removes disabled state and restores pointer events on countdown buttons', () => {
    const button = document.createElement('button');
    button.setAttribute('disabled', 'true');
    button.className = 'disabled countdown-btn';
    button.textContent = 'Please wait 15 seconds...';
    document.body.appendChild(button);

    const skipper = new HeuristicSkipper();
    skipper.start();

    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.classList.contains('disabled')).toBe(false);
    expect(button.style.pointerEvents).toBe('auto');
    expect(button.style.cursor).toBe('pointer');

    skipper.stop();
  });

  it('auto-clicks unlocked button when countdown reaches 0', async () => {
    const button = document.createElement('button');
    button.className = 'download-btn disabled';
    button.textContent = 'Wait 0s';
    document.body.appendChild(button);

    let clicked = false;
    button.addEventListener('click', () => {
      clicked = true;
    });

    let bypassLabel = '';
    const skipper = new HeuristicSkipper((label) => {
      bypassLabel = label;
    });

    skipper.start();

    // Button click is scheduled with 300ms timeout
    await new Promise((r) => setTimeout(r, 350));

    expect(clicked).toBe(true);
    expect(bypassLabel).toBe('Unlocked & Clicked Button');

    skipper.stop();
  });

  it('immediately clicks countdown buttons when forceScanNow is invoked', () => {
    const button = document.createElement('button');
    button.setAttribute('disabled', 'true');
    button.textContent = 'Wait 30s';
    document.body.appendChild(button);

    let clicked = false;
    button.addEventListener('click', () => {
      clicked = true;
    });

    let savedSeconds = 0;
    const skipper = new HeuristicSkipper((label, sec) => {
      savedSeconds = sec;
    });

    skipper.forceScanNow();

    expect(clicked).toBe(true);
    expect(savedSeconds).toBe(30);
  });

  it('hides modal backdrop and timer overlays', () => {
    const overlay = document.createElement('div');
    overlay.className = 'overlay-timer';
    overlay.style.display = 'block';
    document.body.appendChild(overlay);

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.style.display = 'flex';
    document.body.appendChild(backdrop);

    const skipper = new HeuristicSkipper();
    skipper.start();

    expect(overlay.style.display).toBe('none');
    expect(backdrop.style.display).toBe('none');

    skipper.stop();
  });

  it('does not re-click or double-process already bypassed elements', () => {
    const skipBtn = document.createElement('button');
    skipBtn.className = 'ytp-ad-skip-button';
    document.body.appendChild(skipBtn);

    let clickCount = 0;
    skipBtn.addEventListener('click', () => {
      clickCount++;
    });

    const skipper = new HeuristicSkipper();
    skipper.start();
    expect(clickCount).toBe(1);

    // Triggering another scan should not click it again
    skipper.forceScanNow();
    expect(clickCount).toBe(1);

    skipper.stop();
  });

  it('reacts to DOM mutations dynamically', async () => {
    const skipper = new HeuristicSkipper();
    skipper.start();

    const lateButton = document.createElement('button');
    lateButton.className = 'download-btn';
    lateButton.setAttribute('disabled', 'true');
    lateButton.textContent = 'Wait 10 sec';

    document.body.appendChild(lateButton);

    // Wait for MutationObserver & requestAnimationFrame
    await new Promise((r) => setTimeout(r, 60));

    expect(lateButton.hasAttribute('disabled')).toBe(false);
    expect(lateButton.style.cursor).toBe('pointer');

    skipper.stop();
  });
});
