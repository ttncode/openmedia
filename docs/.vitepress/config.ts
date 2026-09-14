import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'OpenMedia',
  description:
    'Download videos from almost any website. Lightweight, self-hosted media downloader with a clean web UI.',
  head: [['link', { rel: 'icon', href: '/logo.svg' }]],
  // a dead link is a failed build, not a warning
  ignoreDeadLinks: false,
  srcExclude: ['superpowers/**'],
  themeConfig: {
    logo: '/logo.svg',
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting started', link: '/getting-started' },
          { text: 'Usage', link: '/usage' },
          { text: 'Configuration', link: '/configuration' },
        ],
      },
      {
        text: 'Operations',
        items: [
          { text: 'Deployment', link: '/deployment' },
          { text: 'Troubleshooting', link: '/troubleshooting' },
          { text: 'Security', link: '/security' },
        ],
      },
    ],
  },
});
