'use client';

// Auth context — wraps the app to provide current user + role + verified custom claims
// Usage: const { user, role, claims, loading, refreshClaims } = useAuth();

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import type { UserClaims, UserRole } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  claims: UserClaims | null;
  loading: boolean;
  refreshClaims: () => Promise<void>;
  signOutUser: (redirectUrl?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  claims: null,
  loading: true,
  refreshClaims: async () => {},
  signOutUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [claims, setClaims] = useState<UserClaims | null>(null);
  const [loading, setLoading] = useState(true);

  const syncSessionWithServer = async (firebaseUser: User) => {
    try {
      const idToken = await firebaseUser.getIdToken();
      const tokenResult = await firebaseUser.getIdTokenResult(true);

      const resolvedRole = (tokenResult.claims.role as UserRole) || null;
      let resolvedClaims: UserClaims = { role: 'admin' };

      if (resolvedRole === 'teacher') {
        resolvedClaims = { role: 'teacher', batchIds: (tokenResult.claims.batchIds as string[]) || [] };
      } else if (resolvedRole === 'student') {
        resolvedClaims = {
          role: 'student',
          studentId: (tokenResult.claims.studentId as string) || firebaseUser.uid,
          batchId: (tokenResult.claims.batchId as string) || '',
        };
      } else if (resolvedRole === 'parent') {
        resolvedClaims = { role: 'parent', childIds: (tokenResult.claims.childIds as string[]) || [] };
      } else if (resolvedRole === 'admin') {
        resolvedClaims = { role: 'admin' };
      }

      setClaims(resolvedClaims);
      setRole(resolvedRole);

      // Exchange ID token for signed session cookie on server
      await fetch('/api/auth/session-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, expectedRole: resolvedRole || undefined }),
      });
    } catch (err: any) {
      if (err?.code === 'auth/id-token-revoked') {
        console.warn('[AuthContext] Token revoked. Forcing sign out.');
        await signOut(auth);
        setUser(null);
        setRole(null);
        setClaims(null);
      } else {
        console.warn('[AuthContext] Session sync notice:', err);
      }
    }
  };

  const refreshClaims = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const tokenResult = await auth.currentUser.getIdTokenResult(true);
      const resolvedRole = (tokenResult.claims.role as UserRole) || 'admin';
      let resolvedClaims: UserClaims = { role: 'admin' };

      if (resolvedRole === 'teacher') {
        resolvedClaims = { role: 'teacher', batchIds: (tokenResult.claims.batchIds as string[]) || [] };
      } else if (resolvedRole === 'student') {
        resolvedClaims = {
          role: 'student',
          studentId: (tokenResult.claims.studentId as string) || auth.currentUser.uid,
          batchId: (tokenResult.claims.batchId as string) || '',
        };
      } else if (resolvedRole === 'parent') {
        resolvedClaims = { role: 'parent', childIds: (tokenResult.claims.childIds as string[]) || [] };
      }

      setClaims(resolvedClaims);
      setRole(resolvedRole);
    } catch (err) {
      console.warn('[AuthContext] refreshClaims error:', err);
    }
  }, []);

  const signOutUser = useCallback(async (redirectUrl: string = '/login') => {
    try {
      if (isFirebaseConfigured) {
        await signOut(auth);
      }
    } catch (e) {
      console.warn('[AuthContext] signOut error:', e);
    }
    try {
      await fetch('/api/auth/session-logout', { method: 'POST' });
    } catch (e) {
      console.warn('[AuthContext] session-logout error:', e);
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }

    setUser(null);
    setRole(null);
    setClaims(null);

    // Clear client cookies directly
    if (typeof document !== 'undefined') {
      const cookiesToClear = ['session', 'apex_session', 'apex_role', 'firebase-token'];
      cookiesToClear.forEach((name) => {
        document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        try {
          document.cookie = `${name}=; path=/; domain=${window.location.hostname}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        } catch {}
      });
    }

    // Direct browser navigation to reset all React state and caches
    if (typeof window !== 'undefined') {
      window.location.href = redirectUrl;
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          await syncSessionWithServer(firebaseUser);
        } else {
          setRole(null);
          setClaims(null);
          try {
            await fetch('/api/auth/session-logout', { method: 'POST' });
          } catch {
            // ignore
          }
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } catch {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, claims, loading, refreshClaims, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

