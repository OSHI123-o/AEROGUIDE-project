import React, { useState, useEffect } from 'react';

const images = [
  {
    url: "https://images.unsplash.com/photo-1436491865332-7a61a109c0f3?q=80&w=1200&auto=format&fit=crop",
    title: "BIA Main Terminal",
    desc: "A hub of global connectivity and Sri Lankan hospitality."
  },
  {
    url: "https://images.unsplash.com/photo-1540339832862-474599807836?q=80&w=1200&auto=format&fit=crop",
    title: "Premium Lounges",
    desc: "Experience world-class comfort before your flight."
  },
  {
    url: "https://images.unsplash.com/photo-1510253687831-0f982d7862fc?q=80&w=1200&auto=format&fit=crop",
    title: "Duty Free Zone",
    desc: "Global brands and unique local treasures."
  }
];

const TerminalSlider: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <article className={`relative h-[300px] rounded-[32px] overflow-hidden shadow-2xl transition-all duration-300 border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
      {images.map((img, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            idx === current ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img src={img.url} alt={img.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white z-20">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-aeroguide-blue mb-2 block">Terminal Highlight</span>
            <h3 className="text-3xl font-black mb-2 tracking-tight">{img.title}</h3>
            <p className="text-slate-300 text-sm max-w-md">{img.desc}</p>
          </div>
        </div>
      ))}
      
      {/* Dots */}
      <div className="absolute bottom-6 right-8 flex gap-2 z-30">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              idx === current ? 'bg-aeroguide-blue w-6' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </article>
  );
};

export default TerminalSlider;
