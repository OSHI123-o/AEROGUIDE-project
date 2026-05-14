import React, { useState } from "react";
import { getDestinationData } from "../services/destinationData";

interface DestinationGuideProps {
  city: string;
  isDark: boolean;
}

export default function DestinationGuide({ city, isDark }: DestinationGuideProps) {
  const data = getDestinationData(city);
  const [activeSlide, setActiveSlide] = useState(0);

  if (!data) return null;

  const nextSlide = () => setActiveSlide((prev) => (prev + 1) % data.places.length);
  const prevSlide = () => setActiveSlide((prev) => (prev - 1 + data.places.length) % data.places.length);

  return (
    <section 
      className={`rounded-[24px] border p-4 sm:p-5 transition-all duration-300 overflow-hidden relative max-w-4xl mx-auto ${
        isDark 
          ? 'bg-black/40 backdrop-blur-xl border-white/10 text-white' 
          : 'bg-white/60 backdrop-blur-xl border-white/40 text-slate-900 shadow-lg'
      }`}
    >
      <div className="flex flex-col md:flex-row items-center gap-6">
        
        {/* Left Side: Travel Journal Info (Compact) */}
        <div className="md:w-2/5 space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-aeroguide-gold flex items-center justify-center text-xl shadow-lg">
                📖
             </div>
             <div>
                <div className={`text-[9px] uppercase font-black tracking-widest ${isDark ? 'text-aeroguide-blue' : 'text-[#2C6CBC]'}`}>
                   Travel Journal
                </div>
                <h2 className="text-xl font-black tracking-tight leading-none">
                   {data.city}, <span className="text-aeroguide-gold">{data.countryCode === 'MY' ? '🇲🇾' : data.countryCode === 'AE' ? '🇦🇪' : data.countryCode === 'SG' ? '🇸🇬' : '🌍'}</span>
                </h2>
             </div>
          </div>

          <p className={`text-xs font-medium leading-relaxed italic ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            "{data.overview.substring(0, 120)}..."
          </p>

          <div className={`p-3 rounded-[16px] border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-white/60 shadow-sm'}`}>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
               <span>Highlights</span>
               <span className="text-aeroguide-gold">{data.country}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
               {data.countryInfo.highlights.slice(0, 2).map((h, i) => (
                  <span key={i} className={`px-2 py-1 rounded-md text-[9px] font-bold ${isDark ? 'bg-aeroguide-blue/20 text-aeroguide-blue' : 'bg-blue-50 text-blue-600'}`}>
                     {h}
                  </span>
               ))}
            </div>
          </div>
        </div>

        {/* Right Side: Mini Book Slider */}
        <div className="md:w-3/5 w-full relative">
           <div className={`relative aspect-[4/3] rounded-[20px] overflow-hidden border-4 ${isDark ? 'border-white/10' : 'border-white'} shadow-2xl group`}>
              {/* Slide Content */}
              <div className="absolute inset-0 transition-all duration-500 transform">
                 <img 
                    src={data.places[activeSlide].image} 
                    alt={data.places[activeSlide].name}
                    className="w-full h-full object-cover"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                 
                 {/* Category Tag (Keep on image) */}
                 <div className="absolute top-4 left-4 z-10">
                    <span className="bg-aeroguide-gold text-black text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg">
                       {data.places[activeSlide].category}
                    </span>
                 </div>
              </div>

              {/* Navigation Arrows */}
              <button 
                onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
              >
                ←
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
              >
                →
              </button>

              {/* Page Indicator */}
              <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md border border-white/20 px-2 py-1 rounded-lg text-[9px] font-black text-white z-10">
                 PAGE {activeSlide + 1} / {data.places.length}
              </div>
           </div>

           {/* Description UNDER the image */}
           <div className={`mt-3 px-1 transition-all duration-300 transform`}>
              <h4 className="text-sm font-black leading-tight flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-aeroguide-gold"></span>
                 {data.places[activeSlide].name}
              </h4>
              <p className={`text-[10px] font-medium mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                 {data.places[activeSlide].description}
              </p>
           </div>

           {/* Stacked Effect (visual decoration for book) */}
           <div className={`absolute -bottom-1 -right-1 inset-0 -z-10 rounded-[20px] border transform translate-x-1 translate-y-1 ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-200 border-slate-300'}`}></div>
           <div className={`absolute -bottom-2 -right-2 inset-0 -z-20 rounded-[20px] border transform translate-x-2 translate-y-2 ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'}`}></div>
        </div>

      </div>
    </section>
  );
}
