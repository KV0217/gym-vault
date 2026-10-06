import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Dumbbell, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, loginWithApple } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await login('athlete@gym.app', 'password123');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithApple();
      navigate('/');
    } catch (err) {
      setError(err.message || 'Apple Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-[#EF4444] selection:text-white">
      {/* Background ambient red glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#EF4444]/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0D0D0D] border border-[#262626] mb-4 shadow-xl shadow-black/80">
            <Dumbbell className="w-8 h-8 text-[#EF4444]" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">
            Gym <span className="text-[#EF4444]">Vault</span>
          </h1>
          <p className="text-sm text-[#A3A3A3] mt-1 font-medium">
            AI-Driven Personal Training & Nutrition
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Athlete Sign In</h2>
            <p className="text-xs text-[#A3A3A3] mt-1">
              Access your personalized routines, nutrition logs, and AI coach
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#1F0A0A] border border-[#EF4444]/40 text-[#EF4444] text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#EF4444] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="athlete@gym.app"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#141414] border border-[#262626] rounded-xl text-white placeholder-[#555] text-sm focus:outline-none focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#EF4444] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-3 bg-[#141414] border border-[#262626] rounded-xl text-white placeholder-[#555] text-sm focus:outline-none focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-white text-black font-black text-sm uppercase tracking-wider rounded-xl hover:bg-[#EF4444] hover:text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-[#EF4444]/25 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Login */}
          <div className="mt-4 pt-4 border-t border-[#1C1C1C]">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full py-2.5 px-3 bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all hover:border-[#EF4444]/60"
            >
              <Zap className="w-3.5 h-3.5 text-[#EF4444]" />
              Quick Demo Athlete Login
            </button>
          </div>

          {/* Sign in with Apple (iOS native requirement) */}
          <div className="mt-3">
            <button
              type="button"
              onClick={handleAppleLogin}
              disabled={loading}
              className="w-full py-2.5 px-3 bg-black hover:bg-[#111] border border-[#333] rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.69-7.85-12.01-14.42-6.19-9.5-10.97-20.2-14.34-32.1-3.37-11.9-5.06-23.01-5.06-33.34 0-14.42 3.65-26.68 10.96-36.78 7.31-10.1 16.5-15.22 27.57-15.35 4.35 0 9.28 1.13 14.79 3.39 5.51 2.26 9.69 3.44 12.54 3.53 2.21-.13 6.64-1.39 13.28-3.78 6.64-2.39 12.18-3.39 16.63-3 12.44.88 22.42 5.56 29.93 14.04-10.96 6.66-16.34 15.77-16.14 27.32.2 9.07 3.65 16.79 10.36 23.16 6.71 6.37 14.85 10.02 24.42 10.96-2.22 6.6-4.78 12.6-7.68 18.02zM119.22 31.84c0-7.39 2.65-14.4 7.95-21.03 5.3-6.63 12.05-10.81 20.25-12.54.38 1.25.57 2.45.57 3.6 0 7.39-2.73 14.4-8.19 21.03-5.46 6.63-12.14 10.6-20.04 11.91-.19-.99-.54-2-.54-2.97z"/>
              </svg>
              Continue with Apple
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-[#A3A3A3]">
            Don't have an athlete account?{' '}
            <Link to="/register" className="text-white hover:text-[#EF4444] font-bold transition-colors">
              Create Account
            </Link>
          </div>
        </div>

        {/* Security / Offline Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#737373]">
          <ShieldCheck className="w-4 h-4 text-[#EF4444]" />
          <span>Encrypted multi-tenant vault & offline cache enabled</span>
        </div>
      </div>
    </div>
  );
}
