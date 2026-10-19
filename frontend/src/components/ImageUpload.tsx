import React, { useRef, useState } from 'react';
import { Camera, X, AlertCircle } from 'lucide-react';

interface ImageUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  label?: string;
  helperText?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onFilesSelected,
  maxFiles = 3,
  maxSizeMB = 10,
  label = 'Upload Photographic Evidence',
  helperText = 'JPEG, PNG, or WebP up to 10MB. Clear ground-truth images required.',
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!e.target.files) return;
    validateAndAddFiles(Array.from(e.target.files));
  };

  const validateAndAddFiles = (files: File[]) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const validFiles: File[] = [];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setError(`"${file.name}" is not a valid format. Only JPEG, PNG, and WebP are accepted.`);
        return;
      }
      if (file.size > maxSizeBytes) {
        setError(`"${file.name}" exceeds the ${maxSizeMB}MB file limit.`);
        return;
      }
      validFiles.push(file);
    }

    const updated = [...selectedFiles, ...validFiles].slice(0, maxFiles);
    setSelectedFiles(updated);

    const newPreviews = updated.map((file) => URL.createObjectURL(file));
    setPreviewUrls(newPreviews);
    onFilesSelected(updated);
  };

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);

    URL.revokeObjectURL(previewUrls[index]);
    const updatedPreviews = previewUrls.filter((_, i) => i !== index);
    setPreviewUrls(updatedPreviews);

    onFilesSelected(updated);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      validateAndAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload Drop Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-emerald-600 bg-emerald-50/50'
            : 'border-slate-300 bg-slate-50/60 hover:border-slate-400 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="evidence-file-input"
        />

        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs group-hover:border-slate-300 transition-colors">
          <Camera className="h-5 w-5 text-emerald-700" />
        </div>

        <p className="mt-3 text-xs font-semibold text-slate-900">
          {label}
        </p>
        <p className="mt-1 text-[11px] text-slate-500 max-w-sm">
          {helperText}
        </p>

        <div className="mt-2.5 inline-flex items-center gap-2 text-[10px] font-mono uppercase text-slate-400">
          <span>Max {maxFiles} files</span>
          <span>•</span>
          <span>Up to {maxSizeMB}MB</span>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-rose-50 p-2.5 text-xs text-rose-800 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Previews Grid */}
      {previewUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {previewUrls.map((url, idx) => (
            <div
              key={idx}
              className="group relative aspect-4/3 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-2xs"
            >
              <img
                src={url}
                alt={`Evidence Preview ${idx + 1}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent p-2 flex items-end justify-between">
                <span className="text-[10px] font-mono text-white truncate max-w-[70%]">
                  {selectedFiles[idx]?.name}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  className="rounded bg-slate-950/80 p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Remove photo"
                  aria-label="Remove photo"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
