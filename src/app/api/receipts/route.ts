// API Route: /api/receipts
// Scoped retrieval of fee receipt records from Firestore with role-based isolation
// - Student: can only view receipts for their own studentId
// - Parent: can only view receipts for their linked childIds
// - Admin: can view all receipts or filter by studentId

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { getAuthenticatedUser, canAccessStudent } from '@/lib/server-auth';
import { getReceiptDownloadUrl } from '@/lib/receipt-storage';
import { FeeReceiptRecord } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Session missing or expired.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedStudentId = searchParams.get('studentId');
    const limitParam = parseInt(searchParams.get('limit') || '50', 10);

    if (!isFirebaseAdminConfigured) {
      return NextResponse.json({
        success: true,
        receipts: [],
        warning: 'Firebase Admin is not configured in this environment.',
      });
    }

    let targetStudentId: string | null = null;

    if (user.role === 'admin') {
      // Admin can filter by studentId or fetch all
      targetStudentId = requestedStudentId || null;
    } else if (user.role === 'student') {
      // Student can only see their own receipts
      targetStudentId = user.studentId || user.uid;
    } else if (user.role === 'parent') {
      // Parent can only see linked children
      if (requestedStudentId) {
        if (!canAccessStudent(user, requestedStudentId)) {
          return NextResponse.json(
            { error: 'Forbidden: You do not have permission to view receipts for this student.' },
            { status: 403 }
          );
        }
        targetStudentId = requestedStudentId;
      } else {
        const childIds: string[] = user.childIds || [];
        if (childIds.length === 0) {
          return NextResponse.json({ success: true, receipts: [] });
        }
        // If parent has 1 child, default to that child
        if (childIds.length === 1) {
          targetStudentId = childIds[0];
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Forbidden: Role not authorized to view receipts.' },
        { status: 403 }
      );
    }

    let query: FirebaseFirestore.Query = adminDb.collection('receipts');

    if (targetStudentId) {
      query = query.where('studentId', '==', targetStudentId);
    }

    // Order by createdAt descending
    const snapshot = await query.limit(Math.min(limitParam, 100)).get();

    const receipts: FeeReceiptRecord[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data() as FeeReceiptRecord;
      let receiptUrl = data.receiptUrl;

      // If receiptUrl is missing but storagePath exists, dynamically resolve URL
      if (!receiptUrl && data.receiptStoragePath) {
        try {
          receiptUrl = await getReceiptDownloadUrl(data.receiptStoragePath);
        } catch {
          // Keep null if URL cannot be resolved
        }
      }

      receipts.push({
        ...data,
        id: doc.id,
        receiptUrl,
      });
    }

    // Sort by createdAt descending in memory as secondary sort
    receipts.sort((a, b) => new Date(b.createdAt || b.paidDate || 0).getTime() - new Date(a.createdAt || a.paidDate || 0).getTime());

    return NextResponse.json({
      success: true,
      receipts,
      total: receipts.length,
    });
  } catch (error: any) {
    console.error('[API /api/receipts] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch receipts.' },
      { status: 500 }
    );
  }
}
