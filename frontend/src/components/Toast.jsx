import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => {
          let borderColor = 'border-[#EF4444]';
          let badgeText = 'text-[#EF4444]';

          if (toast.type === 'error') {
            borderColor = 'border-[#EF4444]';
            badgeText = 'text-[#EF4444]';
          } else if (toast.type === 'success' || toast.type === 'achievement') {
            borderColor = 'border-[#EF4444]';
            badgeText = 'text-white';
          }

          return (
            <div
              key={toast.id}
              className={`animate-fade-in-up border-l-4 ${borderColor} bg-[#0D0D0D] border-t border-r border-b border-[#262626] rounded-2xl shadow-2xl p-4 flex items-center justify-between min-w-[280px]`}
            >
              <span className={`text-xs font-bold leading-relaxed ${badgeText}`}>{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
