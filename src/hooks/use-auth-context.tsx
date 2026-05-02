
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  role: 'owner' | 'cashier' | null;
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
  const [role, setRole] = useState<'owner' | 'cashier' | null>(null);

  useEffect(() => {
    async function loadUserContext() {
      if (isUserLoading) return;

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

      try {
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
            
            // Suporta roles em formato string ou objeto denormalizado
            const memberInfo = data.members?.[user.uid];
            const userRole = typeof memberInfo === 'object' ? memberInfo.role : memberInfo;
            setRole(userRole || 'cashier');
          }
        } else {
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
    setTenantMembers(null);
    setRole(null);
    router.push('/login');
  };

  const contextValue = {
    user,
    loading: isUserLoading || loading,
    tenantId,
    organizationName,
    tenantMembers,
    role,
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
