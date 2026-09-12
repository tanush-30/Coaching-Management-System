'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { UserRole } from '@/lib/types';

function ERPAppGateway() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const roleParam = searchParams.get('role') as UserRole;
    if (roleParam && ['admin', 'teacher', 'parent', 'student'].includes(roleParam)) {
      router.replace(`/${roleParam}`);
      return;
    }

    const targetRoute = role === 'teacher' ? '/teacher'
      : role === 'student' ? '/student'
      : role === 'parent' ? '/parent'
      : '/admin';

    router.replace(targetRoute);
  }, [role, loading, searchParams, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-600 font-sans">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      <div className="text-center">
        <p className="text-sm font-bold text-slate-800">Routing to Your Dedicated Workspace...</p>
        <p className="text-xs text-slate-400">Verifying security scope and permissions</p>
      </div>
    </div>
  );
}

export default function ERPApp() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-xs font-bold">Loading ApexERP...</span>
        </div>
      }
    >
      <ERPAppGateway />
    </Suspense>
  );
}
