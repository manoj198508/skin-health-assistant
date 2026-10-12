import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ApiError,
  createConversation,
  getConversation,
  getPhotoUrl,
  postMessage,
  uploadPhoto,
} from "../api/client";
import type { ConversationDetail, Message, PhotoAssessment } from "../api/types";
import AssessmentCard from "../components/AssessmentCard";
import ChatInput from "../components/ChatInput";
import ErrorBanner from "../components/ErrorBanner";
import { ChatBubbleIcon } from "../components/icons";
import ImageUploader from "../components/ImageUploader";
import MessageBubble from "../components/MessageBubble";
import StepIndicator from "../components/StepIndicator";
import TypingIndicator from "../components/TypingIndicator";
import { useConversationsRefresh } from "../context/ConversationsContext";
import { useLanguage } from "../context/LanguageContext";

type Phase = "upload" | "analyzing" | "result";

const PHASE_STEP: Record<Phase, number> = { upload: 0, analyzing: 1, result: 2 };

function hydrateFromConversation(conv: ConversationDetail) {
  let imageId: string | null = null;
  let assessment: PhotoAssessment | null = null;
  const followUps: Message[] = [];

  for (const m of conv.messages) {
    if (m.message_type === "image") {
      imageId = m.content;
    } else if (m.message_type === "assessment") {
      try {
        assessment = JSON.parse(m.content) as PhotoAssessment;
      } catch {
        assessment = null;
      }
    } else {
      followUps.push(m);
    }
  }

  return {
    imageUrl: imageId ? getPhotoUrl(conv.id, imageId) : null,
    assessment,
    messages: followUps,
  };
}

export default function PhotoAnalysis() {
  const { t, language } = useLanguage();
  const { conversationId: paramId } = useParams();
  const navigate = useNavigate();
  const { refresh } = useConversationsRefresh();

  const [conversationId, setConversationId] = useState<string | null>(paramId ?? null);
  const [phase, setPhase] = useState<Phase>("upload");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<PhotoAssessment | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(!!paramId);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // See the matching comment in Chat.tsx: skip re-fetching a conversation id we just
  // created locally, since that fetch would race the in-flight upload/analysis call.
  const justCreatedRef = useRef<string | null>(null);

  useEffect(() => {
    if (paramId && paramId === justCreatedRef.current) {
      justCreatedRef.current = null;
      return;
    }
    if (!paramId) {
      setConversationId(null);
      setPhase("upload");
      setImageUrl(null);
      setAssessment(null);
      setMessages([]);
      setError(null);
      return;
    }
    setLoading(true);
    getConversation(paramId)
      .then((conv) => {
        setConversationId(conv.id);
        const hydrated = hydrateFromConversation(conv);
        setImageUrl(hydrated.imageUrl);
        setAssessment(hydrated.assessment);
        setMessages(hydrated.messages);
        setPhase(hydrated.assessment ? "result" : "upload");
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t("errorNotFound")))
      .finally(() => setLoading(false));
  }, [paramId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleAnalyze(file: File) {
    setError(null);
    setPhase("analyzing");
    let convId = conversationId;
    try {
      if (!convId) {
        const conv = await createConversation("photo");
        convId = conv.id;
        justCreatedRef.current = convId;
        setConversationId(convId);
        navigate(`/photo/${convId}`, { replace: true });
      }
      const result = await uploadPhoto(convId, file, language);
      setAssessment(result.assessment);
      setImageUrl(getPhotoUrl(convId, result.image_id));
      setPhase("result");
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorAnalyzePhoto"));
      setPhase("upload");
    }
  }

  async function handleSend(content: string) {
    if (!conversationId) return;
    setError(null);
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
      const { assistant_message } = await postMessage(conversationId, content, language);
      setMessages((prev) => [...prev, assistant_message]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorSendMessage"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col px-4 py-6 sm:px-6">
      <div className="mb-4 flex shrink-0 items-center gap-3">
        <Link to="/" className="text-sm text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
          ← {t("homeLink")}
        </Link>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("photoTitle")}</h1>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-16 text-sm text-slate-400 dark:text-slate-500">
          {t("loading")}
        </div>
      ) : (
        <>
          <div className="my-4 shrink-0">
            <StepIndicator activeIndex={PHASE_STEP[phase]} />
          </div>

          {error && (
            <div className="mb-3 shrink-0">
              <ErrorBanner message={error} />
            </div>
          )}

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto">
            {phase !== "result" && (
              <ImageUploader onAnalyze={handleAnalyze} disabled={phase === "analyzing"} analyzing={phase === "analyzing"} />
            )}

            {phase === "result" && assessment && (
              <div className="animate-fade-in-up space-y-6">
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Uploaded skin photo"
                    className="mx-auto max-h-64 rounded-xl border border-slate-200 object-contain dark:border-slate-800"
                  />
                )}
                <AssessmentCard assessment={assessment} />

                <div>
                  <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t("continueConversation")}
                  </h2>
                  <div className="space-y-3">
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
                </div>
              </div>
            )}
          </div>

          {phase === "result" && (
            <div className="mt-4 shrink-0">
              <ChatInput onSend={handleSend} disabled={sending} placeholder={t("followUpPlaceholder")} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
