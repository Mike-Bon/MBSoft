import { useRef } from "react";
import { UploadCloud, FileCheck2 } from "lucide-react";

export default function FileUploadField({
  label,
  file,
  onChange,
  accept = "image/*,.pdf",
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center gap-3 rounded-lg border border-dashed border-lbc-border bg-lbc-bg px-4 py-3 text-left text-sm transition hover:border-lbc-red"
      >
        {file ? (
          <>
            <FileCheck2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <span className="truncate text-gray-700">{file.name}</span>
          </>
        ) : (
          <>
            <UploadCloud className="h-5 w-5 shrink-0 text-gray-400" />
            <span className="text-gray-500">Click to upload (JPG, PNG, or PDF, max 5MB)</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
    </div>
  );
}
