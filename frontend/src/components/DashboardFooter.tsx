import React from "react";
import { Link } from "react-router-dom";
import tarmacBg from "../assets/tarmac_bg.jpg";

export default function DashboardFooter({ isDark }: { isDark: boolean }) {
  return (
    <footer className="w-full mt-24 flex flex-col">
      {/* Footer Text Section */}
      <div className={`w-full pt-12 pb-8 px-6 sm:px-10 lg:px-12 ${isDark ? 'bg-[#0B1021]' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Useful Links */}
          <div className="space-y-4">
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#334155]'}`}>Useful Links</h3>
            <ul className={`space-y-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {['Ministry of Ports & Civil Aviation', 'Sri Lanka Airport & Aviation Academy (SLAAA)', 'Sri Lanka Bureau of Foreign Employment', 'Aeronautical Information Services [AIS]', 'Exchange Rates', 'Weather Information', 'Civil Aviation Authority of Sri Lanka', 'Sri Lanka Customs', 'Department of Immigration & Emigration', 'Sri Lanka Tourism'].map((link, i) => (
                <li key={i} className="flex items-start">
                  <span className="mr-2 text-aeroguide-blue opacity-70">▸</span>
                  <a href="#" className="hover:text-aeroguide-blue transition-colors leading-tight">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Latest News */}
          <div className="space-y-4">
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#334155]'}`}>Latest News</h3>
            <div className="space-y-6">
              <div className="flex gap-3">
                <div className="w-16 h-10 rounded overflow-hidden shrink-0 bg-black/20">
                  <img src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=150&q=80" alt="News" className="w-full h-full object-cover" />
                </div>
                <div>
                  <a href="#" className={`text-xs font-semibold hover:text-aeroguide-blue transition-colors leading-snug line-clamp-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Batik Air Malaysia Launches Colombo Flights, Boosting Sri Lanka-Malaysia Connectivity</a>
                  <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>2026-03-30</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-16 h-10 rounded overflow-hidden shrink-0 bg-black/20">
                  <img src="https://images.unsplash.com/photo-1542296332-2e4473faf563?w=150&q=80" alt="News" className="w-full h-full object-cover" />
                </div>
                <div>
                  <a href="#" className={`text-xs font-semibold hover:text-aeroguide-blue transition-colors leading-snug line-clamp-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>IndiGo Expands Sri Lanka Connectivity with New Delhi–Colombo Flights</a>
                  <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>2026-03-29</p>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency No */}
          <div className="space-y-4">
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#334155]'}`}>Emergency No</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className={`text-xs space-y-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <div className="flex items-start"><span className="mr-1 text-aeroguide-blue opacity-70">▸</span> Police 119</div>
                <div className="flex items-start"><span className="mr-1 text-aeroguide-blue opacity-70">▸</span> Fire 110</div>
                <div className="flex items-start"><span className="mr-1 text-aeroguide-blue opacity-70">▸</span> Emergency Services</div>
                <div className="pt-4 flex flex-col gap-1">
                  <div className="flex items-start"><span className="mr-1 text-aeroguide-blue opacity-70">▸</span> SriLankan Airlines</div>
                  <span className="pl-3 opacity-80">+94 197 335 555</span>
                </div>
              </div>
              <div className={`text-xs space-y-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <div className="flex items-start"><span className="mr-1 text-aeroguide-blue opacity-70">▸</span> Ambulance 1990</div>
                <div className="flex items-start"><span className="mr-1 text-aeroguide-blue opacity-70">▸</span> Telephone Directory 1212</div>
                <div className="pt-2 flex flex-col gap-1">
                  <div className="flex items-start"><span className="mr-1 text-aeroguide-blue opacity-70">▸</span> BIA Mishandled Baggage</div>
                  <span className="pl-3 opacity-80">+94 197 332 418</span>
                  <span className="pl-3 opacity-80">+94 917 332 415</span>
                  <span className="pl-3 opacity-80">+94 197 333 366</span>
                </div>
                <div className="pt-2 flex flex-col gap-1">
                  <div className="flex items-start"><span className="mr-1 text-aeroguide-blue opacity-70">▸</span> BIA Flight Information</div>
                  <span className="pl-3 opacity-80">+94 112 263 047</span>
                  <span className="pl-3 opacity-80">+94 112 263 048</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Us */}
          <div className="space-y-4">
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#334155]'}`}>Contact Us</h3>
            <div className={`text-xs space-y-3 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <p>
                <span className="font-semibold block opacity-80 mb-1">Address:</span>
                Airport and Aviation Services (Sri Lanka)<br />
                (Private) Limited.<br />
                Bandaranaike International Airport,<br />
                Katunayake,<br />
                Sri Lanka.
              </p>
              <p><span className="font-semibold opacity-80">Telephone:</span> +94 11 226 4444</p>
              <p><span className="font-semibold opacity-80">Fax:</span> +94 11 225 9435</p>
              <p><span className="font-semibold opacity-80">Airport Duty Manager:</span> +94 11 225 3333</p>
              <p><span className="font-semibold opacity-80">Email:</span> comments@airport.lk</p>
              
              <div className="pt-4">
                <h4 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Follow Us</h4>
                <div className="flex items-center gap-3">
                  <a href="#" className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${isDark ? 'border-white/20 text-white hover:bg-aeroguide-blue hover:border-transparent' : 'border-slate-300 text-slate-600 hover:bg-aeroguide-blue hover:text-white hover:border-transparent'}`}>f</a>
                  <a href="#" className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${isDark ? 'border-white/20 text-white hover:bg-aeroguide-blue hover:border-transparent' : 'border-slate-300 text-slate-600 hover:bg-aeroguide-blue hover:text-white hover:border-transparent'}`}>𝕏</a>
                  <a href="#" className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${isDark ? 'border-white/20 text-white hover:bg-aeroguide-blue hover:border-transparent' : 'border-slate-300 text-slate-600 hover:bg-aeroguide-blue hover:text-white hover:border-transparent'}`}>▶</a>
                  <a href="#" className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${isDark ? 'border-white/20 text-white hover:bg-aeroguide-blue hover:border-transparent' : 'border-slate-300 text-slate-600 hover:bg-aeroguide-blue hover:text-white hover:border-transparent'}`}>in</a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Image Section completely below the text */}
      <div className="w-full relative mt-[-100px] pointer-events-none -z-10">
        <div className={`absolute inset-0 bg-gradient-to-b ${isDark ? 'from-[#0B1021] via-transparent to-[#0B1021]/80' : 'from-[#F5F5F5] via-transparent to-transparent'}`}></div>
        <img 
          src={tarmacBg} 
          alt="Airport Tarmac" 
          className="w-full object-cover"
          style={{ maxHeight: '400px' }}
        />
      </div>
    </footer>
  );
}
