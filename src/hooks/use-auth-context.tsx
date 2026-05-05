"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, collection, query, getDocs, limit } from 'firebase/firestore';
import { useAuth as useFirebaseAuth, useFirestore, useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isOnline: boolean;
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
  const { user: firebaseUser, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [tenantMembers, setTenantMembers] = useState<Record<string, any> | null>(null);
  const [role, setRole] = useState<'owner' | 'cashier' | 'super-admin' | null>(null);

  // Monitorar status da internet
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const isSuperAdmin = useMemo(() => firebaseUser?.email === 'flowevents@gmail.com', [firebaseUser?.email]);

  useEffect(() => {
    async function loadUserContext() {
      if (isUserLoading) return;

      if (!firebaseUser) {
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

      // 1. Tenta carregar do cache local IMEDIATAMENTE para ser ultra rápido
      const cachedTenantId = localStorage.getItem(`tenantId_${firebaseUser.uid}`);
      const cachedRole = localStorage.getItem(`role_${firebaseUser.uid}`) as any;
      const cachedOrgName = localStorage.getItem(`orgName_${firebaseUser.uid}`);
      const cachedMembers = localStorage.getItem(`members_${firebaseUser.uid}`);

      if (cachedTenantId && cachedRole) {
        setTenantId(cachedTenantId);
        setRole(cachedRole);
        setOrganizationName(cachedOrgName);
        if (cachedMembers) setTenantMembers(JSON.parse(cachedMembers));
        
        // Se estiver offline, já para por aqui e libera a tela
        if (!navigator.onLine) {
          setLoading(false);
          return;
        }
      }

      // 2. Tenta atualizar os dados se estiver online ou se não houver cache
      try {
        if (isSuperAdmin) {
          setRole('super-admin');
          setOrganizationName('Sistema Central');
          setLoading(false);
          return;
        }

        const membershipsRef = collection(db, 'userProfiles', firebaseUser.uid, 'memberships');
        const membershipsSnap = await getDocs(query(membershipsRef, limit(1)));
        
        if (!membershipsSnap.empty) {
          const mData = membershipsSnap.docs[0].data();
          const tId = mData.tenantId;
          
          setTenantId(tId);
          localStorage.setItem(`tenantId_${firebaseUser.uid}`, tId);

          const tenantRef = doc(db, 'tenants', tId);
          const tenantSnap = await getDoc(tenantRef);
          
          if (tenantSnap.exists()) {
            const data = tenantSnap.data();
            setOrganizationName(data.name);
            setTenantMembers(data.members || null);
            
            const memberInfo = data.members?.[firebaseUser.uid];
            const userRole = typeof memberInfo === 'object' ? memberInfo.role : memberInfo;
            const finalRole = userRole || 'cashier';
            
            setRole(finalRole);
            
            // Atualiza o cache para o próximo uso offline
            localStorage.setItem(`role_${firebaseUser.uid}`, finalRole);
            localStorage.setItem(`orgName_${firebaseUser.uid}`, data.name);
            localStorage.setItem(`members_${firebaseUser.uid}`, JSON.stringify(data.members || {}));
          }
        } else if (navigator.onLine && !cachedTenantId) {
          // Se não tem nem cache nem membership online, vai para o registro
          if (pathname !== '/register' && pathname !== '/login') {
            router.push('/register');
          }
        }
      } catch (error) {
        console.warn("Aviso: Rodando com dados de cache devido a erro ou falta de rede.");
      } finally {
        setLoading(false);
      }
    }

    loadUserContext();
  }, [firebaseUser, isUserLoading, db, isSuperAdmin, router, pathname]);

  const signOut = async () => {
    if (firebaseUser) {
      localStorage.removeItem(`tenantId_${firebaseUser.uid}`);
      localStorage.removeItem(`role_${firebaseUser.uid}`);
      localStorage.removeItem(`orgName_${firebaseUser.uid}`);
      localStorage.removeItem(`members_${firebaseUser.uid}`);
    }
    await firebaseSignOut(auth);
    setTenantId(null);
    setOrganizationName(null);
    setTenantMembers(null);
    setRole(null);
    router.push('/login');
  };

  const contextValue = useMemo(() => ({
    user: firebaseUser,
    loading: isUserLoading || loading,
    isOnline,
    tenantId,
    organizationName,
    tenantMembers,
    role,
    isSuperAdmin,
    signOut
  }), [firebaseUser, isUserLoading, loading, isOnline, tenantId, organizationName, tenantMembers, role, isSuperAdmin]);

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
