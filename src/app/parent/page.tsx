'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo } from 'react';
import { ParentPortal } from '@/components/portal/ParentPortal';
import { useERPStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { Loader2, ShieldAlert } from 'lucide-react';
import type { ParentClaims } from '@/lib/types';

export default function ParentPage() {
  const { user, role, claims, loading: authLoading } = useAuth();
  const {
    students,
    batches,
    installments,
    attendance,
    exams,
    marks,
    homework,
    submissions,
    timetableSlots,
    announcements,
    recordPayment,
  } = useERPStore();

  // Find the parent's linked children
  const linkedStudents = useMemo(() => {
    if (!students || students.length === 0) return [];
    if (role === 'admin') return students;

    const parentClaims = claims as ParentClaims | null;
    const claimChildIds = parentClaims?.childIds || [];
    const parentPhoneClean = (user?.phoneNumber || '').replace(/[^0-9]/g, '');
    const userEmail = (user?.email || '').toLowerCase();

    const matched = students.filter((s) => {
      if (claimChildIds.includes(s.id)) return true;
      if (userEmail && s.parentEmail && s.parentEmail.toLowerCase() === userEmail) return true;
      const studentParentPhoneClean = (s.parentPhone || '').replace(/[^0-9]/g, '');
      if (
        parentPhoneClean.length >= 10 &&
        studentParentPhoneClean.length >= 10 &&
        (parentPhoneClean.endsWith(studentParentPhoneClean) || studentParentPhoneClean.endsWith(parentPhoneClean))
      ) {
        return true;
      }
      return false;
    });

    return matched.length > 0 ? matched : [];
  }, [students, user, claims, role]);

  const linkedStudentIds = useMemo(() => {
    return new Set(linkedStudents.map((s) => s.id));
  }, [linkedStudents]);

  const linkedBatchIds = useMemo(() => {
    const bSet = new Set<string>();
    linkedStudents.forEach((s) => {
      (s.batchIds || []).forEach((bId) => bSet.add(bId));
    });
    return bSet;
  }, [linkedStudents]);

  // Strictly filter data to only the parent's children
  const scopedInstallments = useMemo(() => {
    if (role === 'admin') return installments;
    return installments.filter((i) => linkedStudentIds.has(i.studentId));
  }, [installments, linkedStudentIds, role]);

  const scopedMarks = useMemo(() => {
    if (role === 'admin') return marks;
    return marks.filter((m) => linkedStudentIds.has(m.studentId));
  }, [marks, linkedStudentIds, role]);

  const scopedHomework = useMemo(() => {
    if (role === 'admin') return homework;
    return homework.filter((h) => linkedBatchIds.has(h.batchId));
  }, [homework, linkedBatchIds, role]);

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        <p className="text-sm text-slate-500 font-medium">Authenticating parent portal...</p>
      </div>
    );
  }

  if (linkedStudents.length === 0 && role !== 'admin') {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="font-extrabold text-xl text-slate-900">No Enrolled Ward Found</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Your parent login is active, but we could not find an enrolled student record linked to your phone number or email. Please contact the coaching administration to link your ward.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <ParentPortal
        students={linkedStudents}
        batches={batches}
        installments={scopedInstallments}
        attendance={attendance}
        exams={exams}
        marks={scopedMarks}
        homework={scopedHomework}
        submissions={submissions}
        timetableSlots={timetableSlots}
        announcements={announcements}
        onRecordPayment={recordPayment}
      />
    </div>
  );
}
