
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Flow Events - Gestão de Vendas',
    short_name: 'Flow Events',
    description: 'Gestão de vendas ultra rápida para eventos com suporte PWA',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff9f5',
    theme_color: '#f97316',
    orientation: 'any',
    icons: [
      {
        src: 'https://picsum.photos/seed/event-app-192/192/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: 'https://picsum.photos/seed/event-app-512/512/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
    ],
  }
}
