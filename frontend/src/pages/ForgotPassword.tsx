import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredLang, setStoredLang, type AppLang } from '../services/i18n';

type Language = AppLang;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>(() => getStoredLang());
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!email) {
      setError('');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setError(emailRegex.test(email) ? '' : 'Please enter a valid email address');
  }, [email]);

  const isFormValid = email.length > 0 && !error;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    // Simulated API call to send reset link
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsLoading(false);
    setIsSubmitted(true);
  };

  return (
    <main
      className="min-h-screen w-full flex relative overflow-hidden font-sans text-white"
      aria-label="AEROGUIDE password reset"
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
              Reset your password
              <br className="hidden md:block" />
              <span className="block mt-2 text-aeroguide-gold">
                and stay on top of your trips.
              </span>
            </h1>

            <p className="text-base md:text-lg text-slate-200/90 leading-relaxed">
              We&apos;ll send a secure link to your email address so you can create a new
              password.
            </p>
          </div>

          <div className="w-full max-w-md lg:w-[420px]">
            <section
              aria-labelledby="forgot-title"
              className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl shadow-black/30"
            >
              <header className="mb-7">
                <h2
                  id="forgot-title"
                  className="text-2xl md:text-2.5xl font-semibold md:font-bold text-white"
                >
                  Forgot your password?
                </h2>
                <p className="text-slate-300 text-xs md:text-sm mt-2">
                  Enter the email linked to your AEROGUIDE account.
                </p>
              </header>

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
                noValidate
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor="resetEmail"
                    className="block text-sm font-medium text-slate-200 ml-1"
                  >
                    Email address
                  </label>
                  <input
                    id="resetEmail"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${
                      error
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-white/10 focus:border-aeroguide-gold'
                    } text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-aeroguide-gold transition-all text-sm`}
                    placeholder="name@example.com"
                  />
                  {error && <p className="text-red-400 text-xs ml-1">{error}</p>}
                </div>

                {isSubmitted && (
                  <p className="text-emerald-300 text-xs md:text-sm">
                    If an account exists for this email, a reset link has been sent.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!isFormValid || isLoading}
                  className={`w-full py-3.5 rounded-xl font-semibold md:font-bold text-base md:text-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aeroguide-gold/80 focus-visible:ring-offset-2 focus-visible:ring-offset-aeroguide-navy ${
                    isFormValid && !isLoading
                      ? 'bg-aeroguide-gold text-aeroguide-navy hover:bg-yellow-400 hover:shadow-aeroguide-gold/40 hover:-translate-y-0.5'
                      : 'bg-slate-600/60 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? 'Sending link...' : 'Send reset link'}
                </button>

                <p className="text-center mt-3 text-slate-300 text-xs md:text-sm">
                  Remembered your password?{' '}
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

