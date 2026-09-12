'use client';

// SessionSync — synchronizes client-side Firebase Auth state with server-side HttpOnly session cookies
// Calls /api/auth/session to exchange refreshed ID tokens for signed session cookies

import { useEffect } from 'react';
import { onAuthStateChanged, onIdTokenChanged } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';

export function SessionSync() {
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    try {
      const unsubscribe = onIdTokenChanged(auth, async (user) => {
        if (user) {
          try {
            const token = await user.getIdToken();
            await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: token }),
            });
          } catch (err) {
            console.warn('[SessionSync] Error syncing session cookie:', err);
          }
        } else {
          try {
            await fetch('/api/auth/logout', { method: 'POST' });
          } catch (err) {
            console.warn('[SessionSync] Error clearing session cookie:', err);
          }
        }
      });
      return () => unsubscribe();
    } catch {
      // Ignore in unconfigured environments
    }
  }, []);

  return null;
}
