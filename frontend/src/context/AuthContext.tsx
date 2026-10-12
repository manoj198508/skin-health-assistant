import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, clearStoredAccessCode, listConversations, setStoredAccessCode, verifyAccessCode } from "../api/client";

type AuthStatus = "checking" | "authorized" | "required";

interface AuthContextValue {
  status: AuthStatus;
  error: string | null;
  submit: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Probe with a harmless, already-protected GET to find out whether the backend has
    // ACCESS_CODE set at all, and whether any previously-stored code is still valid.
    listConversations()
      .then(() => setStatus("authorized"))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearStoredAccessCode();
          setStatus("required");
        } else {
          // Backend unreachable or some other failure - don't hard-block on this probe,
          // let the rest of the app surface the real error when something is attempted.
          setStatus("authorized");
        }
      });
  }, []);

  async function submit(code: string) {
    setError(null);
    try {
      await verifyAccessCode(code);
      setStoredAccessCode(code);
      setStatus("authorized");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not verify that code.");
    }
  }

  return <AuthContext.Provider value={{ status, error, submit }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
