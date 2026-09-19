import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RecipeEngine } from '../../src/recipes/engine';
import { BUILTIN_RECIPES } from '../../src/recipes/recipes';
import type { SkipRecipe } from '../../src/types';

describe('RecipeEngine and Recipe Catalogue', () => {
  const engine = new RecipeEngine();

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('correctly matches YouTube URLs', () => {
    const recipes = engine.findMatchingRecipes('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(recipes.length).toBeGreaterThan(0);
    expect(recipes[0]?.id).toBe('youtube-ad-skipper');

    const shortRecipes = engine.findMatchingRecipes('https://youtu.be/dQw4w9WgXcQ');
    expect(shortRecipes.some((r) => r.id === 'youtube-ad-skipper')).toBe(true);
  });

  it('correctly matches Rapidgator URLs', () => {
    const recipes = engine.findMatchingRecipes('https://rapidgator.net/file/123456/sample.zip.html');
    expect(recipes.length).toBeGreaterThan(0);
    expect(recipes.some((r) => r.id === 'rapidgator-filehost')).toBe(true);
  });

  it('correctly matches DDownload URLs', () => {
    const recipes = engine.findMatchingRecipes('https://ddownload.com/abc123xyz');
    expect(recipes.length).toBeGreaterThan(0);
    expect(recipes.some((r) => r.id === 'ddownload-filehost')).toBe(true);
  });

  it('correctly matches Adfly-style shortener URLs', () => {
    const adflyUrls = [
      'https://adf.ly/12345',
      'https://ay.gy/abcdef',
      'https://j.gs/9999',
      'https://q.gs/54321',
    ];

    adflyUrls.forEach((url) => {
      const recipes = engine.findMatchingRecipes(url);
      expect(recipes.some((r) => r.id === 'adfly-style-shorteners')).toBe(true);
    });
  });

  it('correctly matches ShrinkMe and safelink domains', () => {
    const shrinkmeUrls = [
      'https://shrinkme.io/download123',
      'https://shrinke.me/bypass',
      'https://clik.pw/fast',
      'https://zagl.info/gate',
    ];

    shrinkmeUrls.forEach((url) => {
      const recipes = engine.findMatchingRecipes(url);
      expect(recipes.some((r) => r.id === 'shrinkme-style-shortener')).toBe(true);
    });
  });

  it('correctly matches Katfile and MediaFire URLs', () => {
    const katfile = engine.findMatchingRecipes('https://katfile.com/xyz123');
    expect(katfile.some((r) => r.id === 'katfile-filehost')).toBe(true);

    const mediafire = engine.findMatchingRecipes('https://mediafire.com/file/abc1234');
    expect(mediafire.some((r) => r.id === 'mediafire-autoclick')).toBe(true);
  });

  it('extracts direct target URL from query parameter', () => {
    const recipe = BUILTIN_RECIPES.find((r) => r.id === 'generic-query-redirect');
    expect(recipe).toBeDefined();

    const targetUrl = 'https://target-destination.com/download';
    const testUrl = `https://linkvertise.com/bypass?url=${encodeURIComponent(targetUrl)}`;
    const extracted = engine.tryDirectExtract(recipe!, testUrl);
    expect(extracted).toBe(targetUrl);
  });

  it('extracts base64 encoded direct target URL from query parameter', () => {
    const recipe = BUILTIN_RECIPES.find((r) => r.id === 'generic-query-redirect');
    expect(recipe).toBeDefined();

    const targetUrl = 'https://destination-site.org/file';
    const base64Url = btoa(targetUrl);
    const testUrl = `https://ouo.io/go?url=${base64Url}`;
    const extracted = engine.tryDirectExtract(recipe!, testUrl);
    expect(extracted).toBe(targetUrl);
  });

  it('extracts target URL using regexPattern when specified in recipe', () => {
    const customRecipe: SkipRecipe = {
      id: 'custom-regex-extractor',
      name: 'Custom Regex Recipe',
      type: 'redirect',
      hostPatterns: ['example\\.com'],
      directExtract: {
        regexPattern: 'target=(https?://[^&]+)',
      },
    };

    const extracted = engine.tryDirectExtract(
      customRecipe,
      'https://example.com/gate?source=ref&target=https://destination.org/final'
    );
    expect(extracted).toBe('https://destination.org/final');
  });

  it('returns null for unrelated URLs', () => {
    const recipes = engine.findMatchingRecipes('https://wikipedia.org/wiki/Main_Page');
    expect(recipes.length).toBe(0);
  });

  it('executes "unhide" step and sets element visible', async () => {
    const hiddenBtn = document.createElement('button');
    hiddenBtn.id = 'downloadbtn';
    hiddenBtn.style.display = 'none';
    hiddenBtn.style.visibility = 'hidden';
    hiddenBtn.style.opacity = '0';
    hiddenBtn.setAttribute('disabled', 'true');
    hiddenBtn.className = 'disabled';
    document.body.appendChild(hiddenBtn);

    const success = await engine.executeStep({
      action: 'unhide',
      targetSelector: '#downloadbtn',
    });

    expect(success).toBe(true);
    expect(hiddenBtn.style.display).toBe('block');
    expect(hiddenBtn.style.visibility).toBe('visible');
    expect(hiddenBtn.style.opacity).toBe('1');
    expect(hiddenBtn.hasAttribute('disabled')).toBe(false);
    expect(hiddenBtn.classList.contains('disabled')).toBe(false);
  });

  it('executes "click" step with synthetic mouse events', async () => {
    const btn = document.createElement('button');
    btn.id = 'target-btn';
    btn.setAttribute('disabled', 'true');
    btn.className = 'disabled';
    document.body.appendChild(btn);

    const eventSequence: string[] = [];
    ['mousedown', 'mouseup', 'click'].forEach((evt) => {
      btn.addEventListener(evt, () => eventSequence.push(evt));
    });

    const success = await engine.executeStep({
      action: 'click',
      targetSelector: '#target-btn',
    });

    expect(success).toBe(true);
    expect(btn.hasAttribute('disabled')).toBe(false);
    expect(eventSequence).toEqual(['mousedown', 'mouseup', 'click']);
  });

  it('executes "redirect" step by reading attributeSource', async () => {
    const link = document.createElement('a');
    link.id = 'final-link';
    link.setAttribute('data-target-url', 'https://example.com/download.zip');
    document.body.appendChild(link);

    const originalLocation = window.location.href;

    const success = await engine.executeStep({
      action: 'redirect',
      targetSelector: '#final-link',
      attributeSource: 'data-target-url',
    });

    expect(success).toBe(true);
    expect(window.location.href).toBe('https://example.com/download.zip');

    window.location.href = originalLocation;
  });

  it('returns false gracefully if selector does not exist', async () => {
    const success = await engine.executeStep({
      action: 'click',
      targetSelector: '#non-existent-button',
    });

    expect(success).toBe(false);
  });
});
