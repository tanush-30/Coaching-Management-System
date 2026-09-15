'use client';

import React, { useState } from 'react';
import {
  X,
  Radio,
  Send,
  FileEdit,
  Users,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Search,
  Check,
  Loader2,
  Sparkles,
  Info,
  ShieldAlert,
  Bell,
  MessageSquare,
  Mail,
  Pin
} from 'lucide-react';
import {
  Announcement,
  AnnouncementAudienceType,
  AnnouncementChannel,
  AnnouncementPriority,
  Batch,
  Student,
  Teacher
} from '@/lib/types';
import { UserAvatar } from '@/components/common/UserAvatar';

interface AnnouncementComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: Batch[];
  students: Student[];
  teachers: Teacher[];
  onSaveAnnouncement: (
    data: Partial<Announcement>,
    status: 'draft' | 'sent'
  ) => Promise<{
    success: boolean;
    recipientCount?: number;
    inAppCount?: number;
    whatsappCount?: number;
    failedCount?: number;
    error?: string;
  }>;
}

export const AnnouncementComposerModal: React.FC<AnnouncementComposerModalProps> = ({
  isOpen,
  onClose,
  batches,
  students,
  teachers,
  onSaveAnnouncement,
}) => {
  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audienceType, setAudienceType] = useState<AnnouncementAudienceType>('all');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [selectedIndividualIds, setSelectedIndividualIds] = useState<string[]>([]);
  const [channels, setChannels] = useState<AnnouncementChannel[]>(['in-app', 'whatsapp']);
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Search filter for Individual member picker
  const [individualSearch, setIndividualSearch] = useState('');
  const [individualFilterRole, setIndividualFilterRole] = useState<'all' | 'student' | 'teacher'>('all');

  // Modal Flow & UI State
  const [showConfirmSend, setShowConfirmSend] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<{ message: string; recipientCount: number } | null>(null);

  if (!isOpen) return null;

  // Calculate target audience summary & recipient counts
  const totalStudentsCount = students.length;
  const totalTeachersCount = teachers.length;

  let estimatedRecipients = 0;
  let audienceSummaryText = 'All Academy Members';

  if (audienceType === 'all') {
    estimatedRecipients = totalStudentsCount + totalTeachersCount;
    audienceSummaryText = `All Students (${totalStudentsCount}) & Faculty (${totalTeachersCount})`;
  } else if (audienceType === 'batch') {
    const matchedStudents = students.filter((s) =>
      (s.batchIds || []).some((bId) => selectedBatchIds.includes(bId))
    );
    estimatedRecipients = matchedStudents.length;
    const selectedNames = batches
      .filter((b) => selectedBatchIds.includes(b.id))
      .map((b) => b.name);
    audienceSummaryText = selectedNames.length > 0
      ? `${selectedNames.join(', ')} (${matchedStudents.length} Students)`
      : 'No Batches Selected';
  } else if (audienceType === 'individual') {
    estimatedRecipients = selectedIndividualIds.length;
    audienceSummaryText = `${selectedIndividualIds.length} Selected Members`;
  }

  // Filtered members list for Individual targeting
  const searchableMembers = [
    ...students.map((s) => ({ id: s.id, name: s.name, rollNo: s.rollNo, role: 'student' as const, avatar: s.avatar })),
    ...teachers.map((t) => ({ id: t.id, name: t.name, rollNo: t.facultyId || 'Faculty', role: 'teacher' as const, avatar: t.avatar })),
  ].filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(individualSearch.toLowerCase()) ||
      m.rollNo.toLowerCase().includes(individualSearch.toLowerCase());
    const matchesRole = individualFilterRole === 'all' || m.role === individualFilterRole;
    return matchesSearch && matchesRole;
  });

  // Toggle helpers
  const handleToggleBatch = (batchId: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]
    );
    setFormError(null);
  };

  const handleToggleIndividual = (id: string) => {
    setSelectedIndividualIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setFormError(null);
  };

  const handleToggleChannel = (channel: AnnouncementChannel) => {
    if (channel === 'email') return; // Disabled in Step 2
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
    setFormError(null);
  };

  // Form Validation
  const validateForm = (): boolean => {
    setFormError(null);
    if (!title.trim() || title.trim().length < 3) {
      setFormError('Please enter an announcement title (minimum 3 characters).');
      return false;
    }
    if (!message.trim() || message.trim().length < 5) {
      setFormError('Please enter the announcement message body (minimum 5 characters).');
      return false;
    }
    if (audienceType === 'batch' && selectedBatchIds.length === 0) {
      setFormError('Please select at least one batch for this announcement.');
      return false;
    }
    if (audienceType === 'individual' && selectedIndividualIds.length === 0) {
      setFormError('Please select at least one individual student or faculty recipient.');
      return false;
    }
    if (channels.length === 0) {
      setFormError('Please select at least one active delivery channel (In-App or WhatsApp).');
      return false;
    }
    return true;
  };

  // Handle Save Draft
  const handleSaveDraft = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload: Partial<Announcement> = {
        title: title.trim(),
        message: message.trim(),
        audienceType,
        audienceIds: audienceType === 'batch' ? selectedBatchIds : audienceType === 'individual' ? selectedIndividualIds : [],
        channels,
        priority,
        status: 'draft',
        batchNames: batches.filter((b) => selectedBatchIds.includes(b.id)).map((b) => b.name),
      };

      await onSaveAnnouncement(payload, 'draft');
      setSuccessFeedback({
        message: 'Announcement draft saved successfully.',
        recipientCount: estimatedRecipients,
      });

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save announcement draft.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Send Trigger
  const handleSendClick = () => {
    if (!validateForm()) return;
    setShowConfirmSend(true);
  };

  // Execute Dispatch after Confirmation
  const executeDispatch = async () => {
    setIsSubmitting(true);
    setFormError(null);
    setShowConfirmSend(false);

    try {
      const payload: Partial<Announcement> = {
        title: title.trim(),
        message: message.trim(),
        audienceType,
        audienceIds: audienceType === 'batch' ? selectedBatchIds : audienceType === 'individual' ? selectedIndividualIds : [],
        channels,
        priority,
        status: 'sent',
        batchNames: batches.filter((b) => selectedBatchIds.includes(b.id)).map((b) => b.name),
      };

      const result = await onSaveAnnouncement(payload, 'sent');
      const breakdownParts: string[] = [];
      if (result.inAppCount !== undefined && result.inAppCount > 0) {
        breakdownParts.push(`In-App: ${result.inAppCount}`);
      }
      if (result.whatsappCount !== undefined && result.whatsappCount > 0) {
        breakdownParts.push(`WhatsApp: ${result.whatsappCount}`);
      }
      const breakdownStr = breakdownParts.length > 0 ? ` (${breakdownParts.join(', ')})` : '';

      setSuccessFeedback({
        message: `Announcement successfully dispatched to ${result.recipientCount || estimatedRecipients} recipients!${breakdownStr}`,
        recipientCount: result.recipientCount || estimatedRecipients,
      });

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setFormError(err.message || 'Failed to dispatch announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Announcement Matrix</span>
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  Multi-Channel OS
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-extrabold text-slate-900">Compose & Dispatch Announcement</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success / Error Banners */}
        {successFeedback && (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-3 font-bold animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-extrabold text-sm">{successFeedback.message}</p>
              <p className="text-[11px] text-emerald-700 font-normal">
                Dispatched across {channels.map((c) => c.toUpperCase()).join(' & ')}. Recipient records updated.
              </p>
            </div>
          </div>
        )}

        {formError && (
          <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-700 flex items-center gap-2.5 font-bold animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="space-y-5">
          
          {/* Title Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Announcement Title <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">{title.length}/200</span>
            </div>
            <input
              type="text"
              maxLength={200}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setFormError(null);
              }}
              placeholder="e.g. Schedule Revision for Weekend Test Series / Annual Sports Day"
              className="w-full text-sm font-semibold px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition"
            />
          </div>

          {/* Audience Selector Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Target Audience <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setAudienceType('all');
                  setFormError(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  audienceType === 'all'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>All Academy</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAudienceType('batch');
                  setFormError(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  audienceType === 'batch'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Specific Batches</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAudienceType('individual');
                  setFormError(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  audienceType === 'individual'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Individual</span>
              </button>
            </div>
          </div>

          {/* Conditional Audience Sub-Selectors */}
          {audienceType === 'batch' && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Select Batches ({selectedBatchIds.length} chosen):</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBatchIds(batches.map((b) => b.id))}
                    className="text-[11px] text-indigo-600 hover:underline font-bold"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedBatchIds([])}
                    className="text-[11px] text-slate-500 hover:underline font-bold"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {batches.map((b) => {
                  const isChecked = selectedBatchIds.includes(b.id);
                  const enrolledCount = students.filter((s) => (s.batchIds || []).includes(b.id)).length;
                  return (
                    <div
                      key={b.id}
                      onClick={() => handleToggleBatch(b.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isChecked
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                        }`}>
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <span className="text-xs">{b.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {enrolledCount} Students
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {audienceType === 'individual' && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={individualSearch}
                    onChange={(e) => setIndividualSearch(e.target.value)}
                    placeholder="Search by name, roll no, or faculty ID..."
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-1 bg-slate-200 p-0.5 rounded-xl text-[11px] font-bold">
                  {(['all', 'student', 'teacher'] as const).map((tabRole) => (
                    <button
                      key={tabRole}
                      type="button"
                      onClick={() => setIndividualFilterRole(tabRole)}
                      className={`px-2.5 py-1 rounded-lg capitalize ${
                        individualFilterRole === tabRole ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      {tabRole}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {searchableMembers.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No members found matching search.</p>
                ) : (
                  searchableMembers.map((m) => {
                    const isChecked = selectedIndividualIds.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => handleToggleIndividual(m.id)}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isChecked
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                            isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                          }`}>
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                          <UserAvatar src={m.avatar} name={m.name} size="sm" />
                          <div>
                            <p className="text-xs font-bold text-slate-900 leading-tight">{m.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {m.role.toUpperCase()} • {m.rollNo}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded-md">
                          {m.role}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Message Body & Preview Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Message Body <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>{isPreviewMode ? 'Switch to Editor' : 'Live Preview'}</span>
              </button>
            </div>

            {isPreviewMode ? (
              <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 text-xs min-h-32 whitespace-pre-wrap leading-relaxed">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-[11px] uppercase tracking-wider mb-2">
                  <Bell className="w-3.5 h-3.5" />
                  <span>Preview: {title || 'Untitled Announcement'}</span>
                </div>
                {message || <span className="italic text-slate-500">No message content entered.</span>}
              </div>
            ) : (
              <textarea
                rows={4}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setFormError(null);
                }}
                placeholder="Write your announcement details here. Markdown and bullet points supported..."
                className="w-full text-xs px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition leading-relaxed"
              />
            )}
          </div>

          {/* Multi-Channel Selector & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Delivery Channels */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Delivery Channels
              </label>
              <div className="space-y-1.5">
                {/* In-App */}
                <div
                  onClick={() => handleToggleChannel('in-app')}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    channels.includes('in-app')
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs">In-App Notification Feed</span>
                  </div>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                    Active
                  </span>
                </div>

                {/* WhatsApp */}
                <div
                  onClick={() => handleToggleChannel('whatsapp')}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    channels.includes('whatsapp')
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs">WhatsApp Broadcast</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    Active
                  </span>
                </div>

                {/* Email (Disabled / Coming in Step 3) */}
                <div
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-100/70 text-slate-400 flex items-center justify-between cursor-not-allowed opacity-75"
                  title="Email delivery infrastructure will be activated in Step 3"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-xs">Email Dispatch</span>
                  </div>
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                    Coming in Step 3
                  </span>
                </div>
              </div>
            </div>

            {/* Priority Selector & Recipient Summary */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                  Priority Level
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['normal', 'urgent', 'pinned'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                        priority === p
                          ? p === 'urgent'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : p === 'pinned'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p === 'pinned' && <Pin className="w-3 h-3 inline mr-1" />}
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Recipient Counter Card */}
              <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-1">
                <div className="flex items-center justify-between text-xs text-indigo-900 font-bold">
                  <span>Target Summary:</span>
                  <span className="font-extrabold text-indigo-700">{estimatedRecipients} Recipients</span>
                </div>
                <p className="text-[11px] text-slate-600 truncate">
                  {audienceSummaryText}
                </p>
              </div>

            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSaveDraft}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>Save as Draft</span>
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSendClick}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-600/25 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send Announcement</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Confirmation Dialog */}
      {showConfirmSend && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-in space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Dispatch Announcement?</h3>
                <p className="text-xs text-slate-500">Live Multi-Channel Broadcast</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <p>
                Are you sure you want to send <strong>&quot;{title}&quot;</strong> to <strong>{audienceSummaryText}</strong>?
              </p>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                <span>Selected Channels:</span>
                <span className="text-indigo-600 font-bold uppercase">{channels.join(', ')}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirmSend(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={executeDispatch}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/30 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Yes, Dispatch Announcement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
