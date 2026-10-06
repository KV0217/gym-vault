import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

export default function StatCard({ icon: Icon, label, value, trend, iconColor = "text-[#EF4444]" }) {
  return (
    <div className="bg-[#121212] rounded-2xl p-5 sm:p-6 border border-[#262626] shadow-sm flex flex-col justify-between h-full card-glow transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl bg-black flex items-center justify-center border border-[#262626] shadow-inner ${iconColor}`}>
          {Icon && <Icon size={20} className="text-[#EF4444]" />}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-xs font-black px-2 py-0.5 rounded-full ${
            trend > 0 ? 'bg-white/10 text-white' : trend < 0 ? 'bg-[#EF4444]/15 text-[#EF4444]' : 'text-[#737373]'
          }`}>
            {trend > 0 ? <ArrowUp size={13} className="mr-0.5" /> : trend < 0 ? <ArrowDown size={13} className="mr-0.5" /> : null}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <h3 className="text-[#A3A3A3] text-xs font-bold uppercase tracking-wider mb-1">{label}</h3>
        <div className="text-2xl sm:text-3xl font-black text-white">{value}</div>
      </div>
    </div>
  );
}
