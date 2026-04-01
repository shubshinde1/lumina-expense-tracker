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
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
