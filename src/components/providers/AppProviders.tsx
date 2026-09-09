'use client';

// AppProviders — wraps the entire app with React Query and Auth context
// This is a client component since both QueryClientProvider and AuthProvider need browser APIs

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth-context';
import { SessionSync } from './SessionSync';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,   // 2 minutes — data considered fresh
      retry: 1,
    },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* SessionSync syncs Firebase auth state to a cookie for middleware */}
        <SessionSync />
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
