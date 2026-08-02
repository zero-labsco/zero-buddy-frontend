import type { MetadataRoute } from 'next';

// PWA manifest 配置 / PWA manifest configuration
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zero Buddy',
    short_name: 'Zero Buddy',
    description: 'AI chat assistant for Zero Labs — answers about open-source developer tools and apps.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/apple-icon.svg',
        sizes: '180x180',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
