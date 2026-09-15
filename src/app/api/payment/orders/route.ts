// API Route: /api/payment/orders
// Admin endpoint to query recent payment orders and webhook sync statuses.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { getAuthenticatedUser } from '@/lib/server-auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin session required' },
        { status: 403 }
      );
    }

    if (!isFirebaseAdminConfigured) {
      return NextResponse.json({ orders: [], total: 0 });
    }

    const snapshot = await adminDb
      .collection('payment_orders')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const orders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      orders,
      total: orders.length,
    });
  } catch (error: any) {
    console.error('[API /api/payment/orders] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch payment orders.' },
      { status: 500 }
    );
  }
}
