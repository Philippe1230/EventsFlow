
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, collection, query, getDocs, limit } from 'firebase/firestore';
import { useAuth as useFirebaseAuth, useFirestore, useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  tenantId: string | null;
  organizationName: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserContext() {
      if (isUserLoading) return;

      if (!user) {
        setTenantId(null);
        setOrganizationName(null);
        setLoading(false);
        
        // Redireciona para login se não estiver em rotas públicas
        if (pathname !== '/login' && pathname !== '/register') {
          router.push('/login');
        }
        return;
      }

      try {
        // Busca a primeira membership do usuário para determinar o tenant
        const membershipsRef = collection(db, 'userProfiles', user.uid, 'memberships');
        const membershipsSnap = await getDocs(query(membershipsRef, limit(1)));
        
        if (!membershipsSnap.empty) {
          const membershipData = membershipsSnap.docs[0].data();
          const tId = membershipData.tenantId;
          setTenantId(tId);

          // Busca detalhes do tenant
          const tenantRef = doc(db, 'tenants', tId);
          const tenantSnap = await getDoc(tenantRef);
          if (tenantSnap.exists()) {
            setOrganizationName(tenantSnap.data().name);
          }
        } else {
          // Se o usuário não tem tenant, ele precisa criar um ou ser convidado
          if (pathname !== '/register' && pathname !== '/login') {
            router.push('/register');
          }
        }
      } catch (error) {
        console.error("Erro ao carregar contexto de autenticação:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUserContext();
  }, [user, isUserLoading, db, pathname, router]);

  const signOut = async () => {
    await firebaseSignOut(auth);
    setTenantId(null);
    setOrganizationName(null);
    router.push('/login');
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
