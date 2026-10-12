import type { ComponentType } from "react";
import { useLanguage } from "../context/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
import { parseDoctorSections, renderFormattedText } from "../utils/formatText";
import { AlertTriangleIcon, CheckCircleIcon, EyeIcon, HospitalIcon, SearchIcon } from "./icons";

const SECTION_STYLE: Record<
  string,
  { icon: ComponentType<{ className?: string }>; labelKey: TranslationKey; classes: string }
> = {
  overview: {
    icon: EyeIcon,
    labelKey: "docOverview",
    classes: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
  },
  "possible causes": {
    icon: SearchIcon,
    labelKey: "docCauses",
    classes: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300",
  },
  recommendations: {
    icon: CheckCircleIcon,
    labelKey: "docRecommendations",
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  precautions: {
    icon: AlertTriangleIcon,
    labelKey: "docPrecautions",
    classes: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
  },
  "when to see a doctor": {
    icon: HospitalIcon,
    labelKey: "docWhenToSee",
    classes: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
  },
};

export default function DoctorResponse({ content }: { content: string }) {
  const { t } = useLanguage();
  const parsed = parseDoctorSections(content);
  if (!parsed) {
    return <>{renderFormattedText(content)}</>;
  }

  return (
    <div className="space-y-3">
      {parsed.intro && <div>{renderFormattedText(parsed.intro)}</div>}
      {parsed.sections.map((section) => {
        const style = SECTION_STYLE[section.key];
        const Icon = style?.icon;
        return (
          <div key={section.key} className={`rounded-lg border px-3 py-2 ${style?.classes ?? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60"}`}>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide opacity-80">
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {style ? t(style.labelKey) : section.key}
            </div>
            <div className="text-sm leading-relaxed">{renderFormattedText(section.body)}</div>
          </div>
        );
      })}
    </div>
  );
}
