'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Registrar o Service Worker após o carregamento da página
      const handleRegister = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Flow Events: Service Worker registrado com sucesso no escopo:', registration.scope);
        } catch (error) {
          console.error('Flow Events: Erro ao registrar Service Worker:', error);
        }
      };

      if (document.readyState === 'complete') {
        handleRegister();
      } else {
        window.addEventListener('load', handleRegister);
        return () => window.removeEventListener('load', handleRegister);
      }
    }
  }, []);

  return null;
}
