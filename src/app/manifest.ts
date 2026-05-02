
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Arraial PDV - Festa Junina',
    short_name: 'Arraial PDV',
    description: 'Gestão de vendas ultra rápida para festas juninas com suporte PWA',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff9f5',
    theme_color: '#f97316',
    orientation: 'any',
    icons: [
      {
        src: 'https://picsum.photos/seed/junina-app-192/192/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: 'https://picsum.photos/seed/junina-app-512/512/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
    ],
  }
}
