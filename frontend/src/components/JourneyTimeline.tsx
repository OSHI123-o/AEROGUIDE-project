import React, { useEffect, useRef } from 'react';

interface JourneyStep {
  title: string;
  description: string;
  icon: string;
}

const steps: JourneyStep[] = [
  {
    title: "Arrival & Check-in",
    description: "Start your journey at our smart kiosks with express bag drop.",
    icon: "🧳",
  },
  {
    title: "Express Security",
    description: "Fast-track screening designed for a stress-free transition.",
    icon: "🛡️",
  },
  {
    title: "Premium Lounges",
    description: "Relax, recharge, or work in our exclusive quiet zones.",
    icon: "🛋️",
  },
  {
    title: "Smart Boarding",
    description: "Real-time gate navigation right to your aircraft seat.",
    icon: "✈️",
  },
];

const JourneyTimeline: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const scrollRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
          }
        });
      },
      { threshold: 0.2 }
    );

    scrollRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-20 px-6 max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <h2 className={`text-3xl sm:text-4xl font-black mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          The <span className="text-aeroguide-blue">Passenger Journey</span>
        </h2>
        <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} max-w-2xl mx-auto`}>
          Experience a seamless transition through Bandaranaike International Airport with our high-tech passenger guide.
        </p>
      </div>

      <div className="relative">
        {/* Vertical Line */}
        <div className="timeline-line" />

        <div className="space-y-12 sm:space-y-24">
          {steps.map((step, idx) => (
            <div
              key={idx}
              ref={(el) => (scrollRefs.current[idx] = el)}
              className={`reveal-on-scroll relative flex flex-col sm:flex-row items-center gap-8 ${
                idx % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'
              }`}
            >
              {/* Icon Circle */}
              <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-xl ${
                isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'
              } border-2`}>
                {step.icon}
              </div>

              {/* Content Card */}
              <div className={`flex-1 w-full p-6 rounded-3xl border transition-all duration-500 hover:scale-[1.02] ${
                isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
              }`}>
                <h3 className="text-xl font-bold mb-2 text-aeroguide-blue">{step.title}</h3>
                <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                  {step.description}
                </p>
              </div>

              {/* Spacer for large screens to maintain symmetry */}
              <div className="hidden sm:block flex-1" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default JourneyTimeline;
