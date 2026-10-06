import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Dumbbell,
  Apple,
  Grid,
  X,
  ListChecks,
  Calendar,
  TrendingUp,
  Target,
  Moon,
  Pill,
  Settings,
  ChevronRight
} from 'lucide-react';
import { triggerHaptic, HapticType } from '../utils/haptics';

export default function IOSTabBar({ profile }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();

  const handleTabClick = () => {
    triggerHaptic(HapticType.LIGHT);
  };

  const moreItems = [
    { name: 'Exercises Library', path: '/exercises', icon: ListChecks, desc: 'Search 30+ movement guides' },
    { name: 'Workout Templates', path: '/templates', icon: Calendar, desc: 'PPL, Arnold & Upper/Lower splits' },
    { name: 'Progress Analytics', path: '/progress', icon: TrendingUp, desc: 'Strength curves & PR history' },
    { name: 'Fitness Goals', path: '/goals', icon: Target, desc: 'Active targets and milestone metrics' },
    { name: 'Sleep & Recovery', path: '/sleep', icon: Moon, desc: 'Sleep duration & circadian logs' },
    { name: 'Supplements', path: '/supplements', icon: Pill, desc: 'Daily creatine, whey & vitamins' },
    { name: 'Settings & Profile', path: '/settings', icon: Settings, desc: 'Preferences, units & macro targets' },
  ];

  const isMoreActive = moreItems.some((item) => location.pathname === item.path);

  return (
    <>
      {/* iOS Floating Monochrome Tab Bar with Red Icons */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-2xl border-t border-[#262626] lg:hidden ios-touch select-none"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="grid grid-cols-5 h-16 max-w-md mx-auto items-center">
          {/* 1. Dashboard */}
          <NavLink
            to="/"
            end
            onClick={handleTabClick}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center h-full transition-colors ${
                isActive ? 'text-white' : 'text-[#737373] hover:text-[#A3A3A3]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <LayoutDashboard
                  size={21}
                  className={isActive ? 'text-[#EF4444] stroke-[2.4]' : 'text-[#EF4444]/70 stroke-2'}
                />
                <span className={`text-[10px] mt-1 font-bold ${isActive ? 'text-white' : 'text-[#737373]'}`}>
                  Home
                </span>
                {isActive && <div className="w-1 h-1 rounded-full bg-[#EF4444] mt-0.5"></div>}
              </>
            )}
          </NavLink>

          {/* 2. AI Coach */}
          <NavLink
            to="/ai"
            onClick={handleTabClick}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center h-full transition-colors relative ${
                isActive ? 'text-white' : 'text-[#737373] hover:text-[#A3A3A3]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Bot
                    size={22}
                    className={isActive ? 'text-[#EF4444] stroke-[2.4]' : 'text-[#EF4444]/70 stroke-2'}
                  />
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-[#EF4444] animate-pulse"></span>
                </div>
                <span className={`text-[10px] mt-1 font-bold ${isActive ? 'text-white' : 'text-[#737373]'}`}>
                  AI Coach
                </span>
                {isActive && <div className="w-1 h-1 rounded-full bg-[#EF4444] mt-0.5"></div>}
              </>
            )}
          </NavLink>

          {/* 3. Workouts */}
          <NavLink
            to="/workouts"
            onClick={handleTabClick}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center h-full transition-colors ${
                isActive ? 'text-white' : 'text-[#737373] hover:text-[#A3A3A3]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Dumbbell
                  size={22}
                  className={isActive ? 'text-[#EF4444] stroke-[2.4]' : 'text-[#EF4444]/70 stroke-2'}
                />
                <span className={`text-[10px] mt-1 font-bold ${isActive ? 'text-white' : 'text-[#737373]'}`}>
                  Workout
                </span>
                {isActive && <div className="w-1 h-1 rounded-full bg-[#EF4444] mt-0.5"></div>}
              </>
            )}
          </NavLink>

          {/* 4. Nutrition */}
          <NavLink
            to="/nutrition"
            onClick={handleTabClick}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center h-full transition-colors ${
                isActive ? 'text-white' : 'text-[#737373] hover:text-[#A3A3A3]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Apple
                  size={21}
                  className={isActive ? 'text-[#EF4444] stroke-[2.4]' : 'text-[#EF4444]/70 stroke-2'}
                />
                <span className={`text-[10px] mt-1 font-bold ${isActive ? 'text-white' : 'text-[#737373]'}`}>
                  Diet
                </span>
                {isActive && <div className="w-1 h-1 rounded-full bg-[#EF4444] mt-0.5"></div>}
              </>
            )}
          </NavLink>

          {/* 5. More */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(HapticType.LIGHT);
              setSheetOpen(true);
            }}
            className={`flex flex-col items-center justify-center h-full transition-colors cursor-pointer ${
              isMoreActive || sheetOpen ? 'text-white' : 'text-[#737373] hover:text-[#A3A3A3]'
            }`}
          >
            <Grid
              size={21}
              className={isMoreActive || sheetOpen ? 'text-[#EF4444] stroke-[2.4]' : 'text-[#EF4444]/70 stroke-2'}
            />
            <span
              className={`text-[10px] mt-1 font-bold ${
                isMoreActive || sheetOpen ? 'text-white' : 'text-[#737373]'
              }`}
            >
              More
            </span>
            {isMoreActive && <div className="w-1 h-1 rounded-full bg-[#EF4444] mt-0.5"></div>}
          </button>
        </div>
      </nav>

      {/* iOS Slide-up Sheet Drawer for "More" */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setSheetOpen(false)}
          />

          <div
            className="relative bg-[#0D0D0D] border-t border-[#262626] rounded-t-3xl max-h-[85vh] overflow-y-auto z-10 shadow-2xl animate-fade-in-up"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="w-12 h-1 bg-[#262626] rounded-full mx-auto my-3" />

            <div className="px-6 py-2.5 flex items-center justify-between border-b border-[#1A1A1A]">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">GYM Training Suite</h3>
                <p className="text-xs text-[#737373]">Signed in as {profile?.name || 'Athlete'}</p>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="p-2 rounded-full bg-[#171717] text-[#A3A3A3] hover:text-white border border-[#262626]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      triggerHaptic(HapticType.LIGHT);
                      setSheetOpen(false);
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl transition-all border ${
                      active
                        ? 'bg-[#171717] border-[#EF4444] shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                        : 'bg-[#141414] border-[#262626] hover:bg-[#1A1A1A] hover:border-[#333333]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                          active
                            ? 'bg-black text-[#EF4444] border-[#EF4444]'
                            : 'bg-black text-[#EF4444] border-[#262626]'
                        }`}
                      >
                        <Icon size={20} className="text-[#EF4444]" />
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${active ? 'text-white' : 'text-[#E5E5E5]'}`}>
                          {item.name}
                        </div>
                        <div className="text-xs text-[#737373]">{item.desc}</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-[#737373]" />
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
