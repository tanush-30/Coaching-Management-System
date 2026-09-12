'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo } from 'react';
import { TeacherPortal } from '@/components/portal/TeacherPortal';
import { useERPStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { Loader2, ShieldAlert } from 'lucide-react';
import type { TeacherClaims } from '@/lib/types';

export default function TeacherPage() {
  const { user, role, claims, loading: authLoading } = useAuth();
  const {
    teachers,
    batches,
    students,
    homework,
    addHomework,
    attendance,
    exams,
    marks,
    markBatchAttendance,
    createExam,
    saveExamMarks,
  } = useERPStore();

  // Find the exact authenticated teacher record
  const currentTeacher = useMemo(() => {
    if (!teachers || teachers.length === 0) return null;

    const teacherClaims = claims as TeacherClaims | null;
    const claimBatchIds = teacherClaims?.batchIds || [];
    const customId = teacherClaims?.customId;
    const userEmail = (user?.email || '').toLowerCase().trim();
    const userUid = user?.uid;
    const emailPrefix = userEmail.split('@')[0].toLowerCase();
    const cleanEmailPrefix = emailPrefix.replace(/[^a-z0-9]/g, '');

    return (
      teachers.find((t) => {
        const cleanFacId = (t.facultyId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanDocId = (t.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        if ((t as any).authUid && (t as any).authUid === userUid) return true;
        if (t.id === userUid) return true;
        if (customId && t.facultyId && t.facultyId.toUpperCase() === customId.toUpperCase()) return true;
        if (userEmail && t.email && t.email.toLowerCase() === userEmail) return true;
        if (emailPrefix && t.facultyId && t.facultyId.toLowerCase() === emailPrefix) return true;
        if (cleanEmailPrefix && cleanFacId && (cleanEmailPrefix === cleanFacId || cleanEmailPrefix.includes(cleanFacId) || cleanFacId.includes(cleanEmailPrefix))) return true;
        if (cleanEmailPrefix && cleanDocId && cleanEmailPrefix === cleanDocId) return true;
        if (claimBatchIds.length > 0 && (t.assignedBatches || []).some((bId) => claimBatchIds.includes(bId))) return true;
        return false;
      }) || (role === 'admin' ? teachers[0] : null)
    );
  }, [teachers, user, claims, role]);

  // Compute strictly assigned batches for this teacher
  const assignedBatches = useMemo(() => {
    if (!currentTeacher) return role === 'admin' ? batches : [];
    const teacherBatchIds = new Set(currentTeacher.assignedBatches || []);
    return batches.filter((b) => teacherBatchIds.has(b.id) || b.teacherId === currentTeacher.id);
  }, [batches, currentTeacher, role]);

  const assignedBatchIds = useMemo(() => {
    return new Set(assignedBatches.map((b) => b.id));
  }, [assignedBatches]);

  // Strictly filter students: Teacher ONLY sees students in their assigned batches
  const scopedStudents = useMemo(() => {
    if (role === 'admin') return students;
    return students.filter((s) => (s.batchIds || []).some((bId) => assignedBatchIds.has(bId)));
  }, [students, assignedBatchIds, role]);

  // Strictly filter homework to this teacher's batches
  const scopedHomework = useMemo(() => {
    if (role === 'admin') return homework;
    return homework.filter((h) => assignedBatchIds.has(h.batchId) || (currentTeacher && h.teacherName === currentTeacher.name));
  }, [homework, assignedBatchIds, currentTeacher, role]);

  // Strictly filter exams to this teacher's batches
  const scopedExams = useMemo(() => {
    if (role === 'admin') return exams;
    return exams.filter((e) => assignedBatchIds.has(e.batchId));
  }, [exams, assignedBatchIds, role]);

  // Strictly filter marks to this teacher's exams
  const scopedMarks = useMemo(() => {
    if (role === 'admin') return marks;
    const scopedExamIds = new Set(scopedExams.map((e) => e.id));
    return marks.filter((m) => scopedExamIds.has(m.examId));
  }, [marks, scopedExams, role]);

  // Strictly filter attendance history to this teacher's batches
  const scopedAttendance = useMemo(() => {
    if (role === 'admin') return attendance;
    return attendance.filter((a) => assignedBatchIds.has(a.batchId));
  }, [attendance, assignedBatchIds, role]);

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-500 font-medium">Authenticating faculty workspace...</p>
      </div>
    );
  }

  if (!currentTeacher && role !== 'admin') {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="font-extrabold text-xl text-slate-900">Faculty Profile Not Linked</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Your account is logged in, but we could not find an active faculty member record matching your credentials. Please contact your coaching center administrator.
        </p>
      </div>
    );
  }

  return (
    <TeacherPortal
      teachers={currentTeacher ? [currentTeacher] : teachers}
      batches={assignedBatches}
      students={scopedStudents}
      homework={scopedHomework}
      attendance={scopedAttendance}
      exams={scopedExams}
      marks={scopedMarks}
      onAddHomework={addHomework}
      onMarkAttendance={markBatchAttendance}
      onCreateExam={createExam}
      onSaveMarks={saveExamMarks}
    />
  );
}
