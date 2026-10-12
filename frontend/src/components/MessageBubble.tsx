import type { Message } from "../api/types";
import DoctorResponse from "./DoctorResponse";
import { ChatBubbleIcon } from "./icons";

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (message.message_type === "image" || message.message_type === "assessment") {
    return null;
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-teal-600 px-4 py-2 text-sm leading-relaxed text-white">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
        <ChatBubbleIcon className="h-4 w-4" />
      </div>
      <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
        <DoctorResponse content={message.content} />
      </div>
    </div>
  );
}
