import type { ComponentType } from "react";
import type { PhotoAssessment } from "../api/types";
import { useLanguage } from "../context/LanguageContext";
import { formatInlineBold } from "../utils/formatText";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  HospitalIcon,
  InfoIcon,
  SearchIcon,
} from "./icons";
import UrgencyBadge from "./UrgencyBadge";

function Section({
  icon: Icon,
  title,
  items,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        {title}
      </h3>
      <ul className="mt-1.5 list-disc space-y-1 pl-6 text-sm text-slate-700 dark:text-slate-300">
        {items.map((item, i) => (
          <li key={i}>{formatInlineBold(item)}</li>
        ))}
      </ul>
    </div>
  );
}

export default function AssessmentCard({ assessment }: { assessment: PhotoAssessment }) {
  const { t } = useLanguage();

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {t("reportEyebrow")}
          </p>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("reportTitle")}</h2>
        </div>
      </div>

      <UrgencyBadge urgency={assessment.care_urgency} />

      <Section icon={EyeIcon} title={t("sectionVisible")} items={assessment.visible_observations} />
      <Section icon={SearchIcon} title={t("sectionConditions")} items={assessment.possible_conditions} />

      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("sectionExplanation")}</h3>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{formatInlineBold(assessment.explanation)}</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("sectionGeneralInfo")}</h3>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
          {formatInlineBold(assessment.general_information)}
        </p>
      </div>

      <Section icon={CheckCircleIcon} title={t("sectionRecommendations")} items={assessment.self_care} />
      <Section icon={AlertTriangleIcon} title={t("sectionPrecautions")} items={assessment.precautions} />
      <Section icon={HospitalIcon} title={t("sectionWhenToSee")} items={assessment.when_to_see_doctor} />

      <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
        <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("sectionConfidence")}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {formatInlineBold(assessment.confidence_and_limitations)}
          </p>
        </div>
      </div>
    </div>
  );
}
