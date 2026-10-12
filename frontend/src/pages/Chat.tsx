import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, createConversation, getConversation, postMessage } from "../api/client";
import type { Message } from "../api/types";
import ChatInput from "../components/ChatInput";
import ErrorBanner from "../components/ErrorBanner";
import { ChatBubbleIcon } from "../components/icons";
import MessageBubble from "../components/MessageBubble";
import TypingIndicator from "../components/TypingIndicator";
import { useConversationsRefresh } from "../context/ConversationsContext";
import { useLanguage } from "../context/LanguageContext";

export default function Chat() {
  const { t, language } = useLanguage();
  const { conversationId: paramId } = useParams();
  const navigate = useNavigate();
  const { refresh } = useConversationsRefresh();

  const [conversationId, setConversationId] = useState<string | null>(paramId ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(!!paramId);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Tracks a conversation id we just created locally (via handleSend) so the effect below
  // doesn't re-fetch it: that fetch would race the in-flight postMessage call and can
  // overwrite the optimistic user message / assistant reply with stale, incomplete state.
  const justCreatedRef = useRef<string | null>(null);

  useEffect(() => {
    if (paramId && paramId === justCreatedRef.current) {
      justCreatedRef.current = null;
      return;
    }
    if (!paramId) {
      setConversationId(null);
      setMessages([]);
      setError(null);
      return;
    }
    setLoading(true);
    getConversation(paramId)
      .then((conv) => {
        setConversationId(conv.id);
        setMessages(conv.messages);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t("errorNotFound")))
      .finally(() => setLoading(false));
  }, [paramId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend(content: string) {
    setError(null);
    let convId = conversationId;
    if (!convId) {
      try {
        const conv = await createConversation("chat");
        convId = conv.id;
        justCreatedRef.current = convId;
        setConversationId(convId);
        navigate(`/chat/${convId}`, { replace: true });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t("errorStartConversation"));
        return;
      }
    }

    const optimisticUser: Message = {
      id: `pending-${Date.now()}`,
      role: "user",
      content,
      message_type: "text",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setSending(true);
    try {
      const { assistant_message } = await postMessage(convId, content, language);
      setMessages((prev) => [...prev, assistant_message]);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorSendMessage"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
      <div className="mb-4 flex shrink-0 items-center gap-3">
        <Link to="/" className="text-sm text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
          ← {t("homeLink")}
        </Link>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("chatTitle")}</h1>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-16 text-sm text-slate-400 dark:text-slate-500">
          {t("loading")}
        </div>
      ) : (
        <>
          <div className="my-4 min-h-0 flex-1 space-y-4 overflow-y-auto">
            {messages.length === 0 && !error && (
              <div className="flex flex-col items-center gap-2 pt-12 text-center text-slate-400 dark:text-slate-500">
                <ChatBubbleIcon className="h-8 w-8" />
                <p className="text-sm">{t("chatEmptyState")}</p>
              </div>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {sending && (
              <div className="flex items-start gap-2">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                  <ChatBubbleIcon className="h-4 w-4" />
                </div>
                <TypingIndicator />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <div className="mb-2 shrink-0 space-y-2">
              <ErrorBanner message={error} />
              {messages.length === 0 && (
                <Link to="/chat" className="text-sm text-teal-700 underline dark:text-teal-400">
                  {t("startNewOne")}
                </Link>
              )}
            </div>
          )}

          <div className="shrink-0">
            <ChatInput onSend={handleSend} disabled={sending} placeholder={t("chatPlaceholder")} />
          </div>
        </>
      )}
    </div>
  );
}
