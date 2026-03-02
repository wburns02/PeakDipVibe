import { useState, useCallback, useEffect, createContext, useContext } from "react";
import { Star, X } from "lucide-react";

interface ToastItem {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastContextType {
  show: (message: string, action?: ToastItem["action"]) => void;
}

const ToastContext = createContext<ToastContextType>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, action?: ToastItem["action"]) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, action }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-20 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2 md:bottom-6">
        {toasts.map((t) => (
          <ToastMessage key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastMessage({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="flex animate-[slideUp_200ms_ease-out] items-center gap-3 rounded-xl border border-border bg-bg-secondary px-4 py-2.5 text-sm text-text-primary shadow-xl">
      <Star className="h-4 w-4 shrink-0 text-amber" />
      <span>{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => { toast.action!.onClick(); onDismiss(); }}
          className="shrink-0 text-xs font-bold text-accent hover:underline"
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 text-text-muted hover:text-text-primary">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
