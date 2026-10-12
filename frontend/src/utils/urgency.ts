import type { CareUrgency } from "../api/types";
import type { TranslationKey } from "../i18n/translations";

export const URGENCY_STYLE: Record<
  CareUrgency,
  { labelKey: TranslationKey; descKey: TranslationKey; classes: string; dot: string }
> = {
  routine: {
    labelKey: "urgencyRoutineLabel",
    descKey: "urgencyRoutineDesc",
    classes: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900",
    dot: "bg-emerald-500",
  },
  soon: {
    labelKey: "urgencySoonLabel",
    descKey: "urgencySoonDesc",
    classes: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900",
    dot: "bg-amber-500",
  },
  urgent: {
    labelKey: "urgencyUrgentLabel",
    descKey: "urgencyUrgentDesc",
    classes: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900",
    dot: "bg-red-500",
  },
};
