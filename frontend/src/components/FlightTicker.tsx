import React from 'react';
import { flights } from '../mockData';

interface FlightTickerProps {
  isDark: boolean;
}

const FlightTicker: React.FC<FlightTickerProps> = ({ isDark }) => {
  // Triple the items to ensure a seamless infinite loop
  const tickerItems = [...flights, ...flights, ...flights];

  const bgColor = isDark ? 'bg-black/30' : 'bg-white/40';
  const borderColor = isDark ? 'border-white/10' : 'border-slate-200';
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const subTextColor = isDark ? 'text-slate-400' : 'text-slate-600';
  const badgeTextColor = isDark ? 'text-aeroguide-navy' : 'text-white';
  const badgeBg = isDark ? 'bg-aeroguide-gold' : 'bg-aeroguide-blue';

  return (
    <div className={`flight-ticker-container w-full h-10 flex items-center ${bgColor} backdrop-blur-md border-y ${borderColor} relative z-20 transition-colors duration-300`}>
      <div className={`absolute left-0 top-0 bottom-0 px-4 ${badgeBg} flex items-center z-30 shadow-lg`}>
        <span className={`text-[10px] font-black uppercase tracking-widest ${badgeTextColor} whitespace-nowrap`}>
          Live Updates
        </span>
      </div>
      
      <div className="flight-ticker-content flex items-center h-full">
        {tickerItems.map((flight, idx) => (
          <div key={`${flight.flightNo}-${idx}`} className="ticker-item gap-4 border-r border-white/5 last:border-0">
            <span className="text-aeroguide-blue font-black text-sm">{flight.flightNo}</span>
            <div className="flex flex-col leading-none">
              <span className={`${textColor} font-bold text-[12px] uppercase`}>{flight.to.split('(')[0].trim()}</span>
              <span className={`${subTextColor} text-[10px] uppercase`}>{new Date(flight.schedDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              flight.status === 'On Time' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
              flight.status === 'Delayed' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
              'bg-blue-500/20 text-blue-600 dark:text-blue-400'
            }`}>
              {flight.status.toUpperCase()}
            </span>
            <span className="text-slate-400 font-bold mx-4 opacity-30">/</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlightTicker;
