'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';

// Singleton instances to prevent multiple initializations
let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

export function initializeFirebase() {
  if (!getApps().length) {
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Fallback to config object
      firebaseApp = initializeApp(firebaseConfig);
    }
  } else {
    firebaseApp = getApp();
  }

  // Initialize services only if they don't exist
  if (!auth) {
    auth = getAuth(firebaseApp);
    // Garante que a sessão do usuário seja salva permanentemente no navegador
    setPersistence(auth, browserLocalPersistence).catch(console.error);
  }
  
  if (!firestore) {
    firestore = getFirestore(firebaseApp);
    
    // Habilita persistência offline robusta
    if (typeof window !== 'undefined') {
      enableIndexedDbPersistence(firestore).catch((err) => {
        if (err.code === 'failed-precondition') {
          // Múltiplas abas abertas, persistência só funciona em uma por vez
          console.warn('Persistência offline: múltiplas abas detectadas.');
        } else if (err.code === 'unimplemented') {
          // Browser não suporta persistência
          console.warn('Persistência offline: browser não suportado.');
        }
      });
    }
  }

  return {
    firebaseApp,
    auth,
    firestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
