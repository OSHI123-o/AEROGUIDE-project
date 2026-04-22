import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeModeIcon from "../components/ThemeModeIcon";
import { publishVoiceEvent, requestMicrophonePermission, speakText } from "../services/voiceAssistant";

const DEFAULT_FLIGHT = {
  pnr: "AG1234",
  lastName: "PERERA",
  flightNo: "UL225",
  originCode: "CMB",
  originCity: "Colombo",
  destinationCode: "DXB",
  destinationCity: "Dubai",
  departureIso: "2026-02-25T12:30:00+05:30",
  gate: "A12",
  terminal: "T1",
  status: "On Schedule",
};

const steps = [
  { id: "arrive", title: "Arrive at Terminal", detail: "Enter terminal and keep passport + ticket ready." },
  { id: "checkin", title: "Check-in / Bag Drop", detail: "Finish check-in and drop checked baggage." },
  { id: "security", title: "Security Check", detail: "Follow screening instructions and liquids policy." },
  { id: "immigration", title: "Immigration", detail: "Passport control before departure area." },
  { id: "gate", title: "Go to Boarding Gate", detail: "Reach gate early and monitor flight updates." },
];

const stepGuide = {
  arrive: {
    heading: "Arrive at terminal",
    objective: "Start early and get oriented before queues build up.",
    points: [
      "Enter Terminal 1 and confirm your exact flight number, airline, and departure time on FIDS screens.",
      "Keep passport, ticket/PNR, and visa documents in one easy-access pouch.",
    ],
    why: "Most delays start at arrival: wrong counter, missing documents, and late queue entry create avoidable stress.",
    prepare: ["Passport", "PNR or e-ticket"],
    qualityChecks: ["All travel documents are physically in hand."],
    commonMistakes: ["Standing in the wrong airline queue."],
    timeHint: "5 to 12 minutes",
    proTip: "Take a quick photo of your check-in counter info so you can return if you get redirected.",
  },
  checkin: {
    heading: "Check-in and bag drop",
    objective: "Get your boarding pass and clear baggage without rework.",
    points: [
      "Join the check-in or bag-drop queue shown for your airline.",
      "Present passport, ticket/PNR, and visa pages in one set to speed processing.",
    ],
    why: "Clean check-in prevents backtracking later.",
    prepare: ["Passport", "Ticket/PNR", "Checked baggage"],
    qualityChecks: ["Boarding pass shows correct name and flight number."],
    commonMistakes: ["Walking away without verifying boarding pass details."],
    timeHint: "12 to 30 minutes",
    proTip: "Ask counter staff if your gate is likely to change.",
  },
  security: {
    heading: "Security screening",
    objective: "Pass screening in one attempt with no item recovery issues.",
    points: [
      "Separate laptop/tablet, liquids, and metal items exactly as instructed.",
      "Empty pockets fully and keep phone, wallet, passport in one tray section.",
    ],
    why: "Security is the highest-friction point; being prepared cuts queue time.",
    prepare: ["Boarding pass", "Cabin baggage"],
    qualityChecks: ["No bag was left open or unzipped after inspection."],
    commonMistakes: ["Leaving phone or watch in tray."],
    timeHint: "10 to 25 minutes",
    proTip: "Keep a dedicated small pouch for metal items.",
  },
  immigration: {
    heading: "Immigration control",
    objective: "Complete passport control accurately and proceed directly to departures.",
    points: [
      "Select the correct departure queue for your passport category.",
      "Present passport and boarding pass together.",
    ],
    why: "Accuracy matters more than speed here.",
    prepare: ["Passport", "Boarding pass"],
    qualityChecks: ["Passport is stamped and returned safely."],
    commonMistakes: ["Joining an arrivals or wrong-passport lane."],
    timeHint: "8 to 20 minutes",
    proTip: "Walk 2 minutes toward your gate first, then pause for food or shopping.",
  },
  gate: {
    heading: "Move to boarding gate",
    objective: "Reach boarding area early and board smoothly.",
    points: [
      "Arrive at gate and verify flight number on gate monitor.",
      "Prepare passport and boarding pass before queue call.",
    ],
    why: "Most missed flights happen in this phase due to poor gate monitoring.",
    prepare: ["Boarding pass", "Passport"],
    qualityChecks: ["You are physically near the correct gate 40 mins early."],
    commonMistakes: ["Waiting at nearby gate with similar flight number."],
    timeHint: "Until boarding completes",
    proTip: "Set a personal alarm 10 minutes before boarding starts.",
  },
};

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))));
}

function getTargetForStep(stepId, gate) {
  const stepTargets = {
    arrive: { name: "Terminal 1 Entrance", lat: 7.1781, lon: 79.8842 },
    checkin: { name: "Check-in Counters", lat: 7.1794, lon: 79.8853 },
    security: { name: "Security Screening", lat: 7.1798, lon: 79.8857 },
    immigration: { name: "Immigration", lat: 7.1807, lon: 79.8846 },
  };

  const gateTargets = {
    A12: { name: "Gate A12", lat: 7.1802, lon: 79.8848 },
  };

  if (stepId === "arrive") return stepTargets.arrive;
  if (stepId === "checkin") return stepTargets.checkin;
  if (stepId === "security") return stepTargets.security;
  if (stepId === "immigration") return stepTargets.immigration;
  if (stepId === "gate") return gateTargets[gate] ?? gateTargets.A12;
  return null;
}

export default function GuidePage() {
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useState(() => (localStorage.getItem("aeroguide_theme") === "dark" ? "dark" : "light"));
  const [flight, setFlight] = useState(DEFAULT_FLIGHT);
  const [stepIndex, setStepIndex] = useState(0);
  const [coords, setCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState("Locating you...");
  const [micAllowed, setMicAllowed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoAdvancedTriggered, setAutoAdvancedTriggered] = useState(false); // To show a cool UI flash when it auto-updates
  const lastAnnouncementKeyRef = useRef("");

  useEffect(() => {
    localStorage.setItem("aeroguide_theme", themeMode);
    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [themeMode]);

  useEffect(() => {
    const raw = localStorage.getItem("aeroguide_active_flight");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.flightNo && parsed?.gate) setFlight(parsed);
    } catch { }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("Location unavailable in this browser");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lon: p.coords.longitude });
        setLocationStatus("Live location tracking on");
      },
      () => setLocationStatus("Allow location access for accurate guidance"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const progress = useMemo(() => Math.round((stepIndex / Math.max(1, steps.length - 1)) * 100), [stepIndex]);
  const currentStep = steps[stepIndex];
  const activeGuide = stepGuide[currentStep.id] ?? stepGuide.arrive;
  const currentTarget = useMemo(() => getTargetForStep(currentStep.id, flight.gate), [currentStep.id, flight.gate]);
  
  const metersToTarget = useMemo(
    () => (coords && currentTarget ? haversineMeters(coords, { lat: currentTarget.lat, lon: currentTarget.lon }) : null),
    [coords, currentTarget]
  );

  // ==========================================
  // NEW FEATURE: AUTO-ADVANCE GEOFENCING LOGIC
  // ==========================================
  useEffect(() => {
    // 40 meters is a good radius for indoor airport GPS to trigger an arrival
    const ARRIVAL_THRESHOLD_METERS = 40; 

    if (metersToTarget !== null && metersToTarget <= ARRIVAL_THRESHOLD_METERS) {
      if (stepIndex < steps.length - 1) {
        
        // Trigger a nice UI glow effect
        setAutoAdvancedTriggered(true);
        setTimeout(() => setAutoAdvancedTriggered(false), 3000);

        // Advance the step automatically!
        setStepIndex((prev) => prev + 1);
        
        // If they have voice enabled, it will automatically read the next step's prompt.
      }
    }
  }, [metersToTarget, stepIndex]);
  // ==========================================

  const friendlyPrompt = useMemo(() => {
    if (!currentTarget) return `Let's focus on ${currentStep.title}.`;
    
    let distanceContext = "";
    if (metersToTarget === null) {
      distanceContext = `Your next stop is ${currentTarget.name}.`;
    } else if (metersToTarget > 300) {
      distanceContext = `You're about ${metersToTarget} meters from ${currentTarget.name}. It's a bit of a walk, so keep heading in that general direction.`;
    } else if (metersToTarget > 50) {
      distanceContext = `You're getting closer! Only ${metersToTarget} meters to ${currentTarget.name}.`;
    } else {
      distanceContext = `You've practically arrived at ${currentTarget.name}. Look around!`;
    }

    return `Hi there! ${distanceContext} ${activeGuide.objective} Quick tip: ${activeGuide.proTip}`;
  }, [currentTarget, metersToTarget, currentStep.title, activeGuide]);

  const mapEmbedUrl = useMemo(() => {
    if (!currentTarget) return "";
    if (coords) {
      return `https://maps.google.com/maps?saddr=${coords.lat},${coords.lon}&daddr=${currentTarget.lat},${currentTarget.lon}&z=18&output=embed`;
    }
    return `https://maps.google.com/maps?q=${currentTarget.lat},${currentTarget.lon}&z=18&output=embed`;
  }, [coords, currentTarget]);

  useEffect(() => {
    if (!micAllowed) return;
    const key = `${flight.flightNo}-${stepIndex}-${currentTarget?.name ?? "none"}`;
    if (lastAnnouncementKeyRef.current === key) return;
    
    lastAnnouncementKeyRef.current = key;
    setIsSpeaking(true);
    publishVoiceEvent({ source: "guide", text: friendlyPrompt });
    speakText(friendlyPrompt, { rate: 0.97, pitch: 1, lang: "en-US" });
    
    setTimeout(() => setIsSpeaking(false), 5000); 
  }, [currentTarget?.name, flight.flightNo, friendlyPrompt, micAllowed, stepIndex]);

  const enableMicForVoiceGuide = async () => {
    const allowed = await requestMicrophonePermission();
    setMicAllowed(allowed);
    if (allowed) {
      publishVoiceEvent({ source: "guide", text: "Voice guidance enabled for your live journey." });
      speakText("Voice guidance enabled. I'm your friendly Aeroguide companion.", { rate: 0.98, lang: "en-US" });
      lastAnnouncementKeyRef.current = ""; 
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-aeroguide-navy text-slate-900 dark:text-white font-sans selection:bg-aeroguide-gold selection:text-aeroguide-navy relative overflow-x-hidden transition-colors duration-300">
      
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 fixed">
        <div className="absolute -top-[10%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-aeroguide-blue opacity-10 dark:opacity-20 blur-[120px]"></div>
        <div className="absolute top-[40%] -left-[10%] w-[40vw] h-[40vw] rounded-full bg-aeroguide-gold opacity-10 dark:opacity-10 blur-[100px]"></div>
      </div>

      <div className="w-full relative z-10 p-4 sm:p-8 lg:p-10 space-y-6">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-[24px] border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-6 backdrop-blur-md shadow-xl transition-colors duration-300">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Live Companion</h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Your personal step-by-step airport guide.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors shadow-sm dark:shadow-none"
              onClick={() => setThemeMode((p) => (p === "light" ? "dark" : "light"))}
            >
              <ThemeModeIcon mode={themeMode} />
            </button>
            <button 
              className="rounded-xl border border-slate-300 dark:border-white/20 bg-transparent px-6 py-3 text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </button>
            <button 
              className="rounded-xl bg-aeroguide-gold px-6 py-3 text-sm font-bold text-aeroguide-navy shadow-[0_4px_14px_rgba(253,185,19,0.3)] hover:brightness-95 dark:hover:brightness-110 transition-all"
              onClick={() => navigate(`/map?gate=${encodeURIComponent(flight.gate)}`)}
            >
              Map Route
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-[24px] border border-slate-200 dark:border-white/10 bg-aeroguide-navy dark:bg-[#050B14] p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-aeroguide-blue opacity-20 blur-[50px] rounded-full pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="text-xs font-bold uppercase tracking-widest text-aeroguide-gold">Current Journey</div>
              <div className="mt-2 text-3xl sm:text-4xl font-black text-white">
                {flight.originCode} <span className="text-slate-500 mx-2">→</span> {flight.destinationCode}
              </div>
              <div className="mt-2 text-sm text-slate-300">
                Flight {flight.flightNo} • Terminal {flight.terminal} • Gate {flight.gate}
              </div>
              
              <div className="mt-6 flex items-center gap-4">
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-aeroguide-gold rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="text-sm font-bold text-aeroguide-gold">{progress}%</div>
              </div>
            </div>
          </div>

          <div className={`rounded-[24px] border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-6 shadow-xl backdrop-blur-md flex flex-col justify-between transition-all duration-500 ${autoAdvancedTriggered ? 'shadow-[0_0_30px_rgba(253,185,19,0.4)] border-aeroguide-gold' : ''}`}>
            <div>
              <div className="flex justify-between items-start">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Tracking Status</div>
                {/* Auto-Tracking Badge */}
                <div className="flex items-center gap-1.5 rounded-full bg-aeroguide-blue/10 dark:bg-aeroguide-gold/10 px-2 py-1 border border-aeroguide-blue/20 dark:border-aeroguide-gold/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-aeroguide-blue dark:bg-aeroguide-gold animate-pulse"></div>
                  <span className="text-[10px] font-bold uppercase text-aeroguide-blue dark:text-aeroguide-gold">Auto-Tracking</span>
                </div>
              </div>
              
              <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                {coords ? `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}` : "Unknown Location"}
              </div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${coords ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`}></div>
                {locationStatus}
              </div>
            </div>

            <button
              onClick={enableMicForVoiceGuide}
              className={`mt-6 w-full rounded-xl border px-4 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                micAllowed 
                  ? 'border-green-500/30 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400' 
                  : 'border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10'
              }`}
            >
              {micAllowed ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  Voice Guide Active
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                  Enable Audio Guide
                </>
              )}
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="space-y-6">
            
            <div className="rounded-[24px] border border-blue-200 dark:border-aeroguide-gold/30 bg-gradient-to-br from-blue-50 to-white dark:from-aeroguide-gold/10 dark:to-transparent p-6 shadow-lg backdrop-blur-md relative">
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-aeroguide-blue dark:bg-aeroguide-gold text-white dark:text-aeroguide-navy shadow-md ${isSpeaking ? 'animate-pulse' : ''}`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-aeroguide-blue dark:text-aeroguide-gold uppercase tracking-wider mb-1">Friendly Assistant</h3>
                  <p className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                    {friendlyPrompt}
                  </p>
                </div>
              </div>
            </div>

            <div className={`rounded-[24px] border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-6 shadow-xl backdrop-blur-md transition-all duration-500 ${autoAdvancedTriggered ? 'scale-[1.02] shadow-[0_0_30px_rgba(253,185,19,0.3)]' : ''}`}>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                {activeGuide.heading}
              </h3>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">{activeGuide.objective}</div>
              
              <div className="space-y-4">
                {activeGuide.points.map((p: string, idx: number) => (
                  <div key={p} className="flex gap-4 items-start">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-aeroguide-gold/20 text-aeroguide-navy dark:text-aeroguide-gold text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{p}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Prepare these items</div>
                <div className="flex flex-wrap gap-2">
                  {activeGuide.prepare.map((item: string) => (
                    <span key={item} className="rounded-lg border border-slate-200 dark:border-white/20 bg-white dark:bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setStepIndex((v) => (v < steps.length - 1 ? v + 1 : v))}
              disabled={stepIndex >= steps.length - 1}
              className={`w-full rounded-xl px-6 py-4 text-sm font-bold shadow-lg transition-all ${
                stepIndex >= steps.length - 1 
                  ? 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-800 dark:bg-white/10 border dark:border-white/20 text-white hover:bg-slate-700 dark:hover:bg-white/20'
              }`}
            >
              {stepIndex >= steps.length - 1 ? "Journey Complete" : "Manual Override: Next Step"}
            </button>

          </div>

          <div className="space-y-6 flex flex-col">
            
            <div className="rounded-[24px] border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-4 shadow-xl backdrop-blur-md flex-1 min-h-[300px] flex flex-col">
              <div className="flex justify-between items-center mb-3 px-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Live Step Map</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{currentTarget?.name ?? "Not mapped yet"}</div>
                </div>
                {metersToTarget != null && (
                  <div className="rounded-full bg-aeroguide-blue/10 dark:bg-aeroguide-gold/20 px-3 py-1 text-xs font-bold text-aeroguide-blue dark:text-aeroguide-gold">
                    ~{metersToTarget}m away
                  </div>
                )}
              </div>
              
              <div className="w-full flex-1 rounded-[16px] overflow-hidden border border-slate-200 dark:border-white/10 relative bg-slate-200 dark:bg-slate-800">
                {mapEmbedUrl ? (
                  <iframe title="Live step map" src={mapEmbedUrl} width="100%" height="100%" style={{ border: 0, position: 'absolute', inset: 0 }} loading="lazy" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500">No map data available</div>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-6 shadow-xl backdrop-blur-md">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">Journey Roadmap</div>
              <div className="space-y-3">
                {steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className={`rounded-xl border p-3 flex items-center justify-between transition-all duration-500 ${
                      idx === stepIndex 
                        ? 'border-aeroguide-gold bg-aeroguide-gold/10 dark:bg-aeroguide-gold/5 scale-[1.02]' 
                        : idx < stepIndex
                        ? 'border-green-500/30 bg-green-50/50 dark:bg-green-500/5'
                        : 'border-slate-200 dark:border-white/5 bg-white/40 dark:bg-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex shrink-0 h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        idx < stepIndex ? 'bg-green-500 text-white' : idx === stepIndex ? 'bg-aeroguide-gold text-aeroguide-navy' : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                      }`}>
                        {idx < stepIndex ? '✓' : idx + 1}
                      </div>
                      <div className={`text-sm font-bold ${idx === stepIndex ? 'text-aeroguide-navy dark:text-aeroguide-gold' : 'text-slate-900 dark:text-white'}`}>
                        {step.title}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}