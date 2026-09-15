'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  CreditCard,
  BellRing,
  GraduationCap,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Globe,
  Mail,
  Phone,
  MapPin,
  QrCode,
  Sparkles,
  Plus,
  Trash2,
  Eye,
  Sliders,
  ShieldCheck,
  Tag,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  SchoolInfoSettings,
  FeeStructureSettings,
  NotificationTemplatesSettings,
  GradingScaleSettings,
  InstallmentPlanOption,
  GradeBoundary,
  NotificationTemplateItem,
} from '@/lib/types';
import {
  getSchoolInfoSettings,
  saveSchoolInfoSettings,
  getFeeStructureSettings,
  saveFeeStructureSettings,
  getNotificationTemplatesSettings,
  saveNotificationTemplatesSettings,
  getGradingScaleSettings,
  saveGradingScaleSettings,
  interpolateTemplate,
} from '@/lib/settings-service';
import {
  DEFAULT_SCHOOL_INFO,
  DEFAULT_FEE_STRUCTURE,
  DEFAULT_NOTIFICATION_TEMPLATES,
  DEFAULT_GRADING_SCALE,
} from '@/lib/settings-defaults';
import {
  validateSchoolInfo,
  validateFeeStructure,
  validateNotificationTemplates,
  validateGradingScale,
  ValidationError,
} from '@/lib/settings-validator';
import { useAuth } from '@/lib/auth-context';

type SettingsTab = 'schoolInfo' | 'feeStructure' | 'notificationTemplates' | 'gradingScale';

interface ImpactModalInfo {
  title: string;
  description: string;
  impactPoints: string[];
  onConfirm: () => Promise<void>;
}

export function SettingsManagement() {
  const { user } = useAuth();
  const actorEmail = user?.email || 'admin@apexcoaching.com';

  const [activeTab, setActiveTab] = useState<SettingsTab>('schoolInfo');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // High-Impact Safety Confirmation Modal State
  const [confirmModalInfo, setConfirmModalInfo] = useState<ImpactModalInfo | null>(null);

  // Category State
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfoSettings>(DEFAULT_SCHOOL_INFO);
  const [feeStructure, setFeeStructure] = useState<FeeStructureSettings>(DEFAULT_FEE_STRUCTURE);
  const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplatesSettings>(DEFAULT_NOTIFICATION_TEMPLATES);
  const [gradingScale, setGradingScale] = useState<GradingScaleSettings>(DEFAULT_GRADING_SCALE);

  // Selected Notification Template Category to Edit
  const [activeTemplateKey, setActiveTemplateKey] = useState<keyof NotificationTemplatesSettings['templates']>('absenceAlert');

  // Load all settings on mount
  useEffect(() => {
    async function loadAllSettings() {
      setIsLoading(true);
      try {
        const [info, fee, notif, grade] = await Promise.all([
          getSchoolInfoSettings(),
          getFeeStructureSettings(),
          getNotificationTemplatesSettings(),
          getGradingScaleSettings(),
        ]);
        setSchoolInfo(info);
        setFeeStructure(fee);
        setNotificationTemplates(notif);
        setGradingScale(grade);
      } catch (err) {
        console.error('Failed to load settings:', err);
        setSaveError('Failed to load settings from cloud. Local offline defaults active.');
      } finally {
        setIsLoading(false);
      }
    }

    loadAllSettings();
  }, []);

  // Clear feedback messages after 4 seconds
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  useEffect(() => {
    if (saveError) {
      const timer = setTimeout(() => setSaveError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [saveError]);

  // Actual Commit to Cloud
  const executeSave = async (tab: SettingsTab) => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    setValidationErrors([]);

    try {
      if (tab === 'schoolInfo') {
        const updated = await saveSchoolInfoSettings(schoolInfo, actorEmail);
        setSchoolInfo(updated);
        setSaveSuccess('School Info & branding configurations saved successfully.');
      } else if (tab === 'feeStructure') {
        const updated = await saveFeeStructureSettings(feeStructure, actorEmail);
        setFeeStructure(updated);
        setSaveSuccess('Fee Structure & late fee rules saved successfully.');
      } else if (tab === 'notificationTemplates') {
        const updated = await saveNotificationTemplatesSettings(notificationTemplates, actorEmail);
        setNotificationTemplates(updated);
        setSaveSuccess('Notification message templates saved successfully.');
      } else if (tab === 'gradingScale') {
        const updated = await saveGradingScaleSettings(gradingScale, actorEmail);
        setGradingScale(updated);
        setSaveSuccess('Grading scale & academic evaluation thresholds saved successfully.');
      }
    } catch (err: unknown) {
      console.error('Save failed:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to persist changes. Please retry.');
    } finally {
      setIsSaving(false);
      setConfirmModalInfo(null);
    }
  };

  // Validate and Trigger Save / Safety Prompt
  const handleSaveCurrentTab = async () => {
    setValidationErrors([]);
    setSaveError(null);

    // 1. Run Pre-Validation
    let validationResult = { isValid: true, errors: [] as ValidationError[] };
    if (activeTab === 'schoolInfo') validationResult = validateSchoolInfo(schoolInfo);
    if (activeTab === 'feeStructure') validationResult = validateFeeStructure(feeStructure);
    if (activeTab === 'notificationTemplates') validationResult = validateNotificationTemplates(notificationTemplates);
    if (activeTab === 'gradingScale') validationResult = validateGradingScale(gradingScale);

    if (!validationResult.isValid) {
      setValidationErrors(validationResult.errors);
      setSaveError(`Validation blocked: ${validationResult.errors[0]?.message}`);
      return;
    }

    // 2. High-Impact Confirmation Prompt for Fee Structure
    if (activeTab === 'feeStructure') {
      setConfirmModalInfo({
        title: 'Confirm Invoicing & Fee Scheme Updates',
        description: 'You are modifying installment distribution schemes or penalty rules.',
        impactPoints: [
          'Existing student ledgers and already-issued installments will retain their original due dates and amounts.',
          'New batch admissions will automatically adopt the new installment distributions.',
          'Late fee penalties will calculate according to new grace periods for upcoming unpaid installments.',
        ],
        onConfirm: async () => {
          await executeSave('feeStructure');
        },
      });
      return;
    }

    // 3. High-Impact Confirmation Prompt for Grading Scale
    if (activeTab === 'gradingScale') {
      setConfirmModalInfo({
        title: 'Confirm Academic Grading Criteria Updates',
        description: 'You are modifying grade boundaries or evaluation standards.',
        impactPoints: [
          'Historical finalized exam scorecards will maintain their initial evaluated letter grades.',
          'All upcoming test mark evaluations will compute letter grades using these new threshold boundaries.',
        ],
        onConfirm: async () => {
          await executeSave('gradingScale');
        },
      });
      return;
    }

    // Direct save for standard tabs
    await executeSave(activeTab);
  };

  // Handle Reset to Defaults for current tab
  const handleResetCurrentTab = () => {
    if (!window.confirm(`Are you sure you want to reset "${activeTab}" to system default values?`)) {
      return;
    }

    if (activeTab === 'schoolInfo') setSchoolInfo({ ...DEFAULT_SCHOOL_INFO, updatedAt: new Date().toISOString() });
    if (activeTab === 'feeStructure') setFeeStructure({ ...DEFAULT_FEE_STRUCTURE, updatedAt: new Date().toISOString() });
    if (activeTab === 'notificationTemplates') setNotificationTemplates({ ...DEFAULT_NOTIFICATION_TEMPLATES, updatedAt: new Date().toISOString() });
    if (activeTab === 'gradingScale') setGradingScale({ ...DEFAULT_GRADING_SCALE, updatedAt: new Date().toISOString() });

    setSaveSuccess(`Restored default settings for ${activeTab}. Click "Save Changes" to apply.`);
  };

  // Sample Mock Data for Notification Live Preview
  const mockPreviewVariables: Record<string, string> = {
    studentName: 'Aarav Sharma',
    date: '13-Sep-2026',
    batchName: 'Grade 12 - Physics Mastery',
    schoolName: schoolInfo.institutionName || 'Apex Institute',
    schoolPhone: schoolInfo.phone || '+91 98765 43210',
    installmentTitle: 'Term 2 Tuition Fee',
    amount: '18,500',
    currencySymbol: schoolInfo.currencySymbol || '₹',
    dueDate: '25-Sep-2026',
    paymentLink: 'https://apexcoaching.edu/pay/STU-2026-042',
    receiptNumber: 'REC-2026-0891',
    paymentMode: 'UPI (GPay)',
    transactionId: 'TXN-99882211',
    receiptUrl: 'https://apexcoaching.edu/receipt/REC-2026-0891.pdf',
    examTitle: 'Term 1 Mid-Term Assessment',
    subject: 'Physics',
    marksObtained: '94',
    totalMarks: '100',
    percentage: '94.0',
    grade: 'A+',
    rank: '1',
    teacherRemarks: 'Brilliant conceptual clarity and analytical precision.',
    messageContent: 'The institute will remain closed on Monday on account of National Holiday. Classes resume on Tuesday.',
    announcementText: 'Please submit Assignment #4 on Electrostatics by this Friday 5:00 PM.',
    teacherName: 'Dr. R. K. Verma',
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-semibold text-slate-600">Loading Institute Configuration...</p>
      </div>
    );
  }

  const currentAudit =
    activeTab === 'schoolInfo'
      ? schoolInfo
      : activeTab === 'feeStructure'
      ? feeStructure
      : activeTab === 'notificationTemplates'
      ? notificationTemplates
      : gradingScale;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" /> Global Master Control
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Live Firestore Sync
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Institute Configuration & Settings
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Centralized settings for institute branding, fee structures, automated WhatsApp templates, and academic grading thresholds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleResetCurrentTab}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Tab to Default</span>
            </button>

            <button
              onClick={handleSaveCurrentTab}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving to Cloud...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Audit Meta Stamp in Header */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              Last modified: <strong className="text-slate-200">{new Date(currentAudit.updatedAt).toLocaleString()}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              By: <strong className="text-slate-200">{currentAudit.updatedBy || 'admin'}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-300 font-mono font-bold">
              v{currentAudit.version || 1}
            </span>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-3 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-3 shadow-xs animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200">
        <button
          onClick={() => setActiveTab('schoolInfo')}
          className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'schoolInfo'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>School Info & Branding</span>
        </button>

        <button
          onClick={() => setActiveTab('feeStructure')}
          className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'feeStructure'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Fee Structure & Invoicing</span>
        </button>

        <button
          onClick={() => setActiveTab('notificationTemplates')}
          className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'notificationTemplates'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <BellRing className="w-4 h-4" />
          <span>Notification Templates</span>
        </button>

        <button
          onClick={() => setActiveTab('gradingScale')}
          className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'gradingScale'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Grading Scale & GPA</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: School Info & Branding */}
      {/* ========================================================================= */}
      {activeTab === 'schoolInfo' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Institute Identity & Accreditation</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Institution / Coaching Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={schoolInfo.institutionName}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, institutionName: e.target.value })}
                    placeholder="e.g. Apex Institute of Science & Commerce"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tagline / Motto</label>
                  <input
                    type="text"
                    value={schoolInfo.tagline}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, tagline: e.target.value })}
                    placeholder="e.g. Empowering Future Leaders with Academic Excellence"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Affiliation / Board Code</label>
                  <input
                    type="text"
                    value={schoolInfo.affiliationNumber || ''}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, affiliationNumber: e.target.value })}
                    placeholder="e.g. AFF-2026-CBSE-9941"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tax ID / GSTIN</label>
                  <input
                    type="text"
                    value={schoolInfo.taxNumber || ''}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, taxNumber: e.target.value })}
                    placeholder="e.g. GSTIN27AAACR1234F1Z5"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                <span>Contact Details & Official Communication</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Official Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={schoolInfo.email}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, email: e.target.value })}
                    placeholder="contact@apexcoaching.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Primary Phone / Helpdesk <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={schoolInfo.phone}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Alternate / WhatsApp Number</label>
                  <input
                    type="text"
                    value={schoolInfo.alternatePhone || ''}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, alternatePhone: e.target.value })}
                    placeholder="+91 98765 43211"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Website</label>
                  <input
                    type="url"
                    value={schoolInfo.website || ''}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, website: e.target.value })}
                    placeholder="https://apexcoaching.edu"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>Campus Location & Postal Address</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={schoolInfo.address}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, address: e.target.value })}
                    placeholder="Plot 42, Knowledge Park III, Silicon Valley Enclave"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={schoolInfo.city}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, city: e.target.value })}
                    placeholder="Bengaluru"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">State / Province</label>
                  <input
                    type="text"
                    value={schoolInfo.state}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, state: e.target.value })}
                    placeholder="Karnataka"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PIN / Postal Code</label>
                  <input
                    type="text"
                    value={schoolInfo.pincode}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, pincode: e.target.value })}
                    placeholder="560100"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel: Localization & Visual Asset Previews */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>Localization & Defaults</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Currency</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSchoolInfo({ ...schoolInfo, currency: 'INR', currencySymbol: '₹' })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        schoolInfo.currency === 'INR'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      ₹ INR (Rupee)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchoolInfo({ ...schoolInfo, currency: 'USD', currencySymbol: '$' })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        schoolInfo.currency === 'USD'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      $ USD (Dollar)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Active Academic Year</label>
                  <input
                    type="text"
                    value={schoolInfo.academicYear}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, academicYear: e.target.value })}
                    placeholder="2026-2027"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Timezone</label>
                  <input
                    type="text"
                    value={schoolInfo.timezone}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, timezone: e.target.value })}
                    placeholder="Asia/Kolkata"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Logo Preview */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Branding Logo Asset</span>
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Logo URL</label>
                <input
                  type="url"
                  value={schoolInfo.logoUrl}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-2 text-center">
                {schoolInfo.logoUrl ? (
                  <img
                    src={schoolInfo.logoUrl}
                    alt="Logo Preview"
                    className="w-20 h-20 object-cover rounded-2xl shadow-sm border border-slate-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=200&h=200&fit=crop&crop=faces';
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xl">
                    APEX
                  </div>
                )}
                <span className="text-[11px] text-slate-500 font-medium">Receipt & Portal Header Logo</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: Fee Structure & Invoicing */}
      {/* ========================================================================= */}
      {activeTab === 'feeStructure' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Installment Plans */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Installment Distribution Schemes</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pre-defined installment plans presented to parents during batch enrollment.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newPlan: InstallmentPlanOption = {
                      id: `plan-custom-${Date.now()}`,
                      name: 'Custom Plan',
                      installmentCount: 2,
                      splitPercentages: [50, 50],
                      description: 'Custom installment scheme',
                    };
                    setFeeStructure({
                      ...feeStructure,
                      availablePlans: [...feeStructure.availablePlans, newPlan],
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Plan</span>
                </button>
              </div>

              <div className="space-y-3">
                {feeStructure.availablePlans.map((plan, index) => (
                  <div
                    key={plan.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Plan Name</label>
                          <input
                            type="text"
                            value={plan.name}
                            onChange={(e) => {
                              const updated = [...feeStructure.availablePlans];
                              updated[index].name = e.target.value;
                              setFeeStructure({ ...feeStructure, availablePlans: updated });
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Terms Count</label>
                          <input
                            type="number"
                            min={1}
                            max={12}
                            value={plan.installmentCount}
                            onChange={(e) => {
                              const count = parseInt(e.target.value) || 1;
                              const updated = [...feeStructure.availablePlans];
                              updated[index].installmentCount = count;
                              // auto-equal split
                              const perSplit = Math.floor(100 / count);
                              const splits = Array(count).fill(perSplit);
                              const remainder = 100 - perSplit * count;
                              if (remainder > 0 && splits.length > 0) splits[0] += remainder;
                              updated[index].splitPercentages = splits;
                              setFeeStructure({ ...feeStructure, availablePlans: updated });
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                          />
                        </div>
                      </div>

                      {feeStructure.availablePlans.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = feeStructure.availablePlans.filter((_, i) => i !== index);
                            setFeeStructure({ ...feeStructure, availablePlans: updated });
                          }}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                          title="Remove plan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 text-xs">
                      <span className="text-[11px] font-semibold text-slate-500">Distribution Split (%):</span>
                      {plan.splitPercentages.map((split, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 font-mono font-bold text-xs"
                        >
                          Term {sIdx + 1}: {split}%
                        </span>
                      ))}
                      <span className="text-[11px] text-slate-400 ml-auto font-medium">
                        Total: {plan.splitPercentages.reduce((a, b) => a + b, 0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Late Fee Policy & Rules */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Late Fine Policy</span>
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feeStructure.lateFeeEnabled}
                      onChange={(e) => setFeeStructure({ ...feeStructure, lateFeeEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Grace Period (Days After Due Date)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={feeStructure.lateFeeGraceDays}
                      onChange={(e) =>
                        setFeeStructure({ ...feeStructure, lateFeeGraceDays: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">No fines charged during grace period</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Daily Fine ({schoolInfo.currencySymbol} / day)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={feeStructure.lateFeeDailyAmount}
                      onChange={(e) =>
                        setFeeStructure({ ...feeStructure, lateFeeDailyAmount: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Maximum Penalty Cap ({schoolInfo.currencySymbol})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={feeStructure.lateFeeMaxCap}
                      onChange={(e) =>
                        setFeeStructure({ ...feeStructure, lateFeeMaxCap: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* UPI & Payment Gateway Setup */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-indigo-600" />
                  <span>UPI Payment VPA</span>
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Institute UPI ID (VPA)</label>
                  <input
                    type="text"
                    value={feeStructure.upiId || ''}
                    onChange={(e) => setFeeStructure({ ...feeStructure, upiId: e.target.value })}
                    placeholder="apexcoaching@icici"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payee Merchant Name</label>
                  <input
                    type="text"
                    value={feeStructure.upiPayeeName || ''}
                    onChange={(e) => setFeeStructure({ ...feeStructure, upiPayeeName: e.target.value })}
                    placeholder="Apex Institute of Science & Commerce"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: Notification Templates */}
      {/* ========================================================================= */}
      {activeTab === 'notificationTemplates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template Selector List */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm px-1">Automated Event Triggers</h3>
            {(
              [
                { key: 'absenceAlert', label: 'Daily Absence Alert', tag: 'Attendance' },
                { key: 'feeReminder', label: 'Fee Due Reminder', tag: 'Billing' },
                { key: 'paymentReceipt', label: 'Payment Receipt', tag: 'Finance' },
                { key: 'reportCard', label: 'Exam Scorecard', tag: 'Academics' },
                { key: 'broadcast', label: 'General Broadcast', tag: 'Notices' },
                { key: 'batchAnnouncement', label: 'Batch Notice', tag: 'Classroom' },
              ] as { key: keyof NotificationTemplatesSettings['templates']; label: string; tag: string }[]
            ).map((item) => {
              const template = notificationTemplates.templates[item.key];
              const isSelected = activeTemplateKey === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTemplateKey(item.key)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-500 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">{item.label}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{template.bodyTemplate}</p>
                </button>
              );
            })}
          </div>

          {/* Template Editor & Live Preview */}
          <div className="lg:col-span-2 space-y-6">
            {(() => {
              const currentTemplate = notificationTemplates.templates[activeTemplateKey];
              const previewText = interpolateTemplate(currentTemplate.bodyTemplate, mockPreviewVariables);

              const updateCurrentTemplate = (patch: Partial<NotificationTemplateItem>) => {
                setNotificationTemplates({
                  ...notificationTemplates,
                  templates: {
                    ...notificationTemplates.templates,
                    [activeTemplateKey]: {
                      ...currentTemplate,
                      ...patch,
                    },
                  },
                });
              };

              return (
                <div className="space-y-6">
                  {/* Editor Box */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{currentTemplate.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Customize message body and channel configuration</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={currentTemplate.channel}
                          onChange={(e) => updateCurrentTemplate({ channel: e.target.value as any })}
                          className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700"
                        >
                          <option value="whatsapp">WhatsApp</option>
                          <option value="sms">SMS</option>
                          <option value="email">Email</option>
                        </select>
                      </div>
                    </div>

                    {currentTemplate.channel === 'email' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Email Subject</label>
                        <input
                          type="text"
                          value={currentTemplate.subject || ''}
                          onChange={(e) => updateCurrentTemplate({ subject: e.target.value })}
                          placeholder="Subject line with {{schoolName}}"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                        />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700">Message Body Template</label>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {currentTemplate.bodyTemplate.length} characters
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={currentTemplate.bodyTemplate}
                        onChange={(e) => updateCurrentTemplate({ bodyTemplate: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-sans focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                      />
                    </div>

                    {/* Variable Token Chips */}
                    <div>
                      <span className="block text-[11px] font-bold text-slate-600 mb-2">
                        Click variable to insert into template:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {currentTemplate.variables.map((token) => (
                          <button
                            key={token}
                            type="button"
                            onClick={() => {
                              const tokenText = `{{${token}}}`;
                              updateCurrentTemplate({
                                bodyTemplate: `${currentTemplate.bodyTemplate} ${tokenText}`,
                              });
                            }}
                            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-100 hover:text-indigo-800 text-slate-700 font-mono font-bold text-[11px] border border-slate-200 transition-all active:scale-95"
                          >
                            + {`{{${token}}}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Live Simulated WhatsApp / Message Preview */}
                  <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                          WA
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Live Message Preview</div>
                          <div className="text-[10px] text-slate-400">Rendered with sample student data</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                        Formatted
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs sm:text-sm leading-relaxed text-slate-100 font-sans shadow-inner whitespace-pre-wrap">
                      {previewText}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: Grading Scale & GPA */}
      {/* ========================================================================= */}
      {activeTab === 'gradingScale' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
              <label className="block text-xs font-bold text-slate-700">Grading Scheme Title</label>
              <input
                type="text"
                value={gradingScale.scaleName}
                onChange={(e) => setGradingScale({ ...gradingScale, scaleName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
              <label className="block text-xs font-bold text-slate-700">Evaluation Standard</label>
              <select
                value={gradingScale.evaluationMode}
                onChange={(e) => setGradingScale({ ...gradingScale, evaluationMode: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value="percentage">Percentage (0 - 100%)</option>
                <option value="marks">Direct Absolute Marks</option>
                <option value="gpa">10-Point GPA Scale</option>
              </select>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
              <label className="block text-xs font-bold text-slate-700">Passing Percentage Threshold</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={gradingScale.passingPercentage}
                  onChange={(e) =>
                    setGradingScale({ ...gradingScale, passingPercentage: parseFloat(e.target.value) || 40 })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900"
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
            </div>
          </div>

          {/* Grade Boundaries Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <span>Grade Thresholds & Performance Bands</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Used by the Academics module to calculate student grades and scorecard ranks automatically.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const newGrade: GradeBoundary = {
                    grade: 'E',
                    minScore: 30,
                    maxScore: 39.99,
                    gpaPoint: 4.0,
                    remarks: 'Needs Improvement',
                    colorHex: '#f97316',
                  };
                  setGradingScale({
                    ...gradingScale,
                    grades: [...gradingScale.grades, newGrade],
                  });
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Grade Row</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                    <th className="pb-3 pr-4">Grade</th>
                    <th className="pb-3 pr-4">Min Score (%)</th>
                    <th className="pb-3 pr-4">Max Score (%)</th>
                    <th className="pb-3 pr-4">GPA Point</th>
                    <th className="pb-3 pr-4">Remarks / Descriptor</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradingScale.grades.map((g, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={g.grade}
                          onChange={(e) => {
                            const updated = [...gradingScale.grades];
                            updated[idx].grade = e.target.value;
                            setGradingScale({ ...gradingScale, grades: updated });
                          }}
                          className="w-16 px-2 py-1 font-bold font-mono text-center rounded-lg border border-slate-200 bg-white"
                        />
                      </td>

                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          value={g.minScore}
                          onChange={(e) => {
                            const updated = [...gradingScale.grades];
                            updated[idx].minScore = parseFloat(e.target.value) || 0;
                            setGradingScale({ ...gradingScale, grades: updated });
                          }}
                          className="w-20 px-2 py-1 font-mono rounded-lg border border-slate-200 bg-white"
                        />
                      </td>

                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          value={g.maxScore}
                          onChange={(e) => {
                            const updated = [...gradingScale.grades];
                            updated[idx].maxScore = parseFloat(e.target.value) || 0;
                            setGradingScale({ ...gradingScale, grades: updated });
                          }}
                          className="w-20 px-2 py-1 font-mono rounded-lg border border-slate-200 bg-white"
                        />
                      </td>

                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          step="0.1"
                          value={g.gpaPoint}
                          onChange={(e) => {
                            const updated = [...gradingScale.grades];
                            updated[idx].gpaPoint = parseFloat(e.target.value) || 0;
                            setGradingScale({ ...gradingScale, grades: updated });
                          }}
                          className="w-16 px-2 py-1 font-mono rounded-lg border border-slate-200 bg-white"
                        />
                      </td>

                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={g.remarks}
                          onChange={(e) => {
                            const updated = [...gradingScale.grades];
                            updated[idx].remarks = e.target.value;
                            setGradingScale({ ...gradingScale, grades: updated });
                          }}
                          className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white"
                        />
                      </td>

                      <td className="py-3 text-right">
                        {gradingScale.grades.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = gradingScale.grades.filter((_, i) => i !== idx);
                              setGradingScale({ ...gradingScale, grades: updated });
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete grade"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modal for High-Impact Settings */}
      {confirmModalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-scale-in">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-sm border border-amber-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  High-Impact Configuration Notice
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                  {confirmModalInfo.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {confirmModalInfo.description}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-700 block">Downstream Impact Breakdown:</span>
              <ul className="space-y-2 text-xs text-slate-600">
                {confirmModalInfo.impactPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalInfo(null)}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
              >
                Cancel & Review
              </button>
              <button
                type="button"
                onClick={confirmModalInfo.onConfirm}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <span>I Understand, Save Changes</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
