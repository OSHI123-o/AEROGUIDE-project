import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_USERS, getPassengerProfileFromUserId } from '../services/passengerProfile';
import { getStoredLang, type AppLang } from '../services/i18n';

type Language = AppLang;

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [language, setLanguage] = useState<Language>(() => getStoredLang());
  const [selectedUserId, setSelectedUserId] = useState<string>(DEMO_USERS[0].id);
  
  const [errors, setErrors] = useState({ email: '', password: '' });
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
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    
    // Store language preference for dashboard
    localStorage.setItem('aeroguide_lang', language);
    localStorage.setItem('aeroguide_user_id', selectedUserId);
    localStorage.setItem('aeroguide_user_email', email.trim().toLowerCase());
    localStorage.setItem('aeroguide_passenger_profile', JSON.stringify(getPassengerProfileFromUserId(selectedUserId)));
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden font-sans text-white">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-aeroguide-navy/95 via-aeroguide-navy/80 to-aeroguide-navy/40 backdrop-blur-[2px]"></div>
      </div>

      {/* Language Switcher (Top Right) */}
      <div className="absolute top-6 right-6 z-20 flex gap-2">
        {(['EN', 'SI', 'TA'] as Language[]).map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`px-3 py-1 rounded-full text-sm font-bold transition-all duration-200 ${
              language === lang 
                ? 'bg-aeroguide-gold text-aeroguide-navy shadow-lg scale-105' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            aria-label={`Switch language to ${lang}`}
            aria-pressed={language === lang}
          >
            {lang}
          </button>
        ))}
      </div>

      <div className="container mx-auto px-6 py-12 relative z-10 flex flex-col lg:flex-row items-center justify-center min-h-screen gap-12 lg:gap-24">
        
        {/* Left Side: Hero Content */}
        <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left space-y-8 animate-fade-in-up">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-aeroguide-gold rounded-xl flex items-center justify-center shadow-lg shadow-aeroguide-gold/20">
              <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-aeroguide-navy" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </div>
            <span className="text-3xl font-black tracking-wider text-white">AEROGUIDE</span>
          </div>

          <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
            Explore Smarter. <br />
            <span className="text-aeroguide-gold">Fly Easier.</span>
          </h1>
          
          <p className="text-lg text-slate-200 max-w-lg leading-relaxed">
            AEROGUIDE guides passengers through airports with step-by-step navigation, gate reminders, and multilingual assistance.
          </p>

          <div className="flex gap-4 pt-4">
            <div className="flex -space-x-3">
              {[1,2,3].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-aeroguide-navy bg-slate-300 overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <div className="flex flex-col justify-center text-sm">
              <span className="font-bold text-white">10k+ Travelers</span>
              <span className="text-aeroguide-gold">Trust us daily</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="w-full max-w-md lg:w-[420px]">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl shadow-black/20">
            <h2 className="text-2xl font-bold mb-1 text-white">Welcome Back</h2>
            <p className="text-slate-300 text-sm mb-8">Please enter your details to sign in.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Passenger Profile Selector */}
              <div className="space-y-2">
                <label htmlFor="userProfile" className="block text-sm font-medium text-slate-200 ml-1">Passenger Profile</label>
                <select
                  id="userProfile"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 focus:border-aeroguide-gold text-white focus:outline-none focus:ring-1 focus:ring-aeroguide-gold transition-all"
                >
                  {DEMO_USERS.map((user) => (
                    <option key={user.id} value={user.id} className="text-slate-900">
                      {user.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-slate-200 ml-1">Email Address</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3.5 rounded-xl bg-white/5 border ${errors.email ? 'border-red-400 focus:border-red-400' : 'border-white/10 focus:border-aeroguide-gold'} text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-aeroguide-gold transition-all`}
                  placeholder="name@example.com"
                />
                {errors.email && <p className="text-red-400 text-xs ml-1">{errors.email}</p>}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-slate-200 ml-1">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-3.5 rounded-xl bg-white/5 border ${errors.password ? 'border-red-400 focus:border-red-400' : 'border-white/10 focus:border-aeroguide-gold'} text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-aeroguide-gold transition-all pr-12`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs ml-1">{errors.password}</p>}
              </div>

              {/* Extras */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-aeroguide-gold border-aeroguide-gold' : 'border-slate-400 group-hover:border-white'}`}>
                    {rememberMe && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-aeroguide-navy">
                        <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <input type="checkbox" className="hidden" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
                  <span className="text-slate-300 group-hover:text-white transition-colors">Remember me</span>
                </label>
                <a href="#" className="text-aeroguide-gold hover:text-yellow-300 font-medium transition-colors">Forgot Password?</a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isFormValid || isLoading}
                className={`w-full py-3.5 rounded-xl font-bold text-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-2
                  ${isFormValid && !isLoading 
                    ? 'bg-aeroguide-gold text-aeroguide-navy hover:bg-yellow-400 hover:shadow-aeroguide-gold/30 hover:-translate-y-0.5' 
                    : 'bg-slate-600/50 text-slate-400 cursor-not-allowed'}`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              {/* Divider */}
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">or</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              {/* Google Button */}
              <button type="button" className="w-full py-3.5 rounded-xl bg-white text-slate-700 font-semibold text-base hover:bg-slate-100 transition-colors flex items-center justify-center gap-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 4.66c1.61 0 3.1.56 4.28 1.69l3.19-3.19C17.45 1.14 14.95 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

              <div className="text-center mt-6">
                <p className="text-slate-300 text-sm">
                  Don't have an account?{' '}
                  <a href="#" className="text-aeroguide-gold font-bold hover:underline">Create an Account</a>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
