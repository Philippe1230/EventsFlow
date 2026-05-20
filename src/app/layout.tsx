
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AuthProvider } from '@/hooks/use-auth-context';
import { Toaster } from '@/components/ui/toaster';
import { PWARegister } from '@/components/pwa/PWARegister';

export const metadata: Metadata = {
  title: 'Flow Events - Gestão de Vendas Ultra Rápida',
  description: 'Controle de vendas, fichas e dashboards em tempo real para eventos, bares e festivais. O PDV mais rápido do mercado.',
  keywords: ['gestão de eventos', 'pdv para eventos', 'fichas de consumo', 'automação bar', 'venda de tickets'],
  authors: [{ name: 'Flow Events' }],
  openGraph: {
    title: 'Flow Events - Sistema de Vendas e Fichas',
    description: 'Transforme a operação do seu evento com vendas em segundos e impressão térmica profissional.',
    url: 'https://flowevents.com.br',
    siteName: 'Flow Events',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flow Events',
    description: 'O controle total do seu evento na palma da mão.',
  },
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      }
    ]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Flow Events',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-body antialiased bg-background text-foreground overflow-x-hidden selection:bg-primary/20 selection:text-primary">
        <FirebaseClientProvider>
          <AuthProvider>
            <PWARegister />
            {children}
            <Toaster />
          </AuthProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
