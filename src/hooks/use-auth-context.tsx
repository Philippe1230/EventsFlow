
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(DEFAULT_TENANT_ID);
  const [organizationName, setOrganizationName] = useState<string | null>(DEFAULT_ORG_NAME);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        try {
          // Acesso automático anônimo para ser "sem login"
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Erro ao entrar anonimamente:", error);
        }
      } else {
        setUser(currentUser);
        
        // Garante que o tenant padrão existe
        const tenantRef = doc(db, 'tenants', DEFAULT_TENANT_ID);
        const tenantSnap = await getDoc(tenantRef);
        
        if (!tenantSnap.exists()) {
          await setDoc(tenantRef, { 
            name: DEFAULT_ORG_NAME, 
            createdAt: new Date(),
            members: { [currentUser.uid]: 'owner' }
          });
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    // Para um sistema "sem login", o signOut apenas limpa o estado local se necessário
    // mas aqui mantemos a funcionalidade padrão do Firebase se desejado.
    await auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, tenantId, organizationName, signOut }}>
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
