'use client';

import React, { useState } from 'react';
import { X, BookOpen, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { FileUploadZone } from '@/components/common/FileUploadZone';
import { sanitizeStorageFileName } from '@/lib/storage-upload';
import { createStudyMaterialRecord } from '@/lib/study-materials-service';
import { Batch, Teacher, StudyMaterial } from '@/lib/types';

interface UploadStudyMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: Batch[];
  currentTeacher: Teacher;
  onMaterialCreated?: (material: StudyMaterial) => void;
}

export const UploadStudyMaterialModal: React.FC<UploadStudyMaterialModalProps> = ({
  isOpen,
  onClose,
  batches,
  currentTeacher,
  onMaterialCreated,
}) => {
  const [title, setTitle] = useState('');
  const [batchId, setBatchId] = useState(batches[0]?.id || '');
  const [subject, setSubject] = useState(batches[0]?.subject || currentTeacher.subjects[0] || 'Physics');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleBatchChange = (newBatchId: string) => {
    setBatchId(newBatchId);
    const selected = batches.find((b) => b.id === newBatchId);
    if (selected && selected.subject) {
      setSubject(selected.subject);
    }
  };

  const handleUploadComplete = async (uploadResult: {
    downloadUrl: string;
    storagePath: string;
    fileName: string;
    fileSize: number;
    fileType: string;
  }) => {
    if (!title.trim()) {
      setErrorMsg('Please enter a title for the study material before uploading.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const selectedBatch = batches.find((b) => b.id === batchId);
      const formattedSize =
        uploadResult.fileSize >= 1024 * 1024
          ? `${(uploadResult.fileSize / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(uploadResult.fileSize / 1024)} KB`;

      const newMaterial = await createStudyMaterialRecord({
        title: title.trim(),
        batchId,
        batchName: selectedBatch?.name || 'Assigned Batch',
        subject: subject.trim() || 'General',
        fileName: uploadResult.fileName,
        fileSize: formattedSize,
        fileType: uploadResult.fileType,
        downloadUrl: uploadResult.downloadUrl,
        storagePath: uploadResult.storagePath,
        uploaderId: currentTeacher.facultyId || currentTeacher.id,
        uploaderName: currentTeacher.name,
        description: description.trim(),
      });

      setSuccessMsg('Study material published successfully!');
      if (onMaterialCreated) {
        onMaterialCreated(newMaterial);
      }

      setTimeout(() => {
        onClose();
        setTitle('');
        setDescription('');
        setSuccessMsg('');
      }, 1200);
    } catch (err: any) {
      console.error('[UploadStudyMaterialModal] Error:', err);
      setErrorMsg(err.message || 'Failed to save material metadata.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Upload Study Material</h3>
              <p className="text-xs text-slate-500">Publish notes, PDFs & formula sheets to your batch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
              Material Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 04 — Rotational Dynamics Comprehensive Notes"
              disabled={isSubmitting}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* Batch and Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                Target Batch *
              </label>
              <select
                value={batchId}
                onChange={(e) => handleBatchChange(e.target.value)}
                disabled={isSubmitting || batches.length === 0}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.grade})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Physics"
                disabled={isSubmitting}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
              Description / Faculty Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Read through pages 12-25 before Wednesday's live lecture."
              disabled={isSubmitting}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition resize-none"
            />
          </div>

          {/* File Upload Zone */}
          <div className="pt-2">
            <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
              Select File to Upload *
            </label>
            <FileUploadZone
              storagePath={(file) =>
                `studyMaterials/${batchId || 'general'}/${sanitizeStorageFileName(file.name)}`
              }
              onUploadComplete={handleUploadComplete}
              onError={(err) => setErrorMsg(err)}
              disabled={isSubmitting || !title.trim()}
              label="Click or drag study material file"
              sublabel="PDF, DOCX, PPTX, Images up to 50MB"
            />
            {!title.trim() && (
              <p className="text-[11px] text-amber-700 mt-1.5 flex items-center gap-1 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Please enter a title above before selecting your file.</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
