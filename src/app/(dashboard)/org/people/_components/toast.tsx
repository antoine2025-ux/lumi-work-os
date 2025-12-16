import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastTone = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
  createdAt: number;
};

type ToastCtx = {
  push: (t: Omit<ToastItem, "id" | "createdAt">) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((t: Omit<ToastItem, "id" | "createdAt">) => {
    const id = `toast_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const item: ToastItem = { id, createdAt: Date.now(), ...t };
    setItems((prev) => [item, ...prev].slice(0, 4));
    // Auto-dismiss
    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-full max-w-[420px] flex-col gap-2 px-4 sm:px-0">
        {items.map((t) => (
          <div
            key={t.id}
            className={[
              "rounded-2xl border p-3 shadow-xl backdrop-blur",
              t.tone === "success"
                ? "border-emerald-300/60 bg-emerald-50/70 dark:border-emerald-400/30 dark:bg-emerald-400/10"
                : t.tone === "error"
                  ? "border-rose-300/60 bg-rose-50/70 dark:border-rose-400/30 dark:bg-rose-400/10"
                  : "border-black/10 bg-white/80 dark:border-white/10 dark:bg-black/50",
            ].join(" ")}
            role="status"
            aria-live="polite"
          >
            <div className="text-sm font-semibold text-black/90 dark:text-white/90">
              {t.title}
            </div>
            {t.message ? (
              <div className="mt-1 text-sm text-black/70 dark:text-white/70">
                {t.message}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

