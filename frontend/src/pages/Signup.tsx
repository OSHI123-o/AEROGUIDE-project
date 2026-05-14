import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getStoredLang, setStoredLang, type AppLang } from '../services/i18n';
import { setAuthenticated } from '../services/authSession';
import { supabase } from '../lib/supabaseClient';

type Language = AppLang;

type SignupApiResponse = {
  message: string;
  user?: { id: string; email: string; firstName: string; lastName: string };
  session?: { access_token: string; refresh_token: string; expires_at: number };
};

type FallbackSignupResult = {
  error?: string;
  needsEmailConfirmation?: boolean;
};
const GENERIC_SIGNUP_ERROR =
  'Signup failed. Check that the backend or Supabase connection is available.';

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [language, setLanguage] = useState<Language>(() => getStoredLang());

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [signupError, setSignupError] = useState('');

  const [errors, setErrors] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [isFormValid, setIsFormValid] = useState(false);

  const storeAuthenticatedUser = (profile: { firstName: string; lastName: string }) => {
    setStoredLang(language);
    localStorage.setItem('aeroguide_user_email', email.trim().toLowerCase());
    setAuthenticated(true);
    localStorage.setItem('aeroguide_user_profile', JSON.stringify(profile));
  };

  const fallbackToSupabaseSignup = async (): Promise<FallbackSignupResult> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim().toUpperCase(),
          },
        },
      });

      if (error) {
        return { error: error.message || GENERIC_SIGNUP_ERROR };
      }

      if (!data.session) {
        return { needsEmailConfirmation: true };
      }

      storeAuthenticatedUser({
        firstName: firstName.trim(),
        lastName: lastName.trim().toUpperCase(),
      });

      return {};
    } catch {
      return { error: GENERIC_SIGNUP_ERROR };
    }
  };

  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const strongPassword = password.length >= 8;
    const namesOk = firstName.trim().length > 0 && lastName.trim().length > 0;

    setErrors({
      firstName: firstName && !firstName.trim() ? 'Please enter your first name' : '',
      lastName: lastName && !lastName.trim() ? 'Please enter your last name' : '',
      email: email && !emailRegex.test(email) ? 'Please enter a valid email address' : '',
      password: password && !strongPassword ? 'Password must be at least 8 characters' : '',
      confirmPassword:
        confirmPassword && confirmPassword !== password ? 'Passwords do not match' : '',
    });

    const isValid =
      namesOk &&
      emailRegex.test(email) &&
      strongPassword &&
      confirmPassword.length > 0 &&
      confirmPassword === password;

    setIsFormValid(isValid);
  }, [firstName, lastName, email, password, confirmPassword]);

  useEffect(() => {
    let isActive = true;

    const restoreSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      const session = data.session;

      if (!isActive || error || !session?.user?.email) {
        setIsGoogleLoading(false);
        return;
      }

      // If we have a session, we're signed in (likely via Google)
      setIsGoogleLoading(false);
      navigate('/dashboard');
    };

    void restoreSession();

    return () => {
      isActive = false;
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setSignupError('');

    try {
      const normalizedEmail = email.trim().toLowerCase();

      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
          }),
        });

        let data: SignupApiResponse | null = null;
        try {
          data = (await res.json()) as SignupApiResponse;
        } catch {
          data = null;
        }

        if (!res.ok) {
          setSignupError(data?.message || 'Signup failed. Please try again.');
          return;
        }

        if (data?.session?.access_token && data.session.refresh_token) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }

        storeAuthenticatedUser({
          firstName: data?.user?.firstName || firstName.trim(),
          lastName: data?.user?.lastName || lastName.trim().toUpperCase(),
        });

        navigate('/dashboard');
        return;
      } catch {
        const fallbackResult = await fallbackToSupabaseSignup();

        if (fallbackResult.error) {
          setSignupError(fallbackResult.error);
          return;
        }

        if (fallbackResult.needsEmailConfirmation) {
          setSignupError('Account created. Check your email to confirm your account, then sign in.');
          return;
        }

        navigate('/dashboard');
        return;
      }
    } catch (error) {
      setSignupError(
        error instanceof Error && error.message ? error.message : GENERIC_SIGNUP_ERROR
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSignupError('');
    setIsGoogleLoading(true);

    const redirectUrl = new URL(`${window.location.origin}/signup`);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl.toString(),
      },
    });

    if (error) {
      setSignupError(error.message || 'Google sign-in failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen w-full flex relative overflow-hidden font-sans text-slate-900 bg-gradient-to-r from-[#2C6CBC] via-[#71C3F7] to-[#F5F5F5]"
      aria-label="AEROGUIDE signup experience"
    >
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Animated Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob bg-blue-300/50"></div>
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-[120px] opacity-60 animate-blob [animation-delay:2s] bg-aeroguide-pale/60"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[550px] h-[550px] rounded-full mix-blend-multiply filter blur-[110px] opacity-60 animate-blob [animation-delay:4s] bg-indigo-300/40"></div>

        {/* Universal Grid Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      <div className="relative z-20 w-full">
        <header className="flex items-center justify-between px-6 lg:px-12 pt-6 lg:pt-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 lg:w-12 lg:h-12 bg-aeroguide-blue rounded-2xl flex items-center justify-center shadow-lg shadow-aeroguide-blue/25">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-6 h-6 lg:w-7 lg:h-7 text-aeroguide-navy"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xl lg:text-2xl font-extrabold tracking-[0.2em] text-slate-900">
                AEROGUIDE
              </span>
              <span className="text-[10px] lg:text-xs uppercase tracking-[0.25em] text-slate-600">
                Smart airport navigation
              </span>
            </div>
          </div>

          <nav
            aria-label="Language selector"
            className="flex gap-1.5 lg:gap-2 bg-aeroguide-navy/40 border border-white/10 rounded-full px-1.5 py-1 backdrop-blur"
          >
            {(['EN', 'SI', 'TA'] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => {
                  setLanguage(lang);
                  setStoredLang(lang);
                }}
                className={`px-2.5 lg:px-3.5 py-0.5 rounded-full text-[11px] lg:text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aeroguide-blue/80 focus-visible:ring-offset-2 focus-visible:ring-offset-aeroguide-navy ${
                  language === lang
                    ? 'bg-aeroguide-blue text-aeroguide-navy shadow-lg shadow-aeroguide-blue/30'
                    : 'bg-white/5 text-slate-100 hover:bg-white/20'
                }`}
                aria-pressed={language === lang}
              >
                {lang}
              </button>
            ))}
          </nav>
        </header>

        <section className="container mx-auto px-6 lg:px-12 pb-12 pt-10 lg:pt-14 relative flex flex-col lg:flex-row items-center justify-center min-h-[calc(100vh-6rem)] gap-10 lg:gap-20">
          <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left space-y-7 lg:space-y-9 max-w-xl">
            <h1 className="text-3.5xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold lg:font-bold leading-tight tracking-tight">
              Create an account
              <br className="hidden md:block" />
              <span className="block mt-2 text-aeroguide-blue">
                and save your journeys.
              </span>
            </h1>

            <p className="text-base md:text-lg text-slate-700 leading-relaxed">
              Store traveler details, preferred language, and active trips in one secure
              profile. Seamless experiences every time you fly.
            </p>
          </div>

          <div className="w-full max-w-md lg:w-[420px]">
            <section
              aria-labelledby="signup-title"
              className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl shadow-black/30"
            >
              <header className="mb-7">
                <h2
                  id="signup-title"
                  className="text-2xl md:text-2.5xl font-semibold md:font-bold text-slate-900"
                >
                  Join AEROGUIDE
                </h2>
                <p className="text-slate-600 text-xs md:text-sm mt-2">
                  Set up your account in under a minute.
                </p>
              </header>

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
                noValidate
              >
                {/* Signup Error Message */}
                {signupError && (
                  <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-red-300 text-sm">
                    {signupError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-slate-200 ml-1"
                    >
                      First name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 focus:border-aeroguide-blue text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-aeroguide-blue transition-all text-sm"
                      placeholder="Nimal"
                    />
                    {errors.firstName && (
                      <p className="text-red-400 text-xs ml-1">{errors.firstName}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-slate-700 ml-1"
                    >
                      Last name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-aeroguide-blue text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-aeroguide-blue transition-all text-sm"
                      placeholder="Perera"
                    />
                    {errors.lastName && (
                      <p className="text-red-400 text-xs ml-1">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="signupEmail"
                    className="block text-sm font-medium text-slate-700 ml-1"
                  >
                    Email address
                  </label>
                  <input
                    id="signupEmail"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl bg-white border ${
                      errors.email
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-slate-300 focus:border-aeroguide-blue'
                    } text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-aeroguide-blue transition-all text-sm`}
                    placeholder="name@example.com"
                  />
                  {errors.email && (
                    <p className="text-red-400 text-xs ml-1">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="signupPassword"
                    className="block text-sm font-medium text-slate-700 ml-1"
                  >
                    Password
                  </label>
                  <input
                    id="signupPassword"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl bg-white border ${
                      errors.password
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-slate-300 focus:border-aeroguide-blue'
                    } text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-aeroguide-blue transition-all text-sm`}
                    placeholder="At least 8 characters"
                  />
                  {errors.password && (
                    <p className="text-red-400 text-xs ml-1">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="signupConfirmPassword"
                    className="block text-sm font-medium text-slate-700 ml-1"
                  >
                    Confirm password
                  </label>
                  <input
                    id="signupConfirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl bg-white border ${
                      errors.confirmPassword
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-slate-300 focus:border-aeroguide-blue'
                    } text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-aeroguide-blue transition-all text-sm`}
                    placeholder="Re-enter your password"
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-400 text-xs ml-1">{errors.confirmPassword}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!isFormValid || isLoading}
                  className={`w-full py-3.5 rounded-xl font-semibold md:font-bold text-base md:text-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C6CBC]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                    isFormValid && !isLoading
                      ? 'bg-gradient-to-r from-[#2C6CBC] via-[#71C3F7] to-[#F5F5F5] text-slate-900 hover:brightness-95 hover:-translate-y-0.5'
                      : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? 'Creating account...' : 'Create account'}
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-x-0 top-1/2 border-t border-slate-300/30" />
                  <span className="relative mx-auto block w-fit bg-white/10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 rounded-full backdrop-blur-sm">
                    Or
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => { void handleGoogleSignIn(); }}
                  disabled={isGoogleLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300/50 bg-white/40 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-white/60 shadow-sm"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 4.66c1.61 0 3.1.56 4.28 1.69l3.19-3.19C17.45 1.14 14.95 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span>{isGoogleLoading ? 'Connecting...' : 'Sign up with Google'}</span>
                </button>

                <p className="text-center mt-3 text-slate-600 text-xs md:text-sm">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-aeroguide-blue font-semibold hover:underline"
                  >
                    Back to sign in
                  </button>
                </p>
              </form>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
