import type { MetadataRoute } from 'next';
import { BRAND_TEAL } from '@/lib/brand';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OpenMedia',
    short_name: 'OpenMedia',
    description:
      'Download videos from almost any website. Lightweight, self-hosted media downloader with a clean web UI.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f5f5f7',
    theme_color: BRAND_TEAL,
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png' },
      {
        src: '/pwa-icon/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    share_target: {
      action: '/',
      method: 'GET',
      params: { url: 'url', text: 'text', title: 'title' },
    },
  };
}
