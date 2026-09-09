'use client';

// Force dynamic rendering — this page depends on Firebase Auth and must never be
// statically pre-rendered at build time (Firebase Client SDK is browser-only)
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { 
  Sparkles, 
  Compass, 
  LayoutDashboard, 
  Users, 
  Layers, 
  CreditCard, 
  GraduationCap, 
  Clock, 
  MessageSquare, 
  BookOpen, 
  TrendingUp, 
  Rocket, 
  RotateCcw, 
  Plus,
  LogOut,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { DiscoveryBlueprintView } from '@/components/discovery/DiscoveryBlueprintView';
import { AdminDashboard } from '@/components/erp/AdminDashboard';
import { StudentManagement } from '@/components/erp/StudentManagement';
import { BatchManagement } from '@/components/erp/BatchManagement';
import { FeeManagement } from '@/components/erp/FeeManagement';
import { AttendanceManagement } from '@/components/erp/AttendanceManagement';
import { WhatsAppAutomationHub } from '@/components/erp/WhatsAppAutomationHub';
import { AcademicManagement } from '@/components/erp/AcademicManagement';
import { AdminAnalytics } from '@/components/erp/AdminAnalytics';
import { ParentPortal } from '@/components/portal/ParentPortal';
import { StudentPortal } from '@/components/portal/StudentPortal';
import { TeacherPortal } from '@/components/portal/TeacherPortal';
import { LaunchAndTrainingCenter } from '@/components/launch/LaunchAndTrainingCenter';
import { AddStudentModal } from '@/components/erp/AddStudentModal';
import { AddBatchModal } from '@/components/erp/AddBatchModal';
import { useERPStore } from '@/lib/store';
import { UserRole } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const { user, role: userRole } = useAuth();
  const [activeMainTab, setActiveMainTab] = useState<'phase0' | 'live_erp' | 'phase6_launch'>('live_erp');
  const [activeErpSubTab, setActiveErpSubTab] = useState<'dashboard' | 'students' | 'batches' | 'fees' | 'attendance' | 'academics' | 'analytics' | 'whatsapp'>('dashboard');
  const [activeRole, setActiveRole] = useState<UserRole>('admin');

  // Handle Logout
  const handleSignOut = async () => {
    try {
      if (isFirebaseConfigured) {
        await signOut(auth);
      }
    } catch {
      // Ignore
    }
    // Clear session cookie
    document.cookie = 'apex_session=; path=/; max-age=0';
    router.replace('/login');
  };

  // Modals
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Store
  const {
    students,
    batches,
    teachers,
    installments,
    attendance,
    exams,
    marks,
    homework,
    materials,
    whatsappLogs,
    addStudent,
    updateStudent,
    deleteStudent,
    addBatch,
    updateBatch,
    deleteBatch,
    markBatchAttendance,
    createExam,
    saveExamMarks,
    addHomework,
    sendBroadcastMessage,
    recordPayment,
    sendFeeReminder,
    resetToDefaults,
  } = useERPStore();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-sky-500 flex items-center justify-center text-white font-extrabold shadow-md shadow-indigo-600/20">
              <span className="text-lg">🎓</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900">ApexERP</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  All Phases 0–6 Complete
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Coaching Management & WhatsApp OS</p>
            </div>
          </div>

          {/* Master Phase Switcher Navigation */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveMainTab('phase0')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeMainTab === 'phase0'
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Phase 0: Blueprint</span>
            </button>
            <button
              onClick={() => setActiveMainTab('live_erp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeMainTab === 'live_erp'
                  ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Management ERP</span>
            </button>
            <button
              onClick={() => setActiveMainTab('phase6_launch')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeMainTab === 'phase6_launch'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Phase 6: Launch & UAT</span>
            </button>
          </div>

          {/* User Auth & 4-Role Persona Switcher Header */}
          <div className="flex items-center gap-2">
            {/* User Profile Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100/90 border border-slate-200/90 rounded-2xl text-xs font-semibold text-slate-700">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-slate-600 max-w-[140px] truncate">
                {user?.email || user?.phoneNumber || 'Admin (Demo Mode)'}
              </span>
            </div>

            {/* Role Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold">
              <span className="text-[10px] font-bold text-slate-400 uppercase px-1.5">Role:</span>
              {(['admin', 'teacher', 'parent', 'student'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    setActiveRole(role);
                    setActiveMainTab('live_erp');
                  }}
                  className={`capitalize px-2.5 py-1 rounded-xl transition-all ${
                    activeRole === role
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {role === 'admin' ? 'Admin' : role === 'teacher' ? 'Teacher' : role === 'parent' ? 'Parent' : 'Student'}
                </button>
              ))}
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-xs"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation for Admin Mode */}
        {activeMainTab === 'live_erp' && activeRole === 'admin' && (
          <div className="bg-slate-50 border-t border-slate-200/80 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto py-2">
              <div className="flex items-center gap-1">
                {[
                  { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
                  { id: 'students', label: `Students (${students.length})`, icon: Users },
                  { id: 'batches', label: `Batches (${batches.length})`, icon: Layers },
                  { id: 'fees', label: 'Fees & Invoicing', icon: CreditCard },
                  { id: 'attendance', label: 'Attendance', icon: Clock },
                  { id: 'academics', label: `Academics & Tests (${exams.length})`, icon: BookOpen },
                  { id: 'analytics', label: 'Business Analytics', icon: TrendingUp },
                  { id: 'whatsapp', label: `WhatsApp Hub (${whatsappLogs.length})`, icon: MessageSquare, badge: 'Live' },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = activeErpSubTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveErpSubTab(tab.id as any)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        isSelected
                          ? 'bg-white text-indigo-600 shadow-xs border border-slate-200 scale-[1.02]'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-extrabold bg-emerald-100 text-emerald-800">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => setIsEnrollModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-xs transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Enroll Student</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeMainTab === 'phase0' ? (
          <DiscoveryBlueprintView onProceedToPhase1={() => setActiveMainTab('live_erp')} />
        ) : activeMainTab === 'phase6_launch' ? (
          /* PHASE 6 LAUNCH & TRAINING CENTER */
          <LaunchAndTrainingCenter />
        ) : activeRole === 'teacher' ? (
          /* TEACHER DEDICATED PORTAL (Phase 5) */
          <TeacherPortal
            teachers={teachers}
            batches={batches}
            students={students}
            homework={homework}
            onAddHomework={addHomework}
            onNavigateAttendance={() => {
              setActiveRole('admin');
              setActiveErpSubTab('attendance');
            }}
            onNavigateAcademics={() => {
              setActiveRole('admin');
              setActiveErpSubTab('academics');
            }}
          />
        ) : activeRole === 'parent' ? (
          /* PARENT DEDICATED PORTAL (Phase 4) */
          <ParentPortal
            students={students}
            batches={batches}
            installments={installments}
            attendance={attendance}
            exams={exams}
            marks={marks}
            homework={homework}
            onRecordPayment={recordPayment}
          />
        ) : activeRole === 'student' ? (
          /* STUDENT DEDICATED PORTAL (Phase 4) */
          <StudentPortal
            students={students}
            batches={batches}
            homework={homework}
            materials={materials}
            exams={exams}
            marks={marks}
          />
        ) : (
          /* ADMIN PORTAL (Phases 1, 2, 3, 5) */
          <div className="space-y-6 animate-fade-in">
            {activeErpSubTab === 'dashboard' && (
              <AdminDashboard
                students={students}
                batches={batches}
                installments={installments}
                whatsappLogs={whatsappLogs}
                onNavigateTab={(tab: string) => setActiveErpSubTab(tab as any)}
                onOpenEnrollModal={() => setIsEnrollModalOpen(true)}
                onOpenBatchModal={() => setIsBatchModalOpen(true)}
              />
            )}

            {activeErpSubTab === 'students' && (
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

            {activeErpSubTab === 'batches' && (
              <BatchManagement
                batches={batches}
                students={students}
                teachers={teachers}
                onAddBatch={addBatch}
                onUpdateBatch={updateBatch}
                onDeleteBatch={deleteBatch}
              />
            )}

            {activeErpSubTab === 'fees' && (
              <FeeManagement
                installments={installments}
                students={students}
                onRecordPayment={recordPayment}
                onSendReminder={sendFeeReminder}
              />
            )}

            {activeErpSubTab === 'attendance' && (
              <AttendanceManagement
                batches={batches}
                students={students}
                teachers={teachers}
                attendanceHistory={attendance}
                onMarkAttendance={markBatchAttendance}
              />
            )}

            {activeErpSubTab === 'academics' && (
              <AcademicManagement
                exams={exams}
                marks={marks}
                batches={batches}
                students={students}
                onCreateExam={createExam}
                onSaveMarks={saveExamMarks}
              />
            )}

            {activeErpSubTab === 'analytics' && (
              <AdminAnalytics
                students={students}
                batches={batches}
                installments={installments}
                marks={marks}
              />
            )}

            {activeErpSubTab === 'whatsapp' && (
              <WhatsAppAutomationHub
                whatsappLogs={whatsappLogs}
                batches={batches}
                onSendBroadcast={sendBroadcastMessage}
              />
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <AddStudentModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        batches={batches}
        onAddStudent={addStudent}
      />

      <AddBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        teachers={teachers}
        onAddBatch={addBatch}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Apex Coaching Center Management System — Full Master Plan (Phases 0–6) Delivered</span>
          <span>30-Day Support Window & Hypercare Active ✓</span>
        </div>
      </footer>
    </div>
  );
}
