'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileArchive,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Loader2,
  File,
} from 'lucide-react';
import {
  uploadFileToStorage,
  validateFile,
  sanitizeStorageFileName,
  DEFAULT_ACCEPTED_EXTENSIONS,
  DEFAULT_MAX_FILE_SIZE_MB,
  type UploadResult,
  type UploadOptions,
} from '@/lib/storage-upload';

export interface FileUploadZoneProps {
  storagePath: string | ((file: File) => string);
  onUploadComplete: (result: UploadResult) => void | Promise<void>;
  onError?: (error: string) => void;
  acceptedFileTypes?: string[];
  maxFileSizeMB?: number;
  disabled?: boolean;
  autoUpload?: boolean;
  label?: string;
  sublabel?: string;
  className?: string;
  metadata?: Record<string, string>;
}

type UploadStatus = 'idle' | 'selected' | 'uploading' | 'success' | 'error';

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  storagePath,
  onUploadComplete,
  onError,
  acceptedFileTypes = DEFAULT_ACCEPTED_EXTENSIONS,
  maxFileSizeMB = DEFAULT_MAX_FILE_SIZE_MB,
  disabled = false,
  autoUpload = true,
  label = 'Click or drag file here to upload',
  sublabel,
  className = '',
  metadata,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTargetStoragePath = (file: File): string => {
    if (typeof storagePath === 'function') {
      return storagePath(file);
    }
    if (storagePath.endsWith('/')) {
      return `${storagePath}${sanitizeStorageFileName(file.name)}`;
    }
    return storagePath;
  };

  const startUpload = useCallback(
    async (file: File) => {
      const validation = validateFile(file, { maxFileSizeMB, acceptedFileTypes });
      if (!validation.valid) {
        setUploadStatus('error');
        const err = validation.error || 'Invalid file.';
        setErrorMessage(err);
        if (onError) onError(err);
        return;
      }

      setUploadStatus('uploading');
      setUploadProgress(0);
      setErrorMessage('');

      try {
        const finalPath = getTargetStoragePath(file);
        const result = await uploadFileToStorage(file, finalPath, {
          maxFileSizeMB,
          acceptedFileTypes,
          metadata,
          onProgress: (progress) => {
            setUploadProgress(Math.round(progress));
          },
        });

        setUploadResult(result);
        setUploadStatus('success');
        await onUploadComplete(result);
      } catch (err: any) {
        console.error('[FileUploadZone] Upload error:', err);
        setUploadStatus('error');
        const msg = err?.message || 'Upload failed. Please try again.';
        setErrorMessage(msg);
        if (onError) onError(msg);
      }
    },
    [storagePath, maxFileSizeMB, acceptedFileTypes, metadata, onUploadComplete, onError]
  );

  const handleFileSelection = (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);

    const validation = validateFile(file, { maxFileSizeMB, acceptedFileTypes });
    if (!validation.valid) {
      setUploadStatus('error');
      const err = validation.error || 'Invalid file.';
      setErrorMessage(err);
      if (onError) onError(err);
      return;
    }

    if (autoUpload) {
      startUpload(file);
    } else {
      setUploadStatus('selected');
      setErrorMessage('');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || uploadStatus === 'uploading') return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && uploadStatus !== 'uploading') {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleManualUploadClick = () => {
    if (selectedFile && uploadStatus === 'selected') {
      startUpload(selectedFile);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext)) {
      return <ImageIcon className="w-6 h-6 text-sky-600" />;
    }
    if (['.zip', '.rar', '.7z', '.tar'].includes(ext)) {
      return <FileArchive className="w-6 h-6 text-amber-600" />;
    }
    if (['.pdf'].includes(ext)) {
      return <FileText className="w-6 h-6 text-rose-600" />;
    }
    return <File className="w-6 h-6 text-indigo-600" />;
  };

  const computedSublabel =
    sublabel ||
    `Supported: ${acceptedFileTypes.slice(0, 4).join(', ')}${
      acceptedFileTypes.length > 4 ? ` +${acceptedFileTypes.length - 4} more` : ''
    } (Max ${maxFileSizeMB}MB)`;

  return (
    <div className={`w-full space-y-3 font-sans ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFileTypes.join(',')}
        onChange={handleFileInputChange}
        disabled={disabled || uploadStatus === 'uploading'}
        className="hidden"
        id="reusable-file-upload-input"
      />

      {uploadStatus === 'idle' && (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`group relative border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
            disabled
              ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
              : isDragOver
              ? 'border-indigo-600 bg-indigo-50/70 scale-[1.01] shadow-md shadow-indigo-600/10'
              : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-white shadow-xs'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                {label}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">{computedSublabel}</p>
            </div>
          </div>
        </div>
      )}

      {selectedFile && uploadStatus !== 'idle' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5 transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                {getFileIcon(selectedFile.name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{selectedFile.name}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{formatBytes(selectedFile.size)}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {uploadStatus === 'error' && (
                <button
                  type="button"
                  onClick={() => startUpload(selectedFile)}
                  title="Retry upload"
                  className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}

              {uploadStatus !== 'uploading' && (
                <button
                  type="button"
                  onClick={handleReset}
                  title="Remove file"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar (when uploading) */}
          {uploadStatus === 'uploading' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-indigo-600 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading to Cloud Storage...</span>
                </span>
                <span className="text-slate-700 font-mono">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-600 to-sky-500 h-full rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success State */}
          {uploadStatus === 'success' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-bold block">File Uploaded Successfully</span>
                <span className="text-[10px] text-emerald-700 truncate block">Ready to publish</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {uploadStatus === 'error' && (
            <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="font-bold block">Upload Failed</span>
                <span className="text-[11px] text-rose-700 block leading-relaxed">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Manual Upload Trigger (if autoUpload is false) */}
          {!autoUpload && uploadStatus === 'selected' && (
            <button
              type="button"
              onClick={handleManualUploadClick}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98]"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Start Upload</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
