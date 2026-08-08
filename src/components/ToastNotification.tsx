import React from 'react';

export interface Toast { id: string; message: string; agentName?: string; }

interface Props { toasts: Toast[]; removeToast: (id: string) => void; }

export const ToastNotification: React.FC<Props> = ({ toasts, removeToast }) => {
  React.useEffect(() => {
    const timers = toasts.map(t => setTimeout(() => removeToast(t.id), 4000));
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-xs">
      {toasts.map(t => (
        <div key={t.id} className="hud-card chamfer-sm p-3 bg-purple-950/80 border-purple-400/40 text-[12px] text-purple-100 animate-[fadeIn_0.3s]">
          {t.message}
        </div>
      ))}
    </div>
  );
};
