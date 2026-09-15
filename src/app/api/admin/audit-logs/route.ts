// API Route: /api/admin/audit-logs
// Administrator Query Endpoint for Security & Correction Audit Trail

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { adminAuth, adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionCookie =
      cookieStore.get('session')?.value ||
      cookieStore.get('apex_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    if (!isFirebaseAdminConfigured) {
      return NextResponse.json({ error: 'Firebase Admin unconfigured' }, { status: 500 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = (decoded.role as UserRole) || null;

    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can inspect audit logs.' },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const targetCategory = url.searchParams.get('targetType') || url.searchParams.get('targetRole');
    const actorId = url.searchParams.get('actorId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limitCount = parseInt(url.searchParams.get('limit') || '50', 10);

    let query: FirebaseFirestore.Query = adminDb.collection('audit_logs');

    if (action && action !== 'all') {
      query = query.where('action', '==', action);
    }

    if (targetCategory && targetCategory !== 'all') {
      query = query.where('targetType', '==', targetCategory);
    }

    if (actorId && actorId !== 'all') {
      query = query.where('actorId', '==', actorId);
    }

    const snap = await query.get();
    let logs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

    // In-memory date filtering if provided
    if (startDate) {
      logs = logs.filter((l) => (l.timestamp || '') >= startDate);
    }
    if (endDate) {
      const endBoundary = endDate.length === 10 ? `${endDate}T23:59:59.999Z` : endDate;
      logs = logs.filter((l) => (l.timestamp || '') <= endBoundary);
    }

    // Sort descending by timestamp
    logs.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

    // Apply pagination limit
    const paginatedLogs = logs.slice(0, limitCount);

    return NextResponse.json({
      success: true,
      count: paginatedLogs.length,
      totalMatching: logs.length,
      logs: paginatedLogs,
    });
  } catch (error: any) {
    console.error('[API /api/admin/audit-logs GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// -------------------------------------------------------------
// Tamper-Resistance: Explicit Rejection for Mutation/Deletion
// -------------------------------------------------------------

export async function DELETE() {
  return NextResponse.json(
    {
      error: 'Method Not Allowed: Audit log entries are strictly immutable and cannot be deleted.',
      code: 'AUDIT_LOG_IMMUTABLE',
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      error: 'Method Not Allowed: Audit log entries are strictly immutable and cannot be modified.',
      code: 'AUDIT_LOG_IMMUTABLE',
    },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      error: 'Method Not Allowed: Audit log entries are strictly immutable and cannot be modified.',
      code: 'AUDIT_LOG_IMMUTABLE',
    },
    { status: 405 }
  );
}

