import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lumina Expense Tracker',
    short_name: 'Lumina',
    description: 'Secure and elegant expense tracking.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0e0e10',
    theme_color: '#1fc46a',
    icons: [
      {
        src: '/icon-192x192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/icon-512x512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
    ],
  }
}
