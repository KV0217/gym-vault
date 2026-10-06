import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';
import { triggerHaptic, HapticType } from '../utils/haptics';

export default function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !window.MSStream;

    const isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    const dismissed = localStorage.getItem('gym_ios_prompt_dismissed');

    if (isIOS && !isStandalone && !dismissed) {
      setShowPrompt(true);
    }
  }, []);

  const handleDismiss = () => {
    triggerHaptic(HapticType.LIGHT);
    setShowPrompt(false);
    localStorage.setItem('gym_ios_prompt_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-50 bg-[#0D0D0D]/95 backdrop-blur-md border border-[#262626] rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.9)] animate-fade-in-up select-none">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black border border-[#EF4444] flex items-center justify-center text-[#EF4444] font-black shrink-0 shadow-inner">
            GYM
          </div>
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-1.5 uppercase">
              Install App on iPhone
              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40">
                iOS
              </span>
            </h4>
            <p className="text-xs text-[#A3A3A3] mt-0.5">
              Full-screen native view, zero browser bar & haptic workout tracking.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[#737373] hover:text-white p-1 rounded-lg"
          aria-label="Dismiss banner"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-[#1F1F1F] flex items-center justify-between text-xs text-white">
        <div className="flex items-center gap-1 text-[#EF4444] font-bold">
          1. Tap Safari Share <Share size={14} className="inline ml-0.5 text-[#EF4444]" />
        </div>
        <span className="text-[#525252]">→</span>
        <div className="flex items-center gap-1 text-white font-bold">
          2. 'Add to Home Screen' <PlusSquare size={14} className="inline ml-0.5 text-[#EF4444]" />
        </div>
      </div>
    </div>
  );
}
