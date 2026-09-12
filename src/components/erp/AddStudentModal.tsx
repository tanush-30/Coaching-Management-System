'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  GraduationCap,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  Building,
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  Hash,
  Sparkles,
  Key,
  Copy,
  Check,
} from 'lucide-react';
import { Batch, Student } from '@/lib/types';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useERPStore } from '@/lib/store';
import { generateDefaultPassword } from '@/lib/auth-utils';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: Batch[];
  onAddStudent: (
    studentData: Omit<Student, 'id' | 'paidFee' | 'pendingFee'> & { id?: string },
    installmentPlan?: { count: number; amounts: number[]; dueDates: string[] }
  ) => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  batches,
  onAddStudent,
}) => {
  const { students, checkIdAvailability } = useERPStore();

  // Form State
  const [customId, setCustomId] = useState('');
  const [idValidation, setIdValidation] = useState<{ status: 'idle' | 'checking' | 'valid' | 'invalid'; message?: string }>({
    status: 'idle',
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dob, setDob] = useState('2008-06-15');
  const [address, setAddress] = useState('');
  const [schoolName, setSchoolName] = useState('');

  // Real Photo Upload state (Empty by default — NO fake photo)
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');

  // Parent info
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentRelation, setParentRelation] = useState<'Father' | 'Mother' | 'Guardian'>('Father');

  // Batch & Fee Plan
  const [selectedBatchId, setSelectedBatchId] = useState<string>(batches[0]?.id || '');
  const [totalFee, setTotalFee] = useState<number>(batches[0]?.annualFee || 85000);
  const [installmentCount, setInstallmentCount] = useState<number>(3);

  // Post-enrollment credentials modal state
  const [enrolledCredentials, setEnrolledCredentials] = useState<{
    uid: string;
    tempPassword: string;
    fullName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-suggest next enrollment ID on open
  useEffect(() => {
    if (isOpen && !customId) {
      const nextNum = students.length + 1;
      setCustomId(`STU-2026-${String(nextNum).padStart(3, '0')}`);
    }
  }, [isOpen, students.length]);

  // Validate custom ID in real time
  useEffect(() => {
    const trimmed = customId.trim().toUpperCase();
    if (!trimmed) {
      setIdValidation({ status: 'invalid', message: 'Enrollment ID is required' });
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

  const previewPassword = generateDefaultPassword(firstName || 'Student', dob);

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

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId);
    const b = batches.find((x) => x.id === batchId);
    if (b) setTotalFee(b.annualFee);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (idValidation.status === 'invalid') {
      alert(`Cannot enroll student: ${idValidation.message}`);
      return;
    }

    if (!firstName.trim() || !phone.trim() || !parentName.trim() || !parentPhone.trim()) {
      alert('Please fill all mandatory fields (First Name, Student Phone, Parent Name, Parent Phone).');
      return;
    }

    if (!dob) {
      alert('Please select Date of Birth for login credential generation.');
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const finalRollNo = customId.trim().toUpperCase();
    const generatedPassword = generateDefaultPassword(firstName, dob);

    // Calculate installment split
    const amounts: number[] = [];
    const dueDates: string[] = [];
    const baseSplit = Math.round(totalFee / installmentCount);

    for (let i = 0; i < installmentCount; i++) {
      if (i === installmentCount - 1) {
        const prevTotal = amounts.reduce((a, b) => a + b, 0);
        amounts.push(totalFee - prevTotal);
      } else {
        amounts.push(baseSplit);
      }

      const date = new Date();
      date.setMonth(date.getMonth() + i * 3);
      dueDates.push(date.toISOString().split('T')[0]);
    }

    const defaultEmail = email.trim() || `${finalRollNo.toLowerCase()}@studenterp.internal`;
    const studentDocId = `student-${Date.now()}`;

    try {
      // 1. Provision Auth User via Server API
      fetch('/api/admin/enroll-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: studentDocId,
          memberType: 'student',
          customId: finalRollNo,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: defaultEmail,
          dob,
          phone: phone.trim(),
          photoUrl: photoDataUrl || '',
          gender,
          address: address.trim(),
          schoolName: schoolName.trim(),
          parentName: parentName.trim(),
          parentPhone: parentPhone.trim(),
          parentEmail: parentEmail.trim(),
          parentRelation,
          batchIds: selectedBatchId ? [selectedBatchId] : [],
          totalFee,
        }),
      }).catch((err) => console.warn('[AddStudent] Auth provision notice:', err));

      // 2. Add student to local ERP Store & Firestore
      onAddStudent(
        {
          id: studentDocId,
          rollNo: finalRollNo,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: fullName,
          email: defaultEmail,
          phone: phone.trim(),
          avatar: photoDataUrl || '',
          gender,
          dob,
          address: address.trim() || 'New Delhi, India',
          schoolName: schoolName.trim() || 'Delhi Public School',
          parentName: parentName.trim(),
          parentPhone: parentPhone.trim(),
          parentEmail: parentEmail.trim() || `${parentName.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`,
          parentRelation,
          batchIds: selectedBatchId ? [selectedBatchId] : [],
          enrollmentDate: new Date().toISOString().split('T')[0],
          status: 'active',
          totalFee,
        },
        {
          count: installmentCount,
          amounts,
          dueDates,
        }
      );

      // 3. Show credentials confirmation dialog
      setEnrolledCredentials({
        uid: finalRollNo,
        tempPassword: generatedPassword,
        fullName,
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to enroll student. Please verify the enrollment ID is unique.');
    }
  };

  const handleCopyCredentials = () => {
    if (!enrolledCredentials) return;
    const text = `🎓 *Apex Academy — Student Login Credentials*\nStudent: ${enrolledCredentials.fullName}\nUser ID (UID): ${enrolledCredentials.uid}\nTemporary Password: ${enrolledCredentials.tempPassword}\n\nPlease log in at the Student Portal. You will be prompted to change your password upon first login.`;
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
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 my-8 relative overflow-hidden">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600" />

        {/* Post-Enrollment Credentials Modal Overlay */}
        {enrolledCredentials ? (
          <div className="space-y-6 py-4 animate-scale-in">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Student Successfully Enrolled!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                The account has been created with UID-based login. Share these temporary credentials with the student or parent.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="font-semibold text-slate-500">Student Name:</span>
                <span className="font-bold text-slate-900">{enrolledCredentials.fullName}</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="font-semibold text-slate-500">Login User ID (UID):</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
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
                <strong>Note:</strong> The student will be prompted to set a permanent password upon their first login.
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
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/30 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Student Enrollment Form</h3>
                  <p className="text-xs text-slate-500">
                    Assign custom UID, generate auto-password, upload photo, and configure fee schedule
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Enrollment Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Custom Unique Enrollment ID & Real Photo Picker */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* Unique ID Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Enrollment / Student ID (UID)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value.toUpperCase())}
                    placeholder="e.g. STU-2026-001"
                    className={`w-full text-xs font-mono font-bold bg-white border rounded-xl px-3 py-2.5 outline-none transition-all ${
                      idValidation.status === 'valid'
                        ? 'border-emerald-500 ring-1 ring-emerald-500/20'
                        : idValidation.status === 'invalid'
                        ? 'border-rose-500 ring-1 ring-rose-500/20 bg-rose-50/40'
                        : 'border-slate-300 focus:border-indigo-500'
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
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Student Photo</span>
                    <span className="text-[10px] text-slate-400 lowercase font-normal">(optional)</span>
                  </label>

                  <div className="flex items-center gap-3">
                    <UserAvatar src={photoDataUrl} name={firstName || 'Student'} type="student" size="md" />

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
              <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <Key className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold text-indigo-900">Auto-Generated Default Password:</span>
                </div>
                <div className="font-mono font-bold text-indigo-800 bg-white px-3 py-1 rounded-xl border border-indigo-200 text-xs shadow-xs">
                  {previewPassword}
                </div>
              </div>

              {/* Section 1: Student Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" /> 1. Student Academic Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikram"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Singhania"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Date of Birth <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Student Mobile (for OTP recovery) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">School / College</label>
                    <input
                      type="text"
                      placeholder="e.g. DPS R.K. Puram"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Residential Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Sector 62, Noida"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Parent / Guardian Info */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> 2. Parent & WhatsApp Alerts Contact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Parent / Guardian Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sunil Singhania"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Parent WhatsApp Phone <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="For fee & attendance alerts"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Relationship</label>
                    <select
                      value={parentRelation}
                      onChange={(e) => setParentRelation(e.target.value as any)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Guardian">Guardian</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Batch Enrollment & Fee Schedule */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" /> 3. Batch Allocation & Fee Plan
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Batch</label>
                    <select
                      value={selectedBatchId}
                      onChange={(e) => handleBatchChange(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    >
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} (₹{b.annualFee.toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Annual Course Fee (₹)</label>
                    <input
                      type="number"
                      value={totalFee}
                      onChange={(e) => setTotalFee(Number(e.target.value))}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Installment Split</label>
                    <select
                      value={installmentCount}
                      onChange={(e) => setInstallmentCount(Number(e.target.value))}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value={1}>1 Installment (100% Upfront)</option>
                      <option value={2}>2 Installments (50% - 50%)</option>
                      <option value={3}>3 Installments (Quarterly)</option>
                      <option value={4}>4 Installments (Term-wise)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold text-slate-600 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={idValidation.status === 'invalid'}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Confirm & Enroll Student</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

