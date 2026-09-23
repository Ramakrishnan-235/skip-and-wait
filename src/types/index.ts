export interface UserSettings {
  enabled: boolean;
  autoSkipShorteners: boolean;
  autoSkipFileHosts: boolean;
  autoAccelerateVideoAds: boolean;
  speedMultiplier: number;
  muteVideoAds: boolean;
  showToastNotification: boolean;
  antiPauseSpoofing: boolean;
  blockYouTubeRedirects: boolean; // Auto-return when an external site redirects to YouTube
  whitelist: string[]; // List of domains where the extension is disabled
  blacklist: string[]; // List of domains where aggressive mode is enabled
}

export interface SkipStats {
  totalSecondsSaved: number;
  totalLinksBypassed: number;
  todaySecondsSaved: number;
  todayLinksBypassed: number;
  lastResetDate: string; // YYYY-MM-DD
}

export type RecipeType = 'shortener' | 'filehost' | 'video' | 'redirect' | 'generic';

export interface RecipeStep {
  action: 'click' | 'accelerate' | 'extractUrl' | 'unhide' | 'redirect';
  targetSelector?: string;
  waitForSelector?: string;
  attributeSource?: string; // 'href', 'data-url', 'data-href'
  delayMs?: number;
  value?: string;
}

export interface SkipRecipe {
  id: string;
  name: string;
  type: RecipeType;
  hostPatterns: string[]; // Regex strings or domain substrings
  steps?: RecipeStep[];
  directExtract?: {
    queryParam?: string; // e.g., 'dest', 'r', 'url'
    regexPattern?: string;
    decodeBase64?: boolean;
  };
  customJsSnippet?: string;
}

export type IPCMessageType =
  | 'BYPASS_TRIGGERED'
  | 'TIMER_ACCELERATED'
  | 'VIDEO_AD_SKIPPED'
  | 'FORCE_SKIP'
  | 'SYNC_CONFIG'
  | 'TOAST_NOTIFY';

export interface IPCMessage<T = any> {
  source: 'SKIP_AND_WAIT_MAIN' | 'SKIP_AND_WAIT_ISOLATED';
  type: IPCMessageType;
  payload?: T;
}

export interface ActiveConfigPayload {
  enabled: boolean;
  speedMultiplier: number;
  autoAccelerateVideoAds: boolean;
  muteVideoAds: boolean;
  antiPauseSpoofing: boolean;
  autoSkipShorteners: boolean;
  isCurrentSiteEnabled: boolean;
}
