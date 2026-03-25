import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getStoredLang, setStoredLang, type AppLang } from '../services/i18n';
import { setAuthenticated } from '../services/authSession';
import { supabase } from '../lib/supabaseClient';

type Language = AppLang;
type LoginApiResponse = {
  message: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    preferredLang: AppLang;
    avatarUrl: string | null;
  };
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
};

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [language, setLanguage] = useState<Language>(() => getStoredLang());

  const [errors, setErrors] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const storeAuthenticatedUser = (
    normalizedEmail: string,
    profile?: { firstName: string; lastName: string } | null
  ) => {
    setStoredLang(language);
    localStorage.setItem('aeroguide_user_email', normalizedEmail);
    setAuthenticated(true);

    if (profile) {
      localStorage.setItem(
        'aeroguide_user_profile',
        JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
        })
      );
    }
  };

  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = emailRegex.test(email);
    const isPasswordValid = password.length >= 6;

    setErrors({
      email: email && !isEmailValid ? 'Please enter a valid email address' : '',
      password: password && !isPasswordValid ? 'Password must be at least 6 characters' : '',
    });

    setIsFormValid(isEmailValid && isPasswordValid);
  }, [email, password]);

  useEffect(() => {
    const authError = searchParams.get('error_description') || searchParams.get('error');
    if (authError) {
      setLoginError(authError);
      setIsGoogleLoading(false);
      return;
    }

    let isActive = true;

    const restoreSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      const session = data.session;

      if (!isActive || error || !session?.user?.email) {
        setIsGoogleLoading(false);
        return;
      }

      const metadata = session.user.user_metadata || {};
      storeAuthenticatedUser(session.user.email, {
        firstName: metadata.first_name || metadata.full_name || '',
        lastName: metadata.last_name || '',
      });

      setIsGoogleLoading(false);

      const next = searchParams.get('next');
      navigate(next && next.startsWith('/') ? next : '/dashboard');
    };

    void restoreSession();

    return () => {
      isActive = false;
    };
  }, [navigate, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setLoginError('');

    try {
      const normalizedEmail = email.trim().toLowerCase();
      let profile: { firstName: string; lastName: string } | null = null;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
          }),
        });

        let data: LoginApiResponse | null = null;
        try {
          data = (await res.json()) as LoginApiResponse;
        } catch {
          data = null;
        }

        if (!res.ok) {
          setLoginError(data?.message || 'Invalid email or password');
          setIsLoading(false);
          return;
        }

        if (data?.session?.access_token && data.session.refresh_token) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }

        if (data?.user) {
          profile = {
            firstName: data.user.firstName || '',
            lastName: data.user.lastName || '',
          };
        }
      } catch {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          setLoginError(error.message || 'Invalid email or password');
          setIsLoading(false);
          return;
        }

        if (data.user?.user_metadata) {
          profile = {
            firstName: data.user.user_metadata.first_name || '',
            lastName: data.user.user_metadata.last_name || '',
          };
        }
      }

      storeAuthenticatedUser(normalizedEmail, profile);

      if (rememberMe) {
        localStorage.setItem('aeroguide_remember_me', 'true');
      } else {
        localStorage.removeItem('aeroguide_remember_me');
      }

      const next = searchParams.get('next');
      navigate(next && next.startsWith('/') ? next : '/dashboard');
    } catch (error) {
      setLoginError(
        error instanceof Error && error.message
          ? error.message
          : 'Sign-in failed. Check that the backend or Supabase connection is available.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoginError('');
    setIsGoogleLoading(true);

    const next = searchParams.get('next');
    const redirectUrl = new URL(`${window.location.origin}/login`);
    if (next && next.startsWith('/')) {
      redirectUrl.searchParams.set('next', next);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl.toString(),
      },
    });

    if (error) {
      setLoginError(error.message || 'Google sign-in failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen bg-[#0A1A2F] px-4 py-8 text-slate-900 sm:px-6 lg:px-8 relative overflow-hidden"
      aria-label="AEROGUIDE login experience"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1600&auto=format&fit=crop')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-[#0A1A2F]/80 backdrop-blur-[4px]" />

      {/* Header */}
      <div className="relative mx-auto mb-12 flex w-full max-w-7xl items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDB913] shadow-[0_10px_30px_rgba(253,185,19,0.3)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6 text-[#0A1A2F]"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </div>
          <div>
            <div className="text-xl font-extrabold tracking-[0.18em] text-white">
              AEROGUIDE
            </div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-300">
              Smart airport navigation
            </div>
          </div>
        </div>

        <nav
          aria-label="Language selector"
          className="flex gap-1 rounded-full border border-white/20 bg-white/5 p-1 backdrop-blur-md"
        >
          {(['EN', 'SI', 'TA'] as Language[]).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => {
                setLanguage(lang);
                setStoredLang(lang);
              }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                language === lang
                  ? 'bg-[#FDB913] text-[#0A1A2F]'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              {lang}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <section className="relative mx-auto w-full max-w-7xl rounded-[32px] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-2xl z-10">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          
          {/* LEFT SIDE: Form */}
          <div className="rounded-[28px] px-6 py-10 sm:px-12">
            <h1 className="text-lg font-medium uppercase tracking-widest text-slate-300">
              Holla,
            </h1>
            <h2 className="mt-2 text-4xl font-black uppercase leading-none tracking-tight text-[#FDB913] sm:text-5xl">
              Welcome Back
            </h2>

            <p className="mt-5 text-sm leading-relaxed text-slate-300">
              Hey, welcome back to your special place to navigate the skies.
            </p>

            <form onSubmit={handleSubmit} className="mt-10 space-y-6" noValidate>
              {loginError && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 backdrop-blur-sm">
                  {loginError}
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-white">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 ${
                    errors.email
                      ? 'border-red-400/50 bg-red-500/5 focus:border-red-400'
                      : 'border-white/10 bg-white/5 focus:border-[#FDB913] focus:bg-white/10'
                  }`}
                  placeholder="name@example.com"
                />
                {errors.email && <p className="mt-2 text-xs text-red-400">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-white">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full rounded-xl border px-4 py-3.5 pr-16 text-sm text-white outline-none transition placeholder:text-slate-500 ${
                      errors.password
                        ? 'border-red-400/50 bg-red-500/5 focus:border-red-400'
                        : 'border-white/10 bg-white/5 focus:border-[#FDB913] focus:bg-white/10'
                    }`}
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.password && <p className="mt-2 text-xs text-red-400">{errors.password}</p>}
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-[#FDB913] focus:ring-[#FDB913] focus:ring-offset-0"
                  />
                  <span className="text-sm font-medium text-slate-300">Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm font-semibold text-[#FDB913] hover:text-yellow-300 transition"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={!isFormValid || isLoading}
                className={`mt-4 w-full rounded-xl px-4 py-4 text-sm font-bold tracking-wide transition-all ${
                  isFormValid && !isLoading
                    ? 'bg-[#FDB913] text-[#0A1A2F] shadow-[0_4px_14px_rgba(253,185,19,0.3)] hover:bg-[#e6a60d]'
                    : 'cursor-not-allowed bg-white/5 border border-white/10 text-slate-500' // Fixed the ugly light grey disabled button
                }`}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="relative py-4">
                <div className="absolute inset-x-0 top-1/2 border-t border-white/10" />
                <span className="relative mx-auto block w-fit bg-[#0F2038] px-4 text-xs font-semibold uppercase tracking-widest text-slate-500 rounded-full">
                  Or
                </span>
              </div>

              <button
                type="button"
                onClick={() => { void handleGoogleSignIn(); }}
                disabled={isGoogleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 4.66c1.61 0 3.1.56 4.28 1.69l3.19-3.19C17.45 1.14 14.95 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>{isGoogleLoading ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>

              <p className="pt-2 text-center text-sm text-slate-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="font-bold text-[#FDB913] hover:text-yellow-300 transition"
                >
                  Sign Up
                </button>
              </p>
            </form>
          </div>

          {/* RIGHT SIDE: Clean Glassmorphism Graphic */}
          <div className="relative flex flex-col justify-center rounded-[28px] px-6 py-10 sm:px-12 overflow-hidden">
            
            <div className="relative z-10 mb-10">
              <h1 className="text-4xl font-black uppercase leading-[1.05] tracking-tight text-[#FDB913] sm:text-5xl">
                Access your saved <br /> passenger details.
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-300">
                Sign in to manage passengers, saved routes, preferred languages and view real-time flight dashboards.
              </p>
            </div>

            {/* Structured Glass Dashboard Mockup (Fixes the messy overlap) */}
            <div className="relative w-full max-w-md mx-auto">
              {/* Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#FDB913]/20 blur-[80px] rounded-full pointer-events-none" />
              
              {/* Main Mockup Card */}
              <div className="relative flex flex-col gap-5 rounded-[24px] border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
                
                {/* Mockup Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDB913]">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-[#0A1A2F]" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 2L11 13" />
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Aeroguide</div>
                      <div className="text-sm font-bold text-white">Smart Journeys</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Secure
                  </div>
                </div>

                {/* Mockup Flight Card */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Next Flight</span>
                    <div className="flex items-center gap-2 text-lg font-bold text-white">
                      <span>LHR</span>
                      <svg className="h-4 w-4 text-[#FDB913]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14m0 0l-7-7m7 7l-7 7" />
                      </svg>
                      <span>JFK</span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[65%] rounded-full bg-[#FDB913]"></div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                    <span>Boarding: 10:45 AM</span>
                    <span className="text-[#FDB913]">Gate: A12</span>
                  </div>
                </div>

                {/* Mockup Feature Card */}
                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Terminal Navigation</div>
                    <div className="text-xs text-slate-400">Real-time gate and lounge maps</div>
                  </div>
                </div>

              </div>
            </div>
            
          </div>
        </div>
      </section>
    </main>
  );
}