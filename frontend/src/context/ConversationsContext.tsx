import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface ConversationsContextValue {
  version: number;
  refresh: () => void;
}

const ConversationsContext = createContext<ConversationsContextValue | null>(null);

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  return <ConversationsContext.Provider value={{ version, refresh }}>{children}</ConversationsContext.Provider>;
}

export function useConversationsRefresh() {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error("useConversationsRefresh must be used within ConversationsProvider");
  return ctx;
}
