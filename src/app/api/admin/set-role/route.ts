// API route: /api/admin/set-role
// Sets a user's role in Firestore user_roles collection
// Only callable by existing admins (verified server-side via Firebase Admin)

// Force dynamic — prevents Next.js from pre-rendering this route at build time
// (Firebase Admin SDK requires env vars that are only available at runtime)
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import type { UserRole } from '@/lib/types';

const VALID_ROLES: UserRole[] = ['admin', 'teacher', 'parent', 'student'];

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the caller's session token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(token);

    // 2. Check that caller is an admin
    const callerRoleDoc = await adminDb.collection('user_roles').doc(decoded.uid).get();
    if (!callerRoleDoc.exists || callerRoleDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admins only' }, { status: 403 });
    }

    // 3. Parse and validate body
    const body = await request.json();
    const { targetUid, role } = body as { targetUid: string; role: UserRole };

    if (!targetUid || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid targetUid or role' }, { status: 400 });
    }

    // 4. Set the role (only possible via Admin SDK — client cannot do this)
    await adminDb.collection('user_roles').doc(targetUid).set({ role });

    return NextResponse.json({ success: true, uid: targetUid, role });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
