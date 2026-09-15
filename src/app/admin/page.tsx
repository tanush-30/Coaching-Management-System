'use client';

import React, { useState } from 'react';
import { AdminSidebar, AdminTab } from '@/components/erp/AdminSidebar';
import { AdminTopBar } from '@/components/erp/AdminTopBar';
import { AdminDashboard } from '@/components/erp/AdminDashboard';
import { StudentManagement } from '@/components/erp/StudentManagement';
import { TeacherManagement } from '@/components/erp/TeacherManagement';
import { BatchManagement } from '@/components/erp/BatchManagement';
import { FeeManagement } from '@/components/erp/FeeManagement';
import { PayrollManagement } from '@/components/erp/PayrollManagement';
import { AttendanceManagement } from '@/components/erp/AttendanceManagement';
import { WhatsAppAutomationHub } from '@/components/erp/WhatsAppAutomationHub';
import { AcademicManagement } from '@/components/erp/AcademicManagement';
import { TimetableManagement } from '@/components/erp/TimetableManagement';
import { AdminAnalytics } from '@/components/erp/AdminAnalytics';
import { ReportsManagement } from '@/components/erp/ReportsManagement';
import { AuditLogsManagement } from '@/components/erp/AuditLogsManagement';
import { SettingsManagement } from '@/components/erp/SettingsManagement';
import { AddStudentModal } from '@/components/erp/AddStudentModal';
import { AddTeacherModal } from '@/components/erp/AddTeacherModal';
import { AddBatchModal } from '@/components/erp/AddBatchModal';
import { AnnouncementComposerModal } from '@/components/erp/AnnouncementComposerModal';
import { ChangePasswordModal } from '@/components/portal/ChangePasswordModal';
import { useERPStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading, role } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  // Auto-redirect unauthenticated users to the admin login page
  React.useEffect(() => {
    if (!authLoading && !user && isFirebaseConfigured) {
      router.replace('/login/admin');
    }
  }, [user, authLoading, router]);

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  const {
    students,
    batches,
    teachers,
    installments,
    attendance,
    exams,
    marks,
    homework,
    submissions,
    whatsappLogs,
    timetableSlots,
    announcements,
    addStudent,
    updateStudent,
    deleteStudent,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    addBatch,
    updateBatch,
    deleteBatch,
    markBatchAttendance,
    createExam,
    saveExamMarks,
    sendBroadcastMessage,
    addAnnouncement,
    deleteAnnouncement,
    recordPayment,
    sendFeeReminder,
    addTimetableSlot,
    updateTimetableSlot,
    deleteTimetableSlot,
  } = useERPStore();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm font-semibold text-slate-300">Verifying Admin Session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Collapsible / Responsive Left Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        studentCount={students.length}
        teacherCount={teachers.length}
        batchCount={batches.length}
        examCount={exams.length}
        slotCount={timetableSlots.length}
        whatsappCount={whatsappLogs.length}
        onOpenEnrollStudent={() => setIsEnrollModalOpen(true)}
        onOpenEnrollTeacher={() => setIsTeacherModalOpen(true)}
        onOpenCreateBatch={() => setIsBatchModalOpen(true)}
        onChangePassword={() => setIsChangePasswordOpen(true)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Streamlined Top App Bar */}
        <AdminTopBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenEnrollStudent={() => setIsEnrollModalOpen(true)}
          onOpenEnrollTeacher={() => setIsTeacherModalOpen(true)}
          onOpenCreateBatch={() => setIsBatchModalOpen(true)}
        />

        {/* Dynamic ERP Module Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 animate-fadeIn">
          {activeTab === 'dashboard' && (
            <AdminDashboard
              students={students}
              batches={batches}
              teachers={teachers}
              installments={installments}
              whatsappLogs={whatsappLogs}
              onNavigateTab={(tab: string) => setActiveTab(tab as AdminTab)}
              onOpenEnrollModal={() => setIsEnrollModalOpen(true)}
              onOpenTeacherModal={() => setIsTeacherModalOpen(true)}
              onOpenBatchModal={() => setIsBatchModalOpen(true)}
              onOpenAnnouncementModal={() => setIsAnnouncementModalOpen(true)}
            />
          )}

          {activeTab === 'students' && (
            <StudentManagement
              students={students}
              batches={batches}
              installments={installments}
              onAddStudent={addStudent}
              onUpdateStudent={updateStudent}
              onDeleteStudent={deleteStudent}
              onRecordPayment={recordPayment}
            />
          )}

          {activeTab === 'teachers' && (
            <TeacherManagement
              teachers={teachers}
              batches={batches}
              onAddTeacher={addTeacher}
              onUpdateTeacher={updateTeacher}
              onDeleteTeacher={deleteTeacher}
            />
          )}

          {activeTab === 'batches' && (
            <BatchManagement
              batches={batches}
              teachers={teachers}
              students={students}
              onAddBatch={addBatch}
              onUpdateBatch={updateBatch}
              onDeleteBatch={deleteBatch}
            />
          )}

          {activeTab === 'fees' && (
            <FeeManagement
              installments={installments}
              students={students}
              onRecordPayment={recordPayment}
              onSendReminder={sendFeeReminder}
            />
          )}

          {activeTab === 'payroll' && (
            <PayrollManagement
              teachers={teachers}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceManagement
              batches={batches}
              students={students}
              teachers={teachers}
              attendanceHistory={attendance}
              userRole="admin"
              onMarkAttendance={markBatchAttendance}
            />
          )}

          {activeTab === 'academics' && (
            <AcademicManagement
              exams={exams}
              marks={marks}
              batches={batches}
              students={students}
              userRole="admin"
              onCreateExam={createExam}
              onSaveMarks={saveExamMarks}
            />
          )}

          {activeTab === 'timetable' && (
            <TimetableManagement
              batches={batches}
              teachers={teachers}
              timetableSlots={timetableSlots}
              onAddSlot={addTimetableSlot}
              onUpdateSlot={updateTimetableSlot}
              onDeleteSlot={deleteTimetableSlot}
              onSendBroadcast={sendBroadcastMessage}
            />
          )}

          {activeTab === 'analytics' && (
            <AdminAnalytics
              students={students}
              batches={batches}
              installments={installments}
              marks={marks}
              attendance={attendance}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsManagement
              students={students}
              batches={batches}
              teachers={teachers}
              attendance={attendance}
              exams={exams}
              marks={marks}
              homework={homework || []}
              homeworkSubmissions={submissions || []}
              timetableSlots={timetableSlots}
            />
          )}

          {activeTab === 'whatsapp' && (
            <WhatsAppAutomationHub
              whatsappLogs={whatsappLogs}
              batches={batches}
              onSendBroadcast={sendBroadcastMessage}
              onOpenAnnouncementComposer={() => setIsAnnouncementModalOpen(true)}
            />
          )}

          {activeTab === 'settings' && <SettingsManagement />}

          {activeTab === 'audit' && <AuditLogsManagement />}
        </main>
      </div>

      {/* Global Modals */}
      <AddStudentModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        batches={batches}
        students={students}
        onAddStudent={addStudent}
      />

      <AddTeacherModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        batches={batches}
        teachers={teachers}
        onAddTeacher={addTeacher}
      />

      <AddBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        teachers={teachers}
        batches={batches}
        onAddBatch={addBatch}
      />

      <AnnouncementComposerModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        batches={batches}
        students={students}
        teachers={teachers}
        onSaveAnnouncement={addAnnouncement}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        userRoleTitle="Administrator"
      />
    </div>
  );
}
