import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { MenuIcon, StethoscopeIcon } from "./icons";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";

export default function TopBanner({ onMenuClick }: { onMenuClick: () => void }) {
  const { t } = useLanguage();
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Toggle menu"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
            <StethoscopeIcon className="h-5 w-5" />
          </div>
          <span className="hidden font-semibold text-slate-900 sm:inline dark:text-slate-100">{t("appName")}</span>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
