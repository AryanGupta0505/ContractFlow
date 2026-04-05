"use client";

import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ToastTone = "success" | "error" | "info";

type ToastRecord = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  pushToast: (toast: Omit<ToastRecord, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") {
    return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  }

  if (tone === "error") {
    return <TriangleAlert className="h-5 w-5 text-red-600" />;
  }

  return <Info className="h-5 w-5 text-sky-600" />;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  useEffect(() => {
    if (!toasts.length) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToasts((current) => current.slice(1));
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [toasts]);

  const value = useMemo<ToastContextValue>(
    () => ({
      pushToast(toast) {
        setToasts((current) => [
          ...current,
          {
            ...toast,
            id: crypto.randomUUID(),
          },
        ]);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto rounded-[22px] border border-[var(--border)] bg-white/95 p-4 shadow-[0_20px_45px_rgba(15,23,42,0.14)] backdrop-blur"
          >
            <div className="flex items-start gap-3">
              <ToastIcon tone={toast.tone} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {toast.title}
                </p>
                {toast.description ? (
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    {toast.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() =>
                  setToasts((current) =>
                    current.filter((currentToast) => currentToast.id !== toast.id),
                  )
                }
                className="rounded-full p-1 text-[var(--muted)] transition hover:bg-[var(--surface-soft)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}
