import { useRef, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { UploadIcon } from "./icons";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

interface ImageUploaderProps {
  onAnalyze: (file: File) => void;
  disabled?: boolean;
  analyzing?: boolean;
}

export default function ImageUploader({ onAnalyze, disabled, analyzing }: ImageUploaderProps) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(selected: File | undefined) {
    setError(null);
    if (!selected) return;
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError("Please choose a JPEG, PNG, or WEBP image.");
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError("Image is too large (max 8MB).");
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  return (
    <div className="space-y-4">
      <div
        className="relative flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center transition hover:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-teal-500"
        onClick={() => !analyzing && inputRef.current?.click()}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Selected preview" className="max-h-64 rounded-lg object-contain" />
        ) : (
          <div className="text-slate-500 dark:text-slate-400">
            <UploadIcon className="mx-auto mb-2 h-8 w-8 text-slate-400 dark:text-slate-500" />
            <p className="font-medium">{t("uploadPrompt")}</p>
            <p className="mt-1 text-xs">{t("uploadHint")}</p>
          </div>
        )}

        {analyzing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("analyzingOverlay")}</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files?.[0])}
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="button"
        disabled={!file || disabled}
        onClick={() => file && onAnalyze(file)}
        className="w-full rounded-full bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {analyzing ? t("analyzingButton") : t("analyzeButton")}
      </button>
    </div>
  );
}
