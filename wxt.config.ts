import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Skip & Wait - Fast-Forward Timers & Media',
    description: 'Automatically accelerates and skips countdown timers, waiting pages, and video ad interruptions to streamline web browsing.',
    version: '1.0.0',
    permissions: [
      'storage',
      'alarms',
      'tabs',
      'activeTab'
    ],
    host_permissions: [
      '<all_urls>'
    ],
    action: {
      default_title: 'Skip & Wait Dashboard',
      default_popup: 'popup.html'
    }
  },
});
