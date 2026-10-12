import { useLanguage } from "../context/LanguageContext";
import type { TranslationKey } from "../i18n/translations";

const STEP_KEYS: TranslationKey[] = ["stepUpload", "stepAnalyzing", "stepReport"];

export default function StepIndicator({ activeIndex }: { activeIndex: number }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-center gap-2">
      {STEP_KEYS.map((key, i) => (
        <div key={key} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition ${
                i < activeIndex
                  ? "bg-teal-600 text-white"
                  : i === activeIndex
                    ? "bg-teal-100 text-teal-700 ring-2 ring-teal-500 dark:bg-teal-900/40 dark:text-teal-300"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`text-xs font-medium ${
                i <= activeIndex ? "text-slate-700 dark:text-slate-300" : "text-slate-400 dark:text-slate-600"
              }`}
            >
              {t(key)}
            </span>
          </div>
          {i < STEP_KEYS.length - 1 && <span className="h-px w-8 bg-slate-200 dark:bg-slate-700" />}
        </div>
      ))}
    </div>
  );
}
