import { useLanguage } from "../context/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-slate-200 px-4 py-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
      <p>{t("footerLine1")}</p>
      <p className="mt-1">{t("footerLine2")}</p>
    </footer>
  );
}
