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
        backgroundImage: `url('https://img.freepik.com/free-photo/amazing-beautiful-art-sky-with-colorful-clouds_58702-1866.jpg?semt=ais_hybrid&w=740&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-[#0A1A2F]/80 backdrop-blur-[4px]" />

      {/* Header */}
      <div className="relative mx-auto mb-12 flex w-full max-w-7xl items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d7ad58] shadow-[0_10px_30px_rgba(215,173,88,0.2)]">
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
        
        </nav>
      </div>

      {/* Main Content Area */}
      <section className="relative mx-auto w-full max-w-lg rounded-[32px] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-2xl z-10">
        <div className="grid grid-cols-1 gap-4">
          
          {/* LEFT SIDE: Form */}
          <div className="rounded-[28px] px-6 py-10 sm:px-12">
            <h1 className="text-lg font-medium uppercase tracking-widest text-slate-300">
              Holla,
            </h1>
            <h2 className="mt-2 text-4xl font-black uppercase leading-none tracking-tight text-[#e6edf8] sm:text-5xl">
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
                      : 'border-white/10 bg-white/5 focus:border-[#d7ad58] focus:bg-white/10'
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
                        : 'border-white/10 bg-white/5 focus:border-[#d7ad58] focus:bg-white/10'
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
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-[#d7ad58] focus:ring-[#d7ad58] focus:ring-offset-0"
                  />
                  <span className="text-sm font-medium text-slate-300">Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm font-semibold text-[#d7ad58] hover:text-slate-200 transition"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={!isFormValid || isLoading}
                className={`mt-4 w-full rounded-xl px-4 py-4 text-sm font-bold tracking-wide transition-all ${
                  isFormValid && !isLoading
                    ? 'bg-[#d7ad58] text-[#0A1A2F] shadow-[0_4px_14px_rgba(215,173,88,0.25)] hover:bg-[#c79a44]'
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
                  className="font-bold text-[#d7ad58] hover:text-slate-200 transition"
                >
                  Sign Up
                </button>
              </p>
            </form>
          </div>


        </div>
      </section>
    </main>
  );
}
