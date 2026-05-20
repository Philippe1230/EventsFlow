
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Flow Events - Gestão de Vendas',
    short_name: 'Flow Events',
    description: 'Sistema de vendas ultra rápida para eventos e festivais com suporte a impressão térmica PWA.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff9f5',
    theme_color: '#f97316',
    orientation: 'any',
    icons: [
      {
        src: '/icon.svg',
        sizes: '192x192 512x512',
        type: 'image/svg+xml',
        purpose: 'any'
      },
      {
        src: '/icon.svg',
        sizes: '192x192 512x512',
        type: 'image/svg+xml',
        purpose: 'maskable'
      },
    ],
  }
}
