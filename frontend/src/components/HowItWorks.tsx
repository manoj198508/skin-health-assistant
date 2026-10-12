import type { ComponentType } from "react";
import { useLanguage } from "../context/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
import { ReportIcon, ScanIcon, UploadIcon } from "./icons";

const STEPS: { icon: ComponentType<{ className?: string }>; titleKey: TranslationKey; descKey: TranslationKey }[] = [
  { icon: UploadIcon, titleKey: "step1Title", descKey: "step1Desc" },
  { icon: ScanIcon, titleKey: "step2Title", descKey: "step2Desc" },
  { icon: ReportIcon, titleKey: "step3Title", descKey: "step3Desc" },
];

export default function HowItWorks() {
  const { t } = useLanguage();
  return (
    <div className="grid gap-8 sm:grid-cols-3">
      {STEPS.map((step, i) => (
        <div key={step.titleKey} className="text-center">
          <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <step.icon className="h-6 w-6 text-slate-700 dark:text-slate-300" />
            <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 text-xs font-semibold text-white">
              {i + 1}
            </span>
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t(step.titleKey)}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t(step.descKey)}</p>
        </div>
      ))}
    </div>
  );
}
