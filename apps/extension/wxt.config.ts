import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Vocabulary Capture',
    description: 'Capture vocabulary with context sentences directly from any webpage.',
    permissions: ['storage', 'contextMenus', 'activeTab'],
    host_permissions: ['http://localhost:4000/*', 'http://127.0.0.1:4000/*'],
    action: {
      default_title: 'Vocabulary Capture',
    },
    browser_specific_settings: {
      gecko: {
        id: 'vocabulary-capture@local',
        strict_min_version: '109.0',
      },
    },
  },
});
