
"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, collection, query, getDocs, limit } from 'firebase/firestore';
import { useAuth as useFirebaseAuth, useFirestore, useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  tenantId: string | null;
  organizationName: string | null;
  tenantMembers: Record<string, any> | null;
  role: 'owner' | 'cashier' | 'super-admin' | null;
  isSuperAdmin: boolean;
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
  const [tenantMembers, setTenantMembers] = useState<Record<string, any> | null>(null);
  const [role, setRole] = useState<'owner' | 'cashier' | 'super-admin' | null>(null);

  const isSuperAdmin = useMemo(() => user?.email === 'flowevents@gmail.com', [user?.email]);

  // Carrega o contexto apenas quando o usuário muda (login/logout)
  useEffect(() => {
    async function loadUserContext() {
      // Se ainda está carregando o auth básico, não faz nada
      if (isUserLoading) return;

      // Se não tem usuário, limpa tudo e manda pro login (se não estiver em rotas públicas)
      if (!user) {
        setTenantId(null);
        setOrganizationName(null);
        setTenantMembers(null);
        setRole(null);
        setLoading(false);
        
        if (pathname !== '/login' && pathname !== '/register') {
          router.push('/login');
        }
        return;
      }

      // Se já temos os dados carregados para este usuário, não busca de novo ao navegar
      if (tenantId || role) {
        setLoading(false);
        return;
      }

      try {
        if (isSuperAdmin) {
          setRole('super-admin');
          setOrganizationName('Sistema Central');
          setLoading(false);
          return;
        }

        const membershipsRef = collection(db, 'userProfiles', user.uid, 'memberships');
        let membershipsSnap = await getDocs(query(membershipsRef, limit(1)));
        
        if (!membershipsSnap.empty) {
          const mData = membershipsSnap.docs[0].data();
          const tId = mData.tenantId;
          
          setTenantId(tId);

          const tenantRef = doc(db, 'tenants', tId);
          const tenantSnap = await getDoc(tenantRef);
          
          if (tenantSnap.exists()) {
            const data = tenantSnap.data();
            setOrganizationName(data.name);
            setTenantMembers(data.members || null);
            
            const memberInfo = data.members?.[user.uid];
            const userRole = typeof memberInfo === 'object' ? memberInfo.role : memberInfo;
            setRole(userRole || 'cashier');
          }
        } else {
          // Se não tem membership e não é super-admin, manda registrar evento
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
  }, [user, isUserLoading, db, isSuperAdmin, router]); // Removido pathname para evitar recarga em navegação

  const signOut = async () => {
    await firebaseSignOut(auth);
    setTenantId(null);
    setOrganizationName(null);
    setTenantMembers(null);
    setRole(null);
    router.push('/login');
  };

  const contextValue = useMemo(() => ({
    user,
    loading: isUserLoading || loading,
    tenantId,
    organizationName,
    tenantMembers,
    role,
    isSuperAdmin,
    signOut
  }), [user, isUserLoading, loading, tenantId, organizationName, tenantMembers, role, isSuperAdmin]);

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
