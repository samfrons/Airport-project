'use client';

import { useState } from 'react';
import { TowerControl, LogIn, UserPlus, Mail, Lock, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Mode = 'login' | 'signup' | 'forgot';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const getSupabase = () => createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = '/';
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Check your email for a confirmation link.');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Check your email for a password reset link.');
    }
    setLoading(false);
  };

  const handleSubmit = mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleForgotPassword;

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="bg-blue-600 p-3 mb-4">
            <TowerControl className="text-white" size={24} strokeWidth={1.8} />
          </div>
          <h1 className="text-lg font-semibold text-zinc-50 tracking-tight">JPX Dashboard</h1>
          <p className="text-xs text-zinc-500 mt-1">Airport operations monitoring for KJPX</p>
        </div>

        {/* Form */}
        <div className="bg-zinc-900 border border-zinc-800 p-6">
          <h2 className="text-sm font-semibold text-zinc-200 mb-1">
            {mode === 'login' && 'Sign in to your account'}
            {mode === 'signup' && 'Create an account'}
            {mode === 'forgot' && 'Reset your password'}
          </h2>
          <p className="text-xs text-zinc-500 mb-6">
            {mode === 'login' && 'Enter your credentials to access the dashboard'}
            {mode === 'signup' && 'Register to access the monitoring dashboard'}
            {mode === 'forgot' && 'We\'ll send you a reset link'}
          </p>

          {error && (
            <div className="flex items-start gap-2 bg-red-950/40 border border-red-900/60 px-3 py-2.5 mb-4">
              <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {message && (
            <div className="bg-emerald-950/40 border border-emerald-900/60 px-3 py-2.5 mb-4">
              <p className="text-xs text-emerald-300">{message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-widest mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm placeholder:text-zinc-700 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-widest mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Min 6 characters"
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm placeholder:text-zinc-700 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <><LogIn size={14} /> Sign In</>
              ) : mode === 'signup' ? (
                <><UserPlus size={14} /> Create Account</>
              ) : (
                <><Mail size={14} /> Send Reset Link</>
              )}
            </button>
          </form>

          {/* Mode switchers */}
          <div className="mt-5 pt-4 border-t border-zinc-800 space-y-2">
            {mode === 'login' && (
              <>
                <button
                  onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
                  className="block w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Don&apos;t have an account? <span className="text-blue-400">Sign up</span>
                </button>
                <button
                  onClick={() => { setMode('forgot'); setError(null); setMessage(null); }}
                  className="block w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Forgot your password?
                </button>
              </>
            )}
            {(mode === 'signup' || mode === 'forgot') && (
              <button
                onClick={() => { setMode('login'); setError(null); setMessage(null); }}
                className="block w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Back to <span className="text-blue-400">Sign in</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-zinc-700 mt-6 uppercase tracking-wider">
          Wainscott Citizens Advisory Committee
        </p>
      </div>
    </div>
  );
}
