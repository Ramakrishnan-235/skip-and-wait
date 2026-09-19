import React, { useEffect, useState } from 'react';
import {
  Zap,
  FastForward,
  Clock,
  Shield,
  Video,
  VolumeX,
  FileDown,
  Globe,
  CheckCircle2,
  ExternalLink,
  Power
} from 'lucide-react';
import type { UserSettings, SkipStats } from '../../src/types';
import { DEFAULT_SETTINGS, DEFAULT_STATS } from '../../src/storage/defaults';
import { getSettings, saveSettings, getStats } from '../../src/storage';
import './style.css';

export default function App() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<SkipStats>(DEFAULT_STATS);
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [isForceSkipping, setIsForceSkipping] = useState(false);

  useEffect(() => {
    // Load current configuration and stats
    getSettings().then(setSettings);
    getStats().then(setStats);

    // Query active tab
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]?.url) {
        try {
          const url = new URL(tabs[0].url);
          setCurrentDomain(url.hostname);
          setActiveTabId(tabs[0].id || null);
        } catch {
          setCurrentDomain('');
        }
      }
    });
  }, []);

  const toggleMaster = async () => {
    const updated = await saveSettings({ enabled: !settings.enabled });
    setSettings(updated);
  };

  const toggleFeature = async (key: keyof UserSettings) => {
    const updated = await saveSettings({ [key]: !settings[key] });
    setSettings(updated);
  };

  const isCurrentDomainWhitelisted = settings.whitelist.includes(currentDomain);

  const toggleCurrentSite = async () => {
    if (!currentDomain) return;
    let newWhitelist = [...settings.whitelist];
    if (isCurrentDomainWhitelisted) {
      newWhitelist = newWhitelist.filter((d) => d !== currentDomain);
    } else {
      newWhitelist.push(currentDomain);
    }
    const updated = await saveSettings({ whitelist: newWhitelist });
    setSettings(updated);
  };

  const handleForceSkip = async () => {
    if (!activeTabId) return;
    setIsForceSkipping(true);
    try {
      await browser.tabs.sendMessage(activeTabId, { type: 'FORCE_SKIP_PAGE' });
    } catch (e) {
      console.warn('Tab message failed, page may not have content script ready:', e);
    }
    setTimeout(() => setIsForceSkipping(false), 800);
  };

  const formatSeconds = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const rem = seconds % 60;
    if (mins < 60) return `${mins}m ${rem}s`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  return (
    <div className="popup-container">
      {/* Header */}
      <header className="header">
        <div className="brand-wrapper">
          <div className="brand-icon">
            <Zap size={18} />
          </div>
          <div>
            <div className="brand-title">Skip & Wait</div>
            <span className="brand-version">v1.0.0</span>
          </div>
        </div>

        <button
          className={`power-toggle-btn ${settings.enabled ? 'active' : ''}`}
          onClick={toggleMaster}
          title={settings.enabled ? 'Click to Pause' : 'Click to Enable'}
        >
          <span className="power-indicator" />
          <Power size={13} />
          <span>{settings.enabled ? 'Active' : 'Paused'}</span>
        </button>
      </header>

      {/* Stats Counter Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <Clock size={15} color="#10b981" />
          <span className="stat-value">{formatSeconds(stats.todaySecondsSaved)}</span>
          <span className="stat-label">Today Saved</span>
        </div>
        <div className="stat-card">
          <Zap size={15} color="#06b6d4" />
          <span className="stat-value">{stats.todayLinksBypassed}</span>
          <span className="stat-label">Bypasses</span>
        </div>
        <div className="stat-card">
          <FastForward size={15} color="#8b5cf6" />
          <span className="stat-value">{formatSeconds(stats.totalSecondsSaved)}</span>
          <span className="stat-label">All-Time</span>
        </div>
      </div>

      {/* Current Site Action Card */}
      {currentDomain && (
        <div className="site-card">
          <div className="site-header">
            <div className="site-host-info">
              <Globe size={14} color="#94a3b8" />
              <span className="site-host" title={currentDomain}>
                {currentDomain}
              </span>
            </div>
            <label className="switch" title="Toggle extension on this site">
              <input
                type="checkbox"
                checked={!isCurrentDomainWhitelisted}
                onChange={toggleCurrentSite}
              />
              <span className="slider" />
            </label>
          </div>

          <button
            className="force-skip-btn"
            onClick={handleForceSkip}
            disabled={isForceSkipping}
          >
            <Zap size={14} />
            <span>{isForceSkipping ? 'Fast-Forwarding...' : 'Force Skip Page Timers'}</span>
          </button>
        </div>
      )}

      {/* Quick Module Options */}
      <div className="options-section">
        <div className="section-title">Automations</div>

        <div
          className="toggle-item"
          onClick={() => toggleFeature('autoSkipShorteners')}
        >
          <div className="toggle-info">
            <FastForward size={15} color="#10b981" />
            <div>
              <div className="toggle-title">Link Shorteners</div>
              <div className="toggle-desc">Bypass ad-shorteners and safelinks</div>
            </div>
          </div>
          <label className="switch" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={settings.autoSkipShorteners}
              onChange={() => toggleFeature('autoSkipShorteners')}
            />
            <span className="slider" />
          </label>
        </div>

        <div
          className="toggle-item"
          onClick={() => toggleFeature('autoSkipFileHosts')}
        >
          <div className="toggle-info">
            <FileDown size={15} color="#06b6d4" />
            <div>
              <div className="toggle-title">File Hosting Gates</div>
              <div className="toggle-desc">Reduce free-tier countdown delays</div>
            </div>
          </div>
          <label className="switch" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={settings.autoSkipFileHosts}
              onChange={() => toggleFeature('autoSkipFileHosts')}
            />
            <span className="slider" />
          </label>
        </div>

        <div
          className="toggle-item"
          onClick={() => toggleFeature('autoAccelerateVideoAds')}
        >
          <div className="toggle-info">
            <Video size={15} color="#f59e0b" />
            <div>
              <div className="toggle-title">Video Ad Acceleration</div>
              <div className="toggle-desc">16x speedup & auto-skip on YouTube</div>
            </div>
          </div>
          <label className="switch" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={settings.autoAccelerateVideoAds}
              onChange={() => toggleFeature('autoAccelerateVideoAds')}
            />
            <span className="slider" />
          </label>
        </div>

        <div
          className="toggle-item"
          onClick={() => toggleFeature('antiPauseSpoofing')}
        >
          <div className="toggle-info">
            <Shield size={15} color="#a855f7" />
            <div>
              <div className="toggle-title">Anti-Pause Tab Spoofing</div>
              <div className="toggle-desc">Prevent timers from freezing in background</div>
            </div>
          </div>
          <label className="switch" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={settings.antiPauseSpoofing}
              onChange={() => toggleFeature('antiPauseSpoofing')}
            />
            <span className="slider" />
          </label>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="status-badge">
          <span className="badge-dot" />
          <span>Stealth Protection Active</span>
        </div>
        <span style={{ fontSize: '10px', color: '#64748b' }}>Chrome MV3</span>
      </footer>
    </div>
  );
}
