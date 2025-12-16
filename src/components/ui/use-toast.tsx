"use client";

import { useState, useCallback, useEffect } from "react";

export interface Toast {
  id: string;
  title?: string;
  description: string;
  variant?: "default" | "destructive";
}

interface ToastContextValue {
  toast: (toast: Omit<Toast, "id">) => void;
}

let toastListeners: ((toast: Toast) => void)[] = [];
let toastIdCounter = 0;

export function useToast(): ToastContextValue {
  const toast = useCallback((toastData: Omit<Toast, "id">) => {
    const id = `toast-${++toastIdCounter}`;
    const newToast: Toast = { ...toastData, id };
    toastListeners.forEach((listener) => listener(newToast));
  }, []);

  return { toast };
}

// Toast container component
export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 5000);
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            rounded-lg border p-4 shadow-lg min-w-[300px]
            ${
              toast.variant === "destructive"
                ? "bg-destructive text-destructive-foreground border-destructive"
                : "bg-background text-foreground border-border"
            }
          `}
        >
          {toast.title && (
            <div className="font-semibold mb-1">{toast.title}</div>
          )}
          <div className="text-sm">{toast.description}</div>
        </div>
      ))}
    </div>
  );
}

