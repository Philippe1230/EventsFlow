
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Arraial PDV',
    short_name: 'Arraial',
    description: 'Gestão de vendas ultra rápida para festas juninas',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff9f5',
    theme_color: '#f97316',
    orientation: 'any',
    icons: [
      {
        src: 'https://picsum.photos/seed/icon1/192/192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://picsum.photos/seed/icon2/512/512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
