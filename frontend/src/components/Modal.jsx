import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Content */}
      <div className="relative bg-[#0D0D0D] border border-[#262626] rounded-3xl w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#262626]">
          <h2 className="text-lg font-black text-white uppercase tracking-tight">{title}</h2>
          <button 
            onClick={onClose}
            className="text-[#737373] hover:text-[#EF4444] transition-colors p-1.5 rounded-xl hover:bg-[#141414] cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
