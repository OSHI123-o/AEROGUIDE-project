import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [language, setLanguage] = useState<Language>(() => getStoredLang());

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  return (
    <main
      className="min-h-screen w-full flex relative overflow-hidden font-sans text-white"
      aria-label="AEROGUIDE signup experience"
    >
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-aeroguide-navy/95 via-aeroguide-navy/85 to-aeroguide-navy/40 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-20 w-full">
        <header className="flex items-center justify-between px-6 lg:px-12 pt-6 lg:pt-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 lg:w-12 lg:h-12 bg-aeroguide-gold rounded-2xl flex items-center justify-center shadow-lg shadow-aeroguide-gold/25">
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
              <span className="text-xl lg:text-2xl font-extrabold tracking-[0.2em] text-white">
                AEROGUIDE
              </span>
              <span className="text-[10px] lg:text-xs uppercase tracking-[0.25em] text-slate-300/80">
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
                className={`px-2.5 lg:px-3.5 py-0.5 rounded-full text-[11px] lg:text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aeroguide-gold/80 focus-visible:ring-offset-2 focus-visible:ring-offset-aeroguide-navy ${
                  language === lang
                    ? 'bg-aeroguide-gold text-aeroguide-navy shadow-lg shadow-aeroguide-gold/30'
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
              <span className="block mt-2 text-aeroguide-gold">
                and save your journeys.
              </span>
            </h1>

            <p className="text-base md:text-lg text-slate-200/90 leading-relaxed">
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
                  className="text-2xl md:text-2.5xl font-semibold md:font-bold text-white"
                >
                  Join AEROGUIDE
                </h2>
                <p className="text-slate-300 text-xs md:text-sm mt-2">
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
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-aeroguide-gold text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-aeroguide-gold transition-all text-sm"
                      placeholder="Nimal"
                    />
                    {errors.firstName && (
                      <p className="text-red-400 text-xs ml-1">{errors.firstName}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-slate-200 ml-1"
                    >
                      Last name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-aeroguide-gold text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-aeroguide-gold transition-all text-sm"
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
                    className="block text-sm font-medium text-slate-200 ml-1"
                  >
                    Email address
                  </label>
                  <input
                    id="signupEmail"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${
                      errors.email
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-white/10 focus:border-aeroguide-gold'
                    } text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-aeroguide-gold transition-all text-sm`}
                    placeholder="name@example.com"
                  />
                  {errors.email && (
                    <p className="text-red-400 text-xs ml-1">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="signupPassword"
                    className="block text-sm font-medium text-slate-200 ml-1"
                  >
                    Password
                  </label>
                  <input
                    id="signupPassword"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${
                      errors.password
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-white/10 focus:border-aeroguide-gold'
                    } text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-aeroguide-gold transition-all text-sm`}
                    placeholder="At least 8 characters"
                  />
                  {errors.password && (
                    <p className="text-red-400 text-xs ml-1">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="signupConfirmPassword"
                    className="block text-sm font-medium text-slate-200 ml-1"
                  >
                    Confirm password
                  </label>
                  <input
                    id="signupConfirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${
                      errors.confirmPassword
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-white/10 focus:border-aeroguide-gold'
                    } text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-aeroguide-gold transition-all text-sm`}
                    placeholder="Re-enter your password"
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-400 text-xs ml-1">{errors.confirmPassword}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!isFormValid || isLoading}
                  className={`w-full py-3.5 rounded-xl font-semibold md:font-bold text-base md:text-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aeroguide-gold/80 focus-visible:ring-offset-2 focus-visible:ring-offset-aeroguide-navy ${
                    isFormValid && !isLoading
                      ? 'bg-aeroguide-gold text-aeroguide-navy hover:bg-yellow-400 hover:shadow-aeroguide-gold/40 hover:-translate-y-0.5'
                      : 'bg-slate-600/60 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? 'Creating account...' : 'Create account'}
                </button>

                <p className="text-center mt-3 text-slate-300 text-xs md:text-sm">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-aeroguide-gold font-semibold hover:underline"
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
