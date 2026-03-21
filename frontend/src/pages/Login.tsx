import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getStoredLang, setStoredLang, type AppLang } from '../services/i18n';
import { setAuthenticated } from '../services/authSession';
import { supabase } from '../lib/supabaseClient';

type Language = AppLang;

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

  // Validation Logic
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = emailRegex.test(email);
    const isPasswordValid = password.length >= 6;

    setErrors({
      email: email && !isEmailValid ? 'Please enter a valid email address' : '',
      password: password && !isPasswordValid ? 'Password must be at least 6 characters' : ''
    });

    setIsFormValid(isEmailValid && isPasswordValid);
  }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setLoginError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setLoginError(error.message || 'Invalid email or password');
        setIsLoading(false);
        return;
      }

      // Store language & basic auth context for dashboard
      setStoredLang(language);
      localStorage.setItem('aeroguide_user_email', email.trim().toLowerCase());
      setAuthenticated(true);

      if (data.user?.user_metadata) {
        localStorage.setItem(
          'aeroguide_user_profile',
          JSON.stringify({
            firstName: data.user.user_metadata.first_name || '',
            lastName: data.user.user_metadata.last_name || '',
          })
        );
      }

      if (rememberMe) {
        localStorage.setItem('aeroguide_remember_me', 'true');
      } else {
        localStorage.removeItem('aeroguide_remember_me');
      }

      const next = searchParams.get('next');
      navigate(next && next.startsWith('/') ? next : '/dashboard');
    } catch {
      setLoginError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen w-full flex relative overflow-hidden font-sans text-white"
      aria-label="AEROGUIDE login experience"
    >
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-aeroguide-navy/95 via-aeroguide-navy/85 to-aeroguide-navy/40 backdrop-blur-[2px]" />
      </div>

      {/* Global Shell: brand + language */}
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

          {/* Language Switcher */}
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
          {/* Left Side: Hero Content */}
          <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left space-y-7 lg:space-y-9 max-w-xl">
            <h1 className="text-3.5xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold lg:font-bold leading-tight tracking-tight">
              Navigate any airport
              <br className="hidden md:block" />
              <span className="block mt-2 text-aeroguide-gold">
                calmly and confidently.
              </span>
            </h1>

            <p className="text-base md:text-lg text-slate-200/90 leading-relaxed">
              Real-time indoor navigation, live flight context, and personalized passenger
              profiles that follow you from check‑in to boarding.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-5 pt-2">
              <div className="flex -space-x-3 justify-center sm:justify-start">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-aeroguide-navy bg-slate-300 overflow-hidden shadow-md shadow-black/30"
                  >
                    <img
                      src={`https://i.pravatar.cc/100?img=${i + 10}`}
                      alt="Traveler"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-col text-xs md:text-sm text-slate-100">
                <span className="font-semibold md:font-bold">
                  10,000+ travelers guided every day
                </span>
                <span className="text-aeroguide-gold/90">Across major international hubs</span>
              </div>
            </div>
          </div>

          {/* Right Side: Login Card */}
          <div className="w-full max-w-md lg:w-[420px]">
            <section
              aria-labelledby="login-title"
              className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl shadow-black/30"
            >
              <header className="mb-7">
                <h2
                  id="login-title"
                  className="text-2xl md:text-2.5xl font-semibold md:font-bold text-white"
                >
                  Sign in to your journey
                </h2>
                <p className="text-slate-300 text-xs md:text-sm mt-2">
                  Enter your credentials to access your trip details.
                </p>
              </header>

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
                noValidate
                aria-describedby={
                  errors.email || errors.password ? 'login-error-summary' : undefined
                }
              >
                {/* Login Error Message */}
                {loginError && (
                  <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-red-300 text-sm">
                    {loginError}
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-200 ml-1"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-3.5 rounded-xl bg-white/5 border ${
                      errors.email
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-white/10 focus:border-aeroguide-gold'
                    } text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-aeroguide-gold transition-all text-sm`}
                    placeholder="name@example.com"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                  {errors.email && (
                    <p id="email-error" className="text-red-400 text-xs ml-1">
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-200 ml-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full px-4 py-3.5 rounded-xl bg-white/5 border ${
                        errors.password
                          ? 'border-red-400 focus:border-red-400'
                          : 'border-white/10 focus:border-aeroguide-gold'
                      } text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-aeroguide-gold transition-all pr-12 text-sm`}
                      placeholder="••••••••"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? 'password-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors text-xs font-medium"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {errors.password && (
                    <p id="password-error" className="text-red-400 text-xs ml-1">
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Error summary for screen readers */}
                {(errors.email || errors.password) && (
                  <p
                    id="login-error-summary"
                    className="text-red-300/90 text-xs"
                    aria-live="polite"
                  >
                    Please fix the highlighted fields before continuing.
                  </p>
                )}

                {/* Extras */}
                <div className="flex items-center justify-between text-xs md:text-sm">
                  <label className="inline-flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                    />
                    <span
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        rememberMe
                          ? 'bg-aeroguide-gold border-aeroguide-gold'
                          : 'border-slate-400/80 group-hover:border-white'
                      }`}
                      aria-hidden="true"
                    >
                      {rememberMe && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-3.5 h-3.5 text-aeroguide-navy"
                        >
                          <path
                            fillRule="evenodd"
                            d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="text-slate-300 group-hover:text-white transition-colors">
                      Remember this device
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-aeroguide-gold hover:text-yellow-300 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!isFormValid || isLoading}
                  className={`w-full py-3.5 rounded-xl font-semibold md:font-bold text-base md:text-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aeroguide-gold/80 focus-visible:ring-offset-2 focus-visible:ring-offset-aeroguide-navy ${
                    isFormValid && !isLoading
                      ? 'bg-aeroguide-gold text-aeroguide-navy hover:bg-yellow-400 hover:shadow-aeroguide-gold/40 hover:-translate-y-0.5'
                      : 'bg-slate-600/60 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 text-current"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>

                {/* Divider */}
                <div className="relative flex items-center py-1.5">
                  <div className="flex-grow border-t border-white/10" />
                  <span className="flex-shrink-0 mx-3 text-slate-400 text-[11px] md:text-xs uppercase tracking-[0.2em]">
                    or continue with
                  </span>
                  <div className="flex-grow border-t border-white/10" />
                </div>

                {/* Google Button */}
                <button
                  type="button"
                  className="w-full py-3.5 rounded-xl bg-white text-slate-800 font-semibold text-sm md:text-base hover:bg-slate-100 transition-colors flex items-center justify-center gap-3 border border-slate-200/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aeroguide-gold/80 focus-visible:ring-offset-2 focus-visible:ring-offset-aeroguide-navy"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 4.66c1.61 0 3.1.56 4.28 1.69l3.19-3.19C17.45 1.14 14.95 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <p className="text-center mt-4 text-slate-300 text-xs md:text-sm">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/signup')}
                    className="text-aeroguide-gold font-semibold hover:underline"
                  >
                    Create an account
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
