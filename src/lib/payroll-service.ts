// Payroll Service — Real-time Firestore operations, state transitions, and audit-logged actions for Faculty Payroll
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import { getClientDb, isFirebaseConfigured } from './firebase';
import { cleanFirestoreData } from './firestore-service';
import { logAuditEvent } from './audit-service';
import { calculatePayroll } from './payroll-engine';
import type {
  SalaryStructure,
  PayrollRecord,
  PayrollStatus,
  LineItem,
  Teacher,
  BatchAttendance,
} from './types';

export interface ActorContext {
  uid: string;
  name?: string;
  role?: string;
  email?: string;
}

/**
 * Helper to get Firestore DB instance
 */
function getDb() {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured.');
  }
  return getClientDb();
}

// ==========================================
// 1. SALARY STRUCTURE MANAGEMENT
// ==========================================

/**
 * Fetches all salary structures or for a specific teacher, ordered by effective date
 */
export async function fetchSalaryStructures(teacherId?: string): Promise<SalaryStructure[]> {
  try {
    const db = getDb();
    const colRef = collection(db, 'salaryStructures');
    let q = query(colRef);

    if (teacherId) {
      q = query(colRef, where('teacherId', '==', teacherId));
    }

    const snapshot = await getDocs(q);
    const structures: SalaryStructure[] = [];
    snapshot.forEach((docSnap) => {
      structures.push({ id: docSnap.id, ...(docSnap.data() as Omit<SalaryStructure, 'id'>) });
    });

    // Sort in memory by effectiveFrom descending
    return structures.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
  } catch (err) {
    console.error('[PayrollService] fetchSalaryStructures error:', err);
    return [];
  }
}

/**
 * Retrieves the currently active salary structure for a teacher
 */
export async function getActiveSalaryStructure(teacherId: string): Promise<SalaryStructure | null> {
  const structures = await fetchSalaryStructures(teacherId);
  // An active structure has effectiveTo == null or effectiveTo > now
  const now = new Date().toISOString();
  const active = structures.find((s) => !s.effectiveTo || s.effectiveTo > now);
  return active || structures[0] || null;
}

/**
 * Saves a new salary structure or supersedes an existing one (Revision History Preservation)
 */
export async function saveSalaryStructure(
  structureData: {
    teacherId: string;
    teacherName?: string;
    facultyId?: string;
    type: 'fixed' | 'per_lecture' | 'hybrid';
    baseAmount: number;     // in paise
    perLectureRate: number; // in paise
    effectiveFrom: string;  // ISO string
  },
  actor: ActorContext
): Promise<SalaryStructure> {
  const db = getDb();
  const structureId = `struct_${structureData.teacherId}_${Date.now()}`;
  const now = new Date().toISOString();

  // Find any current active structure to supersede
  const active = await getActiveSalaryStructure(structureData.teacherId);
  if (active && active.id) {
    // Set effectiveTo to the start of the new structure's effectiveFrom or now
    const oldDocRef = doc(db, 'salaryStructures', active.id);
    await updateDoc(oldDocRef, {
      effectiveTo: structureData.effectiveFrom || now,
      updatedAt: now,
    });
  }

  const newStructure: SalaryStructure = {
    id: structureId,
    teacherId: structureData.teacherId,
    teacherName: structureData.teacherName,
    facultyId: structureData.facultyId,
    type: structureData.type,
    baseAmount: Math.round(structureData.baseAmount || 0),
    perLectureRate: Math.round(structureData.perLectureRate || 0),
    effectiveFrom: structureData.effectiveFrom || now,
    effectiveTo: null,
    createdBy: actor.uid,
    createdAt: now,
  };

  const docRef = doc(db, 'salaryStructures', structureId);
  await setDoc(docRef, cleanFirestoreData(newStructure));

  // Audit Log
  await logAuditEvent({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: (actor.role as any) || 'admin',
    targetId: structureData.teacherId,
    targetType: 'salary_structure',
    targetName: structureData.teacherName || 'Faculty Salary Structure',
    action: 'SALARY_STRUCTURE_CREATE',
    before: active ? (active as any) : {},
    after: newStructure as any,
    metadata: {
      structureId,
      type: newStructure.type,
      baseAmount: newStructure.baseAmount,
      perLectureRate: newStructure.perLectureRate,
    },
  });

  return newStructure;
}

// ==========================================
// 2. PAYROLL GENERATION & LIFECYCLE
// ==========================================

/**
 * Counts qualifying conducted lectures by a faculty member in a given month
 */
export async function getFacultyConductedLectureCount(
  teacherId: string,
  period: string
): Promise<number> {
  try {
    const db = getDb();
    const attendanceCol = collection(db, 'batch_attendance');
    const [year, month] = period.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`;

    const q = query(
      attendanceCol,
      where('markedBy', '==', teacherId),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (err) {
    console.warn('[PayrollService] Error counting faculty lectures:', err);
    return 0;
  }
}

/**
 * Generates or recalculates draft payroll records for a given period
 * Idempotent: Overwrites/updates draft records only. Leaves approved/paid records intact.
 */
export async function generatePayroll(
  period: string,
  teacherList: Teacher[],
  actor: ActorContext,
  targetTeacherIds?: string[]
): Promise<{ generated: PayrollRecord[]; skippedCount: number }> {
  const db = getDb();
  const generated: PayrollRecord[] = [];
  let skippedCount = 0;

  const filteredTeachers = targetTeacherIds && targetTeacherIds.length > 0
    ? teacherList.filter((t) => targetTeacherIds.includes(t.id))
    : teacherList.filter((t) => t.status !== 'on_leave');

  for (const teacher of filteredTeachers) {
    const docId = `${teacher.id}_${period}`;
    const docRef = doc(db, 'payroll', docId);
    const existingDoc = await getDoc(docRef);

    // If already approved or paid, do not overwrite unless cancelled
    if (existingDoc.exists()) {
      const data = existingDoc.data() as PayrollRecord;
      if (data.status === 'approved' || data.status === 'paid') {
        skippedCount++;
        continue;
      }
    }

    // Retrieve active salary structure
    const structure = await getActiveSalaryStructure(teacher.id);
    if (!structure) {
      console.warn(`[PayrollService] Teacher ${teacher.name} (${teacher.id}) has no salary structure. Skipping.`);
      skippedCount++;
      continue;
    }

    // Count lectures if per-lecture or hybrid
    let lectureCount = 0;
    if (structure.type === 'per_lecture' || structure.type === 'hybrid') {
      lectureCount = await getFacultyConductedLectureCount(teacher.id, period);
    }

    // Calculate with pure engine
    const calcResult = calculatePayroll({
      structure,
      period,
      lectureCount,
      joiningDate: teacher.joiningDate,
    });

    const now = new Date().toISOString();
    const payrollRecord: PayrollRecord = {
      id: docId,
      teacherId: teacher.id,
      teacherName: teacher.name,
      facultyId: teacher.facultyId,
      period,
      status: 'draft',
      lineItems: calcResult.lineItems,
      gross: calcResult.gross,
      totalDeductions: calcResult.totalDeductions,
      net: calcResult.net,
      structureSnapshot: structure,
      createdAt: existingDoc.exists() ? (existingDoc.data() as PayrollRecord).createdAt : now,
      updatedAt: now,
    };

    await setDoc(docRef, cleanFirestoreData(payrollRecord));
    generated.push(payrollRecord);

    // Audit Log
    await logAuditEvent({
      actorUid: actor.uid,
      actorEmail: actor.email,
      actorRole: (actor.role as any) || 'admin',
      targetId: docId,
      targetType: 'payroll',
      targetName: `Payroll ${period} — ${teacher.name}`,
      action: 'PAYROLL_GENERATE',
      before: existingDoc.exists() ? (existingDoc.data() as any) : null,
      after: payrollRecord as any,
      metadata: { period, teacherId: teacher.id, net: payrollRecord.net },
    });
  }

  return { generated, skippedCount };
}

/**
 * Bulk approves draft payroll records
 */
export async function approvePayroll(
  recordIds: string[],
  actor: ActorContext
): Promise<{ approvedCount: number }> {
  const db = getDb();
  let approvedCount = 0;
  const now = new Date().toISOString();

  for (const recordId of recordIds) {
    const docRef = doc(db, 'payroll', recordId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const current = snap.data() as PayrollRecord;
      if (current.status === 'draft') {
        const updated: Partial<PayrollRecord> = {
          status: 'approved',
          approvedBy: actor.uid,
          approvedAt: now,
          updatedAt: now,
        };

        await updateDoc(docRef, updated);
        approvedCount++;

        await logAuditEvent({
          actorUid: actor.uid,
          actorEmail: actor.email,
          actorRole: (actor.role as any) || 'admin',
          targetId: recordId,
          targetType: 'payroll',
          targetName: `Approved Payroll — ${current.teacherName || recordId}`,
          action: 'PAYROLL_APPROVE',
          before: current as any,
          after: { ...current, ...updated } as any,
          metadata: { recordId, period: current.period, net: current.net },
        });
      }
    }
  }

  return { approvedCount };
}

/**
 * Marks an approved payroll record as paid with payment reference
 */
export async function markPayrollAsPaid(
  recordId: string,
  paymentDetails: {
    paymentRef: string;
    paymentMode?: 'UPI' | 'Bank Transfer' | 'Cheque' | 'Cash';
    paidAt?: string;
    notes?: string;
  },
  actor: ActorContext
): Promise<PayrollRecord> {
  const db = getDb();
  const docRef = doc(db, 'payroll', recordId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error(`Payroll record "${recordId}" not found.`);
  }

  const current = snap.data() as PayrollRecord;
  if (current.status === 'paid') {
    throw new Error(`Payroll record "${recordId}" is already marked as paid.`);
  }

  const now = new Date().toISOString();
  const updated: Partial<PayrollRecord> = {
    status: 'paid',
    paymentRef: paymentDetails.paymentRef,
    paymentMode: paymentDetails.paymentMode || 'Bank Transfer',
    paidAt: paymentDetails.paidAt || now,
    notes: paymentDetails.notes,
    updatedAt: now,
  };

  await updateDoc(docRef, updated);
  const fullUpdated: PayrollRecord = { ...current, ...updated };

  await logAuditEvent({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: (actor.role as any) || 'admin',
    targetId: recordId,
    targetType: 'payroll',
    targetName: `Paid Payroll — ${current.teacherName || recordId}`,
    action: 'PAYROLL_PAY',
    before: current as any,
    after: fullUpdated as any,
    metadata: {
      recordId,
      period: current.period,
      paymentRef: paymentDetails.paymentRef,
      paymentMode: updated.paymentMode,
      net: current.net,
    },
  });

  return fullUpdated;
}

/**
 * Cancels a payroll record with reason
 */
export async function cancelPayroll(
  recordId: string,
  reason: string,
  actor: ActorContext
): Promise<PayrollRecord> {
  const db = getDb();
  const docRef = doc(db, 'payroll', recordId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error(`Payroll record "${recordId}" not found.`);
  }

  const current = snap.data() as PayrollRecord;
  const now = new Date().toISOString();
  const updated: Partial<PayrollRecord> = {
    status: 'cancelled',
    notes: reason ? `Cancelled: ${reason}` : 'Cancelled by administrator',
    updatedAt: now,
  };

  await updateDoc(docRef, updated);
  const fullUpdated: PayrollRecord = { ...current, ...updated };

  await logAuditEvent({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: (actor.role as any) || 'admin',
    targetId: recordId,
    targetType: 'payroll',
    targetName: `Cancelled Payroll — ${current.teacherName || recordId}`,
    action: 'PAYROLL_CANCEL',
    before: current as any,
    after: fullUpdated as any,
    metadata: { recordId, reason },
  });

  return fullUpdated;
}

/**
 * Updates adjustments or line items on a draft payroll record
 */
export async function updateDraftLineItems(
  recordId: string,
  lineItems: LineItem[],
  actor: ActorContext
): Promise<PayrollRecord> {
  const db = getDb();
  const docRef = doc(db, 'payroll', recordId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error(`Payroll record "${recordId}" not found.`);
  }

  const current = snap.data() as PayrollRecord;
  if (current.status !== 'draft') {
    throw new Error('Only draft payroll records can have line items adjusted.');
  }

  let gross = 0;
  let totalDeductions = 0;
  for (const item of lineItems) {
    if (item.type === 'earning') gross += item.amount;
    if (item.type === 'deduction') totalDeductions += item.amount;
  }
  const net = Math.max(0, gross - totalDeductions);
  const now = new Date().toISOString();

  const updated: Partial<PayrollRecord> = {
    lineItems,
    gross,
    totalDeductions,
    net,
    updatedAt: now,
  };

  await updateDoc(docRef, updated);
  return { ...current, ...updated };
}

/**
 * Fetches all payroll records for admin view
 */
export async function fetchAllPayrollRecords(period?: string): Promise<PayrollRecord[]> {
  try {
    const db = getDb();
    const colRef = collection(db, 'payroll');
    let q = query(colRef);

    if (period) {
      q = query(colRef, where('period', '==', period));
    }

    const snapshot = await getDocs(q);
    const records: PayrollRecord[] = [];
    snapshot.forEach((docSnap) => {
      records.push({ id: docSnap.id, ...(docSnap.data() as Omit<PayrollRecord, 'id'>) });
    });

    return records.sort((a, b) => b.period.localeCompare(a.period));
  } catch (err) {
    console.error('[PayrollService] fetchAllPayrollRecords error:', err);
    return [];
  }
}

/**
 * Fetches payroll records for faculty portal (only approved and paid records)
 */
export async function fetchFacultyPayrollRecords(teacherId: string): Promise<PayrollRecord[]> {
  try {
    const db = getDb();
    const colRef = collection(db, 'payroll');
    const q = query(
      colRef,
      where('teacherId', '==', teacherId),
      where('status', 'in', ['approved', 'paid'])
    );

    const snapshot = await getDocs(q);
    const records: PayrollRecord[] = [];
    snapshot.forEach((docSnap) => {
      records.push({ id: docSnap.id, ...(docSnap.data() as Omit<PayrollRecord, 'id'>) });
    });

    return records.sort((a, b) => b.period.localeCompare(a.period));
  } catch (err) {
    console.error('[PayrollService] fetchFacultyPayrollRecords error:', err);
    return [];
  }
}
