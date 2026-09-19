import type { SkipRecipe, RecipeStep } from '../types';
import { BUILTIN_RECIPES } from './recipes';

export class RecipeEngine {
  private recipes: SkipRecipe[];

  constructor(customRecipes: SkipRecipe[] = []) {
    this.recipes = [...BUILTIN_RECIPES, ...customRecipes];
  }

  public findMatchingRecipes(url: string): SkipRecipe[] {
    return this.recipes.filter((recipe) => {
      return recipe.hostPatterns.some((pattern) => {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(url);
        } catch {
          return url.toLowerCase().includes(pattern.toLowerCase());
        }
      });
    });
  }

  public tryDirectExtract(recipe: SkipRecipe, currentUrl: string): string | null {
    if (!recipe.directExtract) return null;

    try {
      const parsed = new URL(currentUrl);
      const param = recipe.directExtract.queryParam;

      if (param && parsed.searchParams.has(param)) {
        let value = parsed.searchParams.get(param) || '';
        if (recipe.directExtract.decodeBase64) {
          try {
            value = atob(value);
          } catch {
            // Not valid base64, keep raw string
          }
        }
        if (value.startsWith('http://') || value.startsWith('https://')) {
          return value;
        }
      }

      if (recipe.directExtract.regexPattern) {
        const regex = new RegExp(recipe.directExtract.regexPattern, 'i');
        const match = currentUrl.match(regex);
        if (match && match[1]) {
          return match[1];
        }
      }
    } catch (e) {
      console.error('[Skip & Wait Recipe Engine] Direct extract failed:', e);
    }
    return null;
  }

  public async executeStep(step: RecipeStep): Promise<boolean> {
    const { action, targetSelector, delayMs = 0 } = step;

    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }

    if (!targetSelector) return false;

    const el = document.querySelector<HTMLElement>(targetSelector);
    if (!el) return false;

    switch (action) {
      case 'unhide': {
        el.style.display = 'block';
        el.style.visibility = 'visible';
        el.style.opacity = '1';
        el.removeAttribute('disabled');
        el.classList.remove('disabled');
        return true;
      }
      case 'click': {
        el.removeAttribute('disabled');
        el.classList.remove('disabled');
        el.style.pointerEvents = 'auto';

        // Synthesize trusted-like mouse events
        const rect = el.getBoundingClientRect();
        const clientX = rect.left + rect.width / 2;
        const clientY = rect.top + rect.height / 2;

        ['mousedown', 'mouseup', 'click'].forEach((type) => {
          el.dispatchEvent(
            new MouseEvent(type, {
              bubbles: true,
              cancelable: true,
              view: window,
              clientX,
              clientY,
            })
          );
        });
        return true;
      }
      case 'redirect': {
        if (step.attributeSource) {
          const dest = el.getAttribute(step.attributeSource);
          if (dest && (dest.startsWith('http://') || dest.startsWith('https://'))) {
            window.location.href = dest;
            return true;
          }
        }
        return false;
      }
      default:
        return false;
    }
  }
}
