export const EXCLUDED_REFERRER_PATTERNS: RegExp[] = [
  /(?:^|\.)google\./i,
  /(?:^|\.)bing\.com$/i,
  /(?:^|\.)duckduckgo\.com$/i,
  /(?:^|\.)yahoo\.com$/i,
  /(?:^|\.)ecosia\.org$/i,
  /(?:^|\.)reddit\.com$/i,
  /(?:^|\.)twitter\.com$/i,
  /(?:^|\.)x\.com$/i,
  /(?:^|\.)facebook\.com$/i,
  /(?:^|\.)instagram\.com$/i,
  /(?:^|\.)linkedin\.com$/i,
  /(?:^|\.)t\.co$/i,
];

export function isYouTubeHost(hostname: string): boolean {
  return /(?:^|\.)(?:youtube\.com|youtu\.be)$/i.test(hostname);
}

export function isExemptReferrer(referrerHost: string): boolean {
  return EXCLUDED_REFERRER_PATTERNS.some((pattern) => pattern.test(referrerHost));
}

export interface RedirectGuardOptions {
  currentHostname?: string;
  referrer?: string;
  blockYouTubeRedirects: boolean;
  onBlock?: (label: string, secondsSaved: number) => void;
}

export function checkAndHandleYouTubeRedirect(options: RedirectGuardOptions): boolean {
  if (!options.blockYouTubeRedirects) {
    return false;
  }

  const currentHost = options.currentHostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  if (!isYouTubeHost(currentHost)) {
    return false;
  }

  const referrer = options.referrer ?? (typeof document !== 'undefined' ? document.referrer : '');
  if (!referrer) {
    return false;
  }

  let refUrl: URL;
  try {
    refUrl = new URL(referrer);
  } catch {
    return false;
  }

  // If referrer is YouTube itself, it's normal internal navigation
  if (isYouTubeHost(refUrl.hostname)) {
    return false;
  }

  // If referrer is an intentional source like Google Search, Reddit, or Twitter, do not block
  if (isExemptReferrer(refUrl.hostname)) {
    return false;
  }

  // Anti-loop protection: prevent infinite ping-pong bounce within 4 seconds
  const LOOP_KEY = '__skip_and_wait_yt_redirect_ts__';
  try {
    if (typeof sessionStorage !== 'undefined') {
      const lastBounce = sessionStorage.getItem(LOOP_KEY);
      if (lastBounce && Date.now() - parseInt(lastBounce, 10) < 4000) {
        console.warn('[Skip & Wait] Suppressing YouTube auto-return loop.');
        return false;
      }
      sessionStorage.setItem(LOOP_KEY, String(Date.now()));
    }
  } catch {}

  // Trigger notification callback
  if (options.onBlock) {
    options.onBlock('Blocked YouTube Redirect (Returning to previous page)', 5);
  }

  // Return to previous page
  if (typeof window !== 'undefined') {
    if (window.history && window.history.length > 1) {
      window.history.back();
    } else if (referrer) {
      window.location.href = referrer;
    }
  }

  return true;
}
