
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInAnonymously, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth as useFirebaseAuth, useFirestore, useUser } from '@/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  tenantId: string | null;
  organizationName: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_TENANT_ID = 'meu-arraial';
const DEFAULT_ORG_NAME = 'Meu Arraial';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const [tenantId] = useState<string | null>(DEFAULT_TENANT_ID);
  const [organizationName] = useState<string | null>(DEFAULT_ORG_NAME);

  useEffect(() => {
    async function initAuth() {
      if (!isUserLoading && !user) {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Erro ao entrar anonimamente:", error);
          setLoading(false);
        }
      } else if (user) {
        // Garante que o tenant padrão existe
        try {
          const tenantRef = doc(db, 'tenants', DEFAULT_TENANT_ID);
          const tenantSnap = await getDoc(tenantRef);
          
          if (!tenantSnap.exists()) {
            await setDoc(tenantRef, { 
              name: DEFAULT_ORG_NAME, 
              createdAt: new Date(),
              members: { [user.uid]: 'owner' }
            });
          }
        } catch (e) {
          console.error("Erro ao verificar tenant:", e);
        }
        setLoading(false);
      }
    }

    initAuth();
  }, [user, isUserLoading, auth, db]);

  const signOut = async () => {
    await auth.signOut();
  };

  const contextValue = {
    user,
    loading: isUserLoading || loading,
    tenantId,
    organizationName,
    signOut
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
