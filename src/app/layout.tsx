
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AuthProvider } from '@/hooks/use-auth-context';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Flow Events - Vendas e Fichas',
  description: 'Controle de vendas ultra rápido para eventos e festivais',
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f97316' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 9V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a3 3 0 0 0 0 6v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a3 3 0 0 0 0-6Z'/%3E%3Cpath d='M13 3v2'/%3E%3Cpath d='M13 8v2'/%3E%3Cpath d='M13 13v2'/%3E%3Cpath d='M13 18v2'/%3E%3C/svg%3E",
        type: 'image/svg+xml',
      },
    ],
    apple: [
      {
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f97316' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 9V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a3 3 0 0 0 0 6v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a3 3 0 0 0 0-6Z'/%3E%3Cpath d='M13 3v2'/%3E%3Cpath d='M13 8v2'/%3E%3Cpath d='M13 13v2'/%3E%3Cpath d='M13 18v2'/%3E%3C/svg%3E",
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
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className="font-body antialiased bg-background text-foreground overflow-x-hidden selection:bg-primary/20 selection:text-primary">
        <FirebaseClientProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
