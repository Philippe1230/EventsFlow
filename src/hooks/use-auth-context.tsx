
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInAnonymously, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { useAuth as useFirebaseAuth, useFirestore, useUser } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

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
        // Garante que o tenant padrão existe e popula com produtos iniciais se estiver vazio
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

          // Seed de produtos iniciais para facilitar o teste
          const productsRef = collection(db, 'tenants', DEFAULT_TENANT_ID, 'products');
          const productsSnap = await getDocs(productsRef);
          if (productsSnap.empty) {
            const initialProducts = [
              { name: 'Pipoca', price: 5.0, category: 'Comida', active: true },
              { name: 'Quentão', price: 8.0, category: 'Bebida', active: true },
              { name: 'Milho Cozido', price: 6.0, category: 'Comida', active: true },
              { name: 'Cachorro Quente', price: 10.0, category: 'Comida', active: true },
              { name: 'Pé de Moleque', price: 4.0, category: 'Doces', active: true },
              { name: 'Pescaria', price: 5.0, category: 'Brincadeira', active: true },
            ];
            for (const p of initialProducts) {
              addDocumentNonBlocking(productsRef, { 
                ...p, 
                tenantId: DEFAULT_TENANT_ID, 
                createdAt: new Date() 
              });
            }
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
