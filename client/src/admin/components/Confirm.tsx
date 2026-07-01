import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingState extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/** Dialogue de confirmation in-app (remplace window.confirm), cohérent avec le design. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    const o: ConfirmOptions = typeof opts === 'string' ? { message: opts } : opts;
    return new Promise<boolean>((resolve) => setPending({ ...o, resolve }));
  }, []);

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="confirm-overlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(13,15,23,0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="card stack"
            style={{ maxWidth: 440, width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {pending.danger && <AlertTriangle size={22} color="#d4183d" style={{ flexShrink: 0, marginTop: 2 }} />}
              <div>
                {pending.title && <h3 style={{ margin: '0 0 6px', fontSize: 'var(--text-lg)' }}>{pending.title}</h3>}
                <p style={{ margin: 0, color: 'var(--color-ink-soft, #555)' }}>{pending.message}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => close(false)} autoFocus>
                {pending.cancelLabel ?? 'Annuler'}
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => close(true)}
                style={pending.danger ? { background: '#d4183d', borderColor: '#d4183d', color: '#fff' } : undefined}
              >
                {pending.confirmLabel ?? 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm doit être utilisé dans un ConfirmProvider');
  return ctx;
}
