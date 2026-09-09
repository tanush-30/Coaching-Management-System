'use client';

// SessionSync — syncs Firebase auth state into a cookie
// This is needed because Next.js middleware runs on the Edge and cannot read
// Firebase's IndexedDB storage. The cookie acts as a lightweight session signal
// that middleware can check to decide whether to redirect to /login.
//
// Security note: The actual session validity is always re-verified server-side
// via Firebase Admin SDK in API routes. The cookie is only used for middleware
// routing decisions, not as a trust boundary.

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';

export function SessionSync() {
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          // Set a session cookie — expires in 1 hour (Firebase tokens expire in 1hr)
          const token = await user.getIdToken();
          document.cookie = `apex_session=${token}; path=/; max-age=3600; SameSite=Strict`;
        } else {
          // Clear the session cookie on logout
          document.cookie = 'apex_session=; path=/; max-age=0';
        }
      });
      return () => unsubscribe();
    } catch {
      // In dev mode without Firebase configured
    }
  }, []);

  return null; // Renders nothing — purely a side-effect component
}
