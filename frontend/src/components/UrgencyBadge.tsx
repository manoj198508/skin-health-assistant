import type { CareUrgency } from "../api/types";
import { useLanguage } from "../context/LanguageContext";
import { URGENCY_STYLE } from "../utils/urgency";

export default function UrgencyBadge({ urgency }: { urgency: CareUrgency }) {
  const { t } = useLanguage();
  const style = URGENCY_STYLE[urgency];
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 ${style.classes}`}>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
      <div>
        <p className="text-sm font-semibold">{t(style.labelKey)}</p>
        <p className="text-xs opacity-90">{t(style.descKey)}</p>
      </div>
    </div>
  );
}
