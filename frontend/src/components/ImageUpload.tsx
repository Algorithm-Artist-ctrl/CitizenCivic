import React, { useRef, useState } from 'react';
import { UploadCloud, X, AlertCircle } from 'lucide-react';

interface ImageUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onFilesSelected,
  maxFiles = 3,
  maxSizeMB = 10,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!e.target.files) return;

    const filesArray = Array.from(e.target.files);
    validateAndAddFiles(filesArray);
  };

  const validateAndAddFiles = (files: File[]) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const validFiles: File[] = [];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setError(`"${file.name}" is not a supported format. Please upload JPEG, PNG, or WebP.`);
        return;
      }
      if (file.size > maxSizeBytes) {
        setError(`"${file.name}" exceeds the maximum size limit of ${maxSizeMB}MB.`);
        return;
      }
      validFiles.push(file);
    }

    const updated = [...selectedFiles, ...validFiles].slice(0, maxFiles);
    setSelectedFiles(updated);

    // Create preview URLs
    const newPreviews = updated.map((file) => URL.createObjectURL(file));
    setPreviewUrls(newPreviews);

    onFilesSelected(updated);
  };

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);

    // Revoke old URL
    URL.revokeObjectURL(previewUrls[index]);
    const updatedPreviews = previewUrls.filter((_, i) => i !== index);
    setPreviewUrls(updatedPreviews);

    onFilesSelected(updated);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {/* Drop area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-6 text-center cursor-pointer transition-colors hover:border-emerald-500 hover:bg-emerald-50/30"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <UploadCloud className="h-6 w-6" />
        </div>
        <p className="mt-3 text-sm font-semibold text-gray-800">
          Click or tap to capture / upload photo evidence
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Supports JPEG, PNG, WebP (up to {maxSizeMB}MB each, max {maxFiles} photos)
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Previews */}
      {previewUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {previewUrls.map((url, idx) => (
            <div key={idx} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shadow-xs">
              <img src={url} alt={`Preview ${idx + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(idx);
                }}
                className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                title="Remove photo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
