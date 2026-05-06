
"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, collection, query, getDocs, limit, where } from 'firebase/firestore';
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
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
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
  const [selectedEventId, setSelectedEventIdState] = useState<string | null>(null);

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

  const setSelectedEventId = (id: string | null) => {
    setSelectedEventIdState(id);
    if (firebaseUser) {
      if (id) localStorage.setItem(`selectedEventId_${firebaseUser.uid}`, id);
      else localStorage.removeItem(`selectedEventId_${firebaseUser.uid}`);
    }
  };

  useEffect(() => {
    async function loadUserContext() {
      if (isUserLoading) return;

      if (!firebaseUser) {
        setTenantId(null);
        setOrganizationName(null);
        setRole(null);
        setSelectedEventIdState(null);
        setLoading(false);
        if (pathname !== '/login' && pathname !== '/register') router.push('/login');
        return;
      }

      // Cache Check
      const cachedTenantId = localStorage.getItem(`tenantId_${firebaseUser.uid}`);
      const cachedRole = localStorage.getItem(`role_${firebaseUser.uid}`) as any;
      const cachedEventId = localStorage.getItem(`selectedEventId_${firebaseUser.uid}`);

      if (cachedTenantId && cachedRole) {
        setTenantId(cachedTenantId);
        setRole(cachedRole);
        setSelectedEventIdState(cachedEventId);
      }

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
            const userRole = data.members?.[firebaseUser.uid]?.role || 'cashier';
            setRole(userRole);
            localStorage.setItem(`role_${firebaseUser.uid}`, userRole);

            // Redirecionamento Inteligente para Caixas sem evento selecionado
            if (userRole === 'cashier' && !cachedEventId) {
              const eventsRef = collection(db, 'tenants', tId, 'events');
              const eventsSnap = await getDocs(query(eventsRef, where('status', '==', 'ativo')));
              
              // Find events where this cashier is a member
              const myEvents = eventsSnap.docs.filter(d => d.data().members?.[firebaseUser.uid] != null);

              if (myEvents.length === 1) {
                const eventId = myEvents[0].id;
                setSelectedEventId(eventId);
                if (pathname === '/' || pathname === '/login') {
                  router.replace(`/pdv?eventId=${eventId}`);
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn("Aviso: Erro ao carregar contexto de usuário.");
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
      localStorage.removeItem(`selectedEventId_${firebaseUser.uid}`);
    }
    await firebaseSignOut(auth);
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
    selectedEventId,
    setSelectedEventId,
    signOut
  }), [firebaseUser, isUserLoading, loading, isOnline, tenantId, organizationName, tenantMembers, role, isSuperAdmin, selectedEventId]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
