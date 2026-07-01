import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { toast as sonnerToast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

type ToastType = 'success' | 'error' | 'info';

interface ToastApi {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Feedback transitoire global. Réimplémenté sur `sonner` (shadcn/ui) tout en conservant
 * l'API `useToast()` historique (toast/success/error/info) → aucun appelant à modifier.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const api = useMemo<ToastApi>(() => {
    const toast = (message: string, type: ToastType = 'success') => {
      if (type === 'success') sonnerToast.success(message);
      else if (type === 'error') sonnerToast.error(message);
      else sonnerToast.info(message);
    };
    return {
      toast,
      success: (m) => toast(m, 'success'),
      error: (m) => toast(m, 'error'),
      info: (m) => toast(m, 'info'),
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster richColors position="top-right" />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans un ToastProvider');
  return ctx;
}
