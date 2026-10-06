import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, title, children, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
      }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative bg-[#0D0D0D] border border-[#262626] rounded-3xl w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col animate-fade-in-up"
        style={{ maxHeight: 'min(90dvh, 48rem)' }}
      >
        <div className="flex items-center justify-between gap-3 p-4 sm:p-6 border-b border-[#262626] shrink-0">
          <h2 className="text-lg font-black text-white uppercase tracking-tight">{title}</h2>
          <button 
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[#737373] hover:text-[#EF4444] transition-colors p-1.5 rounded-xl hover:bg-[#141414] cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
