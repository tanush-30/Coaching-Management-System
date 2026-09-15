'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo, useState, useEffect } from 'react';
import { StudentPortal } from '@/components/portal/StudentPortal';
import { useERPStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { Loader2, ShieldAlert, LogOut, Home as HomeIcon } from 'lucide-react';
import type { StudentClaims, Student } from '@/lib/types';
import Link from 'next/link';

export default function StudentPage() {
  const { user, role, claims, loading: authLoading, signOutUser } = useAuth();
  const {
    students,
    batches,
    homework,
    submissions,
    materials,
    exams,
    marks,
    attendance,
    installments,
    timetableSlots,
    announcements,
    submitHomework,
  } = useERPStore();

  const [apiStudent, setApiStudent] = useState<Student | null>(null);
  const [isFetchingApi, setIsFetchingApi] = useState(false);

  // Fallback direct server-side lookup via /api/students/[id]
  useEffect(() => {
    if (!user || role === 'admin') return;

    const studentClaims = claims as StudentClaims | null;
    const lookupId = studentClaims?.studentId || studentClaims?.customId || user.uid;

    if (!lookupId) return;

    let isMounted = true;
    setIsFetchingApi(true);

    fetch(`/api/students/${lookupId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && !data.error) {
          setApiStudent(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsFetchingApi(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user, claims, role]);

  // Find the exact authenticated student record
  const currentStudent = useMemo(() => {
    const studentClaims = claims as StudentClaims | null;
    const studentClaimId = studentClaims?.studentId;
    const customId = studentClaims?.customId;
    const userEmail = (user?.email || '').toLowerCase().trim();
    const userUid = user?.uid;
    const emailPrefix = userEmail.split('@')[0].toLowerCase();
    const cleanEmailPrefix = emailPrefix.replace(/[^a-z0-9]/g, '');

    const foundInStore = (students || []).find((s) => {
      const cleanRoll = (s.rollNo || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanDocId = (s.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      if (studentClaimId && (s.id === studentClaimId || s.rollNo?.toUpperCase() === studentClaimId.toUpperCase())) return true;
      if ((s as any).authUid && (s as any).authUid === userUid) return true;
      if (s.id === userUid) return true;
      if (customId && s.rollNo && s.rollNo.toUpperCase() === customId.toUpperCase()) return true;
      if (userEmail && s.email && s.email.toLowerCase() === userEmail) return true;
      if (emailPrefix && s.rollNo && s.rollNo.toLowerCase() === emailPrefix) return true;
      if (cleanEmailPrefix && cleanRoll && (cleanEmailPrefix === cleanRoll || cleanEmailPrefix.includes(cleanRoll) || cleanRoll.includes(cleanEmailPrefix))) return true;
      if (cleanEmailPrefix && cleanDocId && cleanEmailPrefix === cleanDocId) return true;
      return false;
    });

    if (foundInStore) return foundInStore;
    if (apiStudent) return apiStudent;
    if (role === 'admin' && students && students.length > 0) return students[0];
    return null;
  }, [students, apiStudent, user, claims, role]);

  if (authLoading || isFetchingApi) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        <p className="text-sm text-slate-500 font-medium">Authenticating student profile...</p>
      </div>
    );
  }

  if (!currentStudent && role !== 'admin') {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-5 shadow-xl max-w-2xl mx-auto my-12 animate-scale-in">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-extrabold text-2xl text-slate-900">Student Profile Not Linked</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
            Your login account ({user?.email || user?.uid}) is active, but is not yet linked to an enrolled student record in the coaching database.
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-left text-slate-600 space-y-2">
          <p className="font-bold text-slate-800">Why are you seeing this?</p>
          <p>
            Due to privacy and student-data security, students can only view their own attendance, homework, and test scores once enrolled by the administrator.
          </p>
          <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
            <strong>How to resolve:</strong>
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              <li>Log in as <strong>Admin</strong>, go to the <strong>Students</strong> directory, and verify this student is enrolled.</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => signOutUser('/login/student')}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out / Switch Account</span>
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
          >
            <HomeIcon className="w-3.5 h-3.5" />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    );
  }

  // Strictly scoped data: only this student's batches, homework, materials, and test marks
  const studentBatchIds = currentStudent ? currentStudent.batchIds || [] : [];
  const scopedHomework = homework.filter((h) => studentBatchIds.includes(h.batchId));
  const scopedMaterials = materials.filter((m: any) => studentBatchIds.includes(m.batchId));
  const scopedMarks = currentStudent
    ? marks.filter((m) => {
        const matchesId = m.studentId === currentStudent.id;
        const matchesRoll = currentStudent.rollNo && (m.rollNo === currentStudent.rollNo || m.studentId === currentStudent.rollNo);
        const matchesAuthUid = (m as any).authUid && (m as any).authUid === currentStudent.id;
        const isPublished = m.status === 'final' || (m as any).status === 'evaluated' || !m.status;
        return (matchesId || matchesRoll || matchesAuthUid) && isPublished;
      })
    : [];

  return (
    <StudentPortal
      students={currentStudent ? [currentStudent] : students}
      batches={batches}
      homework={scopedHomework}
      submissions={submissions}
      materials={scopedMaterials}
      exams={exams}
      marks={scopedMarks}
      attendance={attendance}
      installments={installments}
      timetableSlots={timetableSlots}
      announcements={announcements}
      onSubmitHomework={submitHomework}
    />
  );
}
