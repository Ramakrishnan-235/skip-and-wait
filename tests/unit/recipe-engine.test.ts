import { describe, it, expect } from 'vitest';
import { RecipeEngine } from '../../src/recipes/engine';
import { BUILTIN_RECIPES } from '../../src/recipes/recipes';

describe('RecipeEngine', () => {
  const engine = new RecipeEngine();

  it('correctly matches YouTube URLs', () => {
    const recipes = engine.findMatchingRecipes('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(recipes.length).toBeGreaterThan(0);
    expect(recipes[0]?.id).toBe('youtube-ad-skipper');
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

  it('returns null for unrelated URLs', () => {
    const recipes = engine.findMatchingRecipes('https://wikipedia.org/wiki/Main_Page');
    expect(recipes.length).toBe(0);
  });
});
