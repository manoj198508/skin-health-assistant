import { Link } from "react-router-dom";
import HowItWorks from "../components/HowItWorks";
import { CameraIcon, ChatBubbleIcon, StethoscopeIcon } from "../components/icons";
import { useLanguage } from "../context/LanguageContext";

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="bg-gradient-to-b from-teal-50/60 to-slate-50 dark:from-teal-950/20 dark:to-slate-950">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-14">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm">
            <StethoscopeIcon className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{t("appName")}</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">{t("tagline")}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Link
            to="/chat"
            className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-600"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 transition group-hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:group-hover:bg-teal-900/50">
              <ChatBubbleIcon className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("navChat")}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t("navChatDesc")}</p>
          </Link>

          <Link
            to="/photo"
            className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-600"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 transition group-hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:group-hover:bg-teal-900/50">
              <CameraIcon className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("navPhoto")}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t("navPhotoDesc")}</p>
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/60 p-8 dark:border-slate-800 dark:bg-slate-900/40">
          <h2 className="mb-6 text-center text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("howItWorks")}
          </h2>
          <HowItWorks />
        </div>
      </div>
    </div>
  );
}
