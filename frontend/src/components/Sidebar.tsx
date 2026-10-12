import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { deleteConversation, listConversations } from "../api/client";
import type { Conversation } from "../api/types";
import { useConversationsRefresh } from "../context/ConversationsContext";
import { useLanguage } from "../context/LanguageContext";
import { formatRelativeTime } from "../utils/time";
import { CameraIcon, ChatBubbleIcon, PlusIcon, ShieldIcon, TrashIcon } from "./icons";

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { conversationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { version } = useConversationsRefresh();

  useEffect(() => {
    listConversations()
      .then(setConversations)
      .catch(() => {});
  }, [location.pathname, version]);

  async function handleDelete(id: string, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) navigate("/");
    } catch {
      // best-effort; leave the row if deletion failed
    }
  }

  return (
    <nav className="flex h-full flex-col gap-4 p-4">
      <div className="space-y-2">
        <Link
          to="/chat"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <PlusIcon className="h-4 w-4" /> {t("sidebarNewChat")}
        </Link>
        <Link
          to="/photo"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <PlusIcon className="h-4 w-4" /> {t("sidebarNewPhoto")}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {t("sidebarHistory")}
        </p>
        {conversations.length === 0 && (
          <p className="px-1 text-xs text-slate-400 dark:text-slate-500">{t("sidebarEmpty")}</p>
        )}
        <ul className="space-y-1">
          {conversations.map((c) => {
            const isActive = c.id === conversationId;
            const Icon = c.mode === "photo" ? CameraIcon : ChatBubbleIcon;
            return (
              <li key={c.id}>
                <Link
                  to={`/${c.mode}/${c.id}`}
                  onClick={onNavigate}
                  className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-teal-50 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">
                    {c.mode === "photo" ? t("sidebarPhotoLabel") : t("sidebarChatLabel")}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                    {formatRelativeTime(c.updated_at)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(c.id, e)}
                    className="shrink-0 rounded p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:text-slate-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                    aria-label="Delete conversation"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="shrink-0 border-t border-slate-200 pt-3 dark:border-slate-800">
        <div className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-400 dark:text-slate-500">
          <ShieldIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            <span className="font-medium text-slate-500 dark:text-slate-400">{t("disclaimerTitle")}</span>{" "}
            {t("disclaimerBody")}
          </p>
        </div>
      </div>
    </nav>
  );
}
