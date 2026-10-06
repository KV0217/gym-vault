import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import IOSTabBar from './IOSTabBar';
import IOSInstallPrompt from './IOSInstallPrompt';
import { api } from '../api';
import { Dumbbell, Settings, Sparkles } from 'lucide-react';

export default function Layout() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const data = await api('/profile');
      setProfile(data);
    } catch (err) {
      console.error('Failed to fetch profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
        <div className="w-12 h-12 border-4 border-[#EF4444] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-[#A3A3A3] font-bold text-xs tracking-widest uppercase">
          Loading GYM Suite...
        </div>
      </div>
    );
  }

  // If user has not completed onboarding, take them to the onboarding wizard
  if (profile && !profile.onboarding_complete) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Desktop Sidebar (hidden on screens < 1024px) */}
      <div className="hidden lg:block">
        <Sidebar profile={profile} onProfileUpdate={fetchProfile} />
      </div>

      {/* Mobile iOS Top Navigation Bar (visible only on screens < 1024px) */}
      <header
        className="lg:hidden sticky top-0 z-30 bg-black/95 backdrop-blur-xl border-b border-[#262626] px-4 py-3 flex items-center justify-between"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#141414] border border-[#262626] flex items-center justify-center text-[#EF4444]">
            <Dumbbell size={20} />
          </div>
          <div>
            <div className="text-base font-black tracking-wider text-white leading-tight">GYM TRACKER</div>
            <div className="text-[10px] text-[#A3A3A3] font-bold tracking-widest uppercase flex items-center gap-1.5">
              <span>{profile?.name || 'Athlete'}</span>
              <span className="text-[#EF4444] font-black">• {profile?.goal?.toUpperCase() || 'FITNESS'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/ai"
            className="p-2 rounded-xl bg-[#171717] text-[#EF4444] border border-[#262626] active:scale-95 transition-transform"
            aria-label="AI Coach"
          >
            <Sparkles size={18} />
          </Link>
          <Link
            to="/settings"
            className="p-2 rounded-xl bg-[#171717] text-[#A3A3A3] hover:text-white border border-[#262626] active:scale-95 transition-transform"
            aria-label="Settings"
          >
            <Settings size={18} />
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full lg:ml-[260px] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-28 lg:pb-8">
        <Outlet context={{ profile, refreshProfile: fetchProfile }} />
      </main>

      {/* iOS Floating Tab Bar (Mobile only) */}
      <IOSTabBar profile={profile} />

      {/* iOS "Add to Home Screen" Safari guidance banner */}
      <IOSInstallPrompt />
    </div>
  );
}
