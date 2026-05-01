
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  tenantId: string | null;
  organizationName: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setTenant: (tenantId: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Find existing membership or prompt tenant creation
        const membershipQuery = query(collection(db, 'memberships'), where('userId', '==', user.uid));
        const membershipSnap = await getDocs(membershipQuery);
        
        if (!membershipSnap.empty) {
          const membership = membershipSnap.docs[0].data();
          setTenantId(membership.tenantId);
          
          const tenantSnap = await getDoc(doc(db, 'tenants', membership.tenantId));
          if (tenantSnap.exists()) {
            setOrganizationName(tenantSnap.data().name);
          }
        }
      } else {
        setTenantId(null);
        setOrganizationName(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    router.push('/');
  };

  const signOut = async () => {
    await fbSignOut(auth);
    router.push('/login');
  };

  const setTenant = async (id: string, name: string) => {
    if (!user) return;
    setTenantId(id);
    setOrganizationName(name);
    
    // Create tenant and membership if they don't exist
    await setDoc(doc(db, 'tenants', id), { name, createdAt: new Date() }, { merge: true });
    await setDoc(doc(db, 'memberships', `${user.uid}_${id}`), {
      userId: user.uid,
      tenantId: id,
      role: 'owner'
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, tenantId, organizationName, signInWithGoogle, signOut, setTenant }}>
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
