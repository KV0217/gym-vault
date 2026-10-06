import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Dumbbell,
  ListChecks,
  Calendar,
  Apple,
  TrendingUp,
  Target,
  Moon,
  Pill,
  Settings,
  LogOut
} from 'lucide-react';
import { triggerHaptic, HapticType } from '../utils/haptics';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ profile }) {
  const { user, logout } = useAuth();
  const userName = user?.name || profile?.name || 'Athlete';
  const userGoal = profile?.goal ? profile.goal.toUpperCase() : 'FITNESS';

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'AI Coach', path: '/ai', icon: Bot },
    { name: 'Workouts', path: '/workouts', icon: Dumbbell },
    { name: 'Exercises', path: '/exercises', icon: ListChecks },
    { name: 'Templates', path: '/templates', icon: Calendar },
    { name: 'Nutrition', path: '/nutrition', icon: Apple },
    { name: 'Progress', path: '/progress', icon: TrendingUp },
    { name: 'Goals', path: '/goals', icon: Target },
    { name: 'Sleep', path: '/sleep', icon: Moon },
    { name: 'Supplements', path: '/supplements', icon: Pill },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-[260px] h-screen fixed left-0 top-0 bg-black border-r border-[#262626] flex flex-col z-20 select-none">
      {/* Header */}
      <div className="p-6 flex items-center gap-3.5 border-b border-[#1A1A1A]">
        <div className="p-2.5 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-center shadow-inner">
          <Dumbbell size={22} className="text-[#EF4444]" />
        </div>
        <div>
          <h1 className="text-lg font-black tracking-wider text-white uppercase">GYM TRACKER</h1>
          <div className="text-[10px] text-[#A3A3A3] font-extrabold tracking-widest uppercase">
            AI Training Suite
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/'}
              onClick={() => triggerHaptic(HapticType.LIGHT)}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-200 font-bold text-sm ${
                  isActive
                    ? 'bg-[#141414] border-l-4 border-[#EF4444] text-white shadow-[0_0_15px_rgba(239,68,68,0.12)]'
                    : 'text-[#A3A3A3] hover:bg-[#0D0D0D] hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={20}
                    className={`shrink-0 transition-colors ${
                      isActive ? 'text-[#EF4444]' : 'text-[#EF4444]/80'
                    }`}
                  />
                  <span>{item.name}</span>
                  {item.name === 'AI Coach' && (
                    <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-md bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30">
                      AI
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Athlete Profile Footer with Logout */}
      <div className="p-4 m-3 rounded-2xl bg-[#121212] border border-[#262626]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-black border border-[#EF4444]/50 flex items-center justify-center font-black text-[#EF4444] text-base shrink-0 shadow-inner">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-extrabold text-white truncate">{userName}</div>
              <div className="text-[10px] text-[#A3A3A3] truncate">
                {user?.email || 'Logged In'}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-2 rounded-xl text-[#737373] hover:text-[#EF4444] hover:bg-[#1A1A1A] transition-colors shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
