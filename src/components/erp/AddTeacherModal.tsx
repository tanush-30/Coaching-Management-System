'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  GraduationCap,
  Phone,
  Mail,
  BookOpen,
  Layers,
  Calendar,
  UserCheck,
  Sparkles,
  Check,
  Upload,
  Camera,
  Hash,
  CheckCircle2,
  AlertCircle,
  Key,
  Copy,
} from 'lucide-react';
import { Batch, Teacher } from '@/lib/types';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useERPStore } from '@/lib/store';
import { generateDefaultPassword } from '@/lib/auth-utils';

interface AddTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: Batch[];
  onAddTeacher: (teacherData: Omit<Teacher, 'id'> & { id?: string; facultyId?: string }) => void;
}

const COMMON_SUBJECTS = [
  'Physics',
  'Chemistry',
  'Mathematics',
  'Biology',
  'Computer Science',
  'English',
  'Social Studies',
  'Mental Ability / Reasoning',
];

export const AddTeacherModal: React.FC<AddTeacherModalProps> = ({
  isOpen,
  onClose,
  batches,
  onAddTeacher,
}) => {
  const { teachers, checkIdAvailability } = useERPStore();

  const [customId, setCustomId] = useState('');
  const [idValidation, setIdValidation] = useState<{ status: 'idle' | 'checking' | 'valid' | 'invalid'; message?: string }>({
    status: 'idle',
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('1990-05-15');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Physics']);
  const [customSubject, setCustomSubject] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'active' | 'on_leave'>('active');
  const [assignedBatches, setAssignedBatches] = useState<string[]>([]);
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');

  // Post-enrollment credentials modal state
  const [enrolledCredentials, setEnrolledCredentials] = useState<{
    uid: string;
    tempPassword: string;
    fullName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-suggest next faculty ID on open
  useEffect(() => {
    if (isOpen && !customId) {
      const nextNum = teachers.length + 1;
      setCustomId(`FAC-2026-${String(nextNum).padStart(3, '0')}`);
    }
  }, [isOpen, teachers.length]);

  // Validate custom ID in real time
  useEffect(() => {
    const trimmed = customId.trim().toUpperCase();
    if (!trimmed) {
      setIdValidation({ status: 'invalid', message: 'Faculty Member ID is required' });
      return;
    }

    let isMounted = true;
    setIdValidation({ status: 'checking' });

    const timeout = setTimeout(async () => {
      const res = await checkIdAvailability(trimmed);
      if (isMounted) {
        if (res.available) {
          setIdValidation({ status: 'valid', message: 'ID is available' });
        } else {
          setIdValidation({ status: 'invalid', message: res.reason || 'This ID is already in use' });
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [customId, checkIdAvailability]);

  if (!isOpen) return null;

  const previewPassword = generateDefaultPassword(firstName || 'Faculty', dob);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('Photo size should be under 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleSubject = (sub: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const handleAddCustomSubject = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = customSubject.trim();
    if (trimmed && !selectedSubjects.includes(trimmed)) {
      setSelectedSubjects((prev) => [...prev, trimmed]);
      setCustomSubject('');
    }
  };

  const toggleBatch = (batchId: string) => {
    setAssignedBatches((prev) =>
      prev.includes(batchId) ? prev.filter((b) => b !== batchId) : [...prev, batchId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (idValidation.status === 'invalid') {
      alert(`Cannot enroll faculty: ${idValidation.message}`);
      return;
    }

    if (!firstName.trim()) {
      alert('Please enter faculty member First Name.');
      return;
    }
    if (!phone.trim()) {
      alert('Please enter contact phone/WhatsApp number for OTP recovery.');
      return;
    }
    if (!dob) {
      alert('Please select Date of Birth for login credential generation.');
      return;
    }
    if (selectedSubjects.length === 0) {
      alert('Please select or specify at least one teaching subject.');
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const finalFacultyId = customId.trim().toUpperCase();
    const generatedPassword = generateDefaultPassword(firstName, dob);
    const defaultEmail = email.trim() || `${finalFacultyId.toLowerCase()}@studenterp.internal`;
    const teacherDocId = `teacher-${Date.now()}`;

    try {
      // 1. Provision Auth User via Server API
      fetch('/api/admin/enroll-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: teacherDocId,
          memberType: 'faculty',
          customId: finalFacultyId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: defaultEmail,
          dob,
          phone: phone.trim(),
          photoUrl: photoDataUrl || '',
          subjects: selectedSubjects,
          qualifications: qualifications.trim() || 'Faculty Specialist',
          joiningDate,
          status,
          assignedBatches,
        }),
      }).catch((err) => console.warn('[AddTeacher] Auth provision notice:', err));

      // 2. Add teacher to local ERP Store & Firestore
      onAddTeacher({
        id: teacherDocId,
        facultyId: finalFacultyId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob,
        name: fullName,
        email: defaultEmail,
        phone: phone.trim(),
        avatar: photoDataUrl || '',
        subjects: selectedSubjects,
        qualifications: qualifications.trim() || 'Faculty Specialist',
        joiningDate,
        status,
        assignedBatches,
      });

      // 3. Show credentials confirmation dialog
      setEnrolledCredentials({
        uid: finalFacultyId,
        tempPassword: generatedPassword,
        fullName,
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to enroll faculty member. Please verify the ID is unique.');
    }
  };

  const handleCopyCredentials = () => {
    if (!enrolledCredentials) return;
    const text = `🎓 *Apex Academy — Faculty Login Credentials*\nFaculty Member: ${enrolledCredentials.fullName}\nUser ID (UID): ${enrolledCredentials.uid}\nTemporary Password: ${enrolledCredentials.tempPassword}\n\nPlease log in at the Faculty Portal. You will be prompted to change your password upon first login.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinishAndClose = () => {
    setEnrolledCredentials(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 my-8 space-y-6 relative overflow-hidden">
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />

        {/* Post-Enrollment Credentials Modal Overlay */}
        {enrolledCredentials ? (
          <div className="space-y-6 py-4 animate-scale-in">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-lg shadow-purple-600/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Faculty Successfully Enrolled!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                The account has been created with UID-based login. Share these temporary credentials with the faculty member.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="font-semibold text-slate-500">Faculty Name:</span>
                <span className="font-bold text-slate-900">{enrolledCredentials.fullName}</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="font-semibold text-slate-500">Login User ID (UID):</span>
                <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                  {enrolledCredentials.uid}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">Auto-Generated Password:</span>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {enrolledCredentials.tempPassword}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
              <Key className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                <strong>Note:</strong> The faculty member will be prompted to set a permanent password upon their first login.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs flex items-center gap-2 hover:bg-slate-50 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Copy Credentials</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleFinishAndClose}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/30 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-purple-50 text-purple-600 font-bold">
                    <GraduationCap className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Enroll Faculty Member</h2>
                    <p className="text-xs text-slate-500">
                      Assign custom faculty UID, upload real photo, and configure teaching specializations
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Enrollment Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Custom Unique Faculty ID & Real Photo Picker */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* Unique Faculty ID Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-purple-600" />
                    <span>Faculty Member ID (UID)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value.toUpperCase())}
                    placeholder="e.g. FAC-2026-001"
                    className={`w-full text-xs font-mono font-bold bg-white border rounded-xl px-3 py-2.5 outline-none transition-all ${
                      idValidation.status === 'valid'
                        ? 'border-emerald-500 ring-1 ring-emerald-500/20'
                        : idValidation.status === 'invalid'
                        ? 'border-rose-500 ring-1 ring-rose-500/20 bg-rose-50/40'
                        : 'border-slate-300 focus:border-purple-500'
                    }`}
                  />
                  <div className="text-[11px] font-semibold flex items-center gap-1">
                    {idValidation.status === 'valid' && (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {idValidation.message}
                      </span>
                    )}
                    {idValidation.status === 'invalid' && (
                      <span className="text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {idValidation.message}
                      </span>
                    )}
                    {idValidation.status === 'checking' && (
                      <span className="text-amber-600">Checking ID uniqueness...</span>
                    )}
                  </div>
                </div>

                {/* Real Photo Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-purple-600" />
                    <span>Faculty Photo</span>
                    <span className="text-[10px] text-slate-400 lowercase font-normal">(optional)</span>
                  </label>

                  <div className="flex items-center gap-3">
                    <UserAvatar src={photoDataUrl} name={firstName || 'Faculty'} type="faculty" size="md" />

                    <div className="flex-1 space-y-1">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 shadow-2xs transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{photoDataUrl ? 'Change Photo' : 'Upload File'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                      {photoDataUrl && (
                        <button
                          type="button"
                          onClick={() => setPhotoDataUrl('')}
                          className="text-[10px] font-semibold text-rose-600 hover:underline block"
                        >
                          Remove photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Auto-Generated Password Card */}
              <div className="bg-purple-50/60 p-3.5 rounded-2xl border border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <Key className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-purple-900">Auto-Generated Default Password:</span>
                </div>
                <div className="font-mono font-bold text-purple-800 bg-white px-3 py-1 rounded-xl border border-purple-200 text-xs shadow-xs">
                  {previewPassword}
                </div>
              </div>

              {/* Core Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Rajesh"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pl-9 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Last Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Sharma"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pl-9 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Date of Birth <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pl-9 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    WhatsApp / Phone (for OTP recovery) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pl-9 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Qualifications & Degrees
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={qualifications}
                      onChange={(e) => setQualifications(e.target.value)}
                      placeholder="e.g. M.Sc. Physics (IIT Delhi), 8+ Yrs"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pl-9 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Joining Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pl-9 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              {/* Subject Expertise Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Teaching Subjects <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SUBJECTS.map((sub) => {
                    const isSelected = selectedSubjects.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => toggleSubject(sub)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-semibold border transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs scale-[1.02]'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Subject Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    onKeyDown={handleAddCustomSubject}
                    placeholder="Or type custom subject & press Enter..."
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex-1 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSubject}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Batch Assignment */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Assign Classroom Batches
                </label>
                {batches.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No batches created yet. You can assign batches later.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-100 rounded-2xl">
                    {batches.map((b) => {
                      const isAssigned = assignedBatches.includes(b.id);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => toggleBatch(b.id)}
                          className={`text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                            isAssigned
                              ? 'bg-purple-50/60 border-purple-300 text-purple-900 font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="truncate font-semibold">{b.name}</div>
                            <div className="text-[10px] text-slate-500">{b.grade} • {b.subject}</div>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                              isAssigned ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300'
                            }`}
                          >
                            {isAssigned && <Check className="w-3 h-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Faculty Status */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Faculty Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('active')}
                    className={`text-xs py-2.5 rounded-xl font-bold border transition-all ${
                      status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('on_leave')}
                    className={`text-xs py-2.5 rounded-xl font-bold border transition-all ${
                      status === 'on_leave'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    On Leave
                  </button>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold text-slate-600 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={idValidation.status === 'invalid'}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-purple-600/30 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Enroll Faculty Member</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

