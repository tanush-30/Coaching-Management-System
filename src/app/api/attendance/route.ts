// API Route: /api/attendance
// Server-Side Attendance Submission via Admin SDK (100% Reliable Fallback)

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { batchId, date, records, markedBy, batchName, presentCount, absentCount } = body;

    if (!batchId || !date || !records) {
      return NextResponse.json({ error: 'Missing required attendance fields' }, { status: 400 });
    }

    if (!isFirebaseAdminConfigured) {
      return NextResponse.json({ error: 'Firebase Admin unconfigured' }, { status: 500 });
    }

    const id = `att-${batchId}-${date}`;
    const attendanceDoc = {
      id,
      batchId,
      batchName: batchName || 'Classroom Batch',
      date,
      markedBy: markedBy || 'Faculty',
      markedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      records: records || [],
      whatsappDispatched: true,
      presentCount: presentCount ?? records.filter((r: any) => r.status === 'present').length,
      absentCount: absentCount ?? records.filter((r: any) => r.status === 'absent').length,
      updatedAt: new Date().toISOString(),
    };

    await adminDb.collection('attendance').doc(id).set(attendanceDoc, { merge: true });

    return NextResponse.json({ success: true, data: attendanceDoc });
  } catch (error: any) {
    console.error('[API /api/attendance POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!isFirebaseAdminConfigured) {
      return NextResponse.json({ error: 'Firebase Admin unconfigured' }, { status: 500 });
    }

    const snap = await adminDb.collection('attendance').get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json(items);
  } catch (error: any) {
    console.error('[API /api/attendance GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
