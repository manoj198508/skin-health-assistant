import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { ShieldIcon } from "./icons";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { status, error, submit } = useAuth();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (status === "required") {
    async function handleSubmit(e: FormEvent) {
      e.preventDefault();
      if (!code.trim() || submitting) return;
      setSubmitting(true);
      await submit(code.trim());
      setSubmitting(false);
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white">
              <ShieldIcon className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Access Code Required</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This demo is private. Enter the access code you were given to continue.
            </p>
          </div>

          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Access code"
            autoFocus
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-teal-900/40"
          />

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={!code.trim() || submitting}
            className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Checking..." : "Continue"}
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
