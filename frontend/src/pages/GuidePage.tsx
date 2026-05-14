import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeModeIcon from "../components/ThemeModeIcon";
import { publishVoiceEvent, requestMicrophonePermission, speakText, stopSpeaking } from "../services/voiceAssistant";

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

type DetourTarget = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  icon: keyof typeof SVGIcons;
};

const detourLocations: DetourTarget[] = [
  { id: "coffee", name: "The Coffee Bean & Tea Leaf", lat: 7.1800, lon: 79.8850, icon: "Coffee" },
  { id: "restroom", name: "Restroom (Terminal 1)", lat: 7.1795, lon: 79.8851, icon: "Bag" },
  { id: "dutyfree", name: "Flemingo Duty Free", lat: 7.1804, lon: 79.8845, icon: "Shopping" },
  { id: "atm", name: "Bank of Ceylon ATM", lat: 7.1785, lon: 79.8843, icon: "Atm" }
];

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

const SVGIcons = {
  Greeting: (
    <svg className="w-5 h-5 text-aeroguide-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Location: (
    <svg className="w-5 h-5 text-aeroguide-blue dark:text-aeroguide-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Atm: (
    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Bag: (
    <svg className="w-5 h-5 text-[#308cd6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  Shopping: (
    <svg className="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  Passport: (
    <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
    </svg>
  ),
  Coffee: (
    <svg className="w-5 h-5 text-[#589efc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
  Star: (
    <svg className="w-5 h-5 text-[#589efc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  Objective: (
    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Tip: (
    <svg className="w-5 h-5 text-[#6cb7e9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  Target: (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
};

function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))));
}

function getTargetForStep(stepId: string, gate: string): { name: string; lat: number; lon: number } | null {
  const stepTargets = {
    arrive: { name: "Terminal 1 Entrance", lat: 7.1781, lon: 79.8842 },
    checkin: { name: "Check-in Counters", lat: 7.1794, lon: 79.8853 },
    security: { name: "Security Screening", lat: 7.1798, lon: 79.8857 },
    immigration: { name: "Immigration", lat: 7.1807, lon: 79.8846 },
  };

  const gateTargets: Record<string, { name: string; lat: number; lon: number }> = {
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
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => (localStorage.getItem("aeroguide_theme") === "dark" ? "dark" : "light"));
  const [flight, setFlight] = useState(DEFAULT_FLIGHT);
  const [stepIndex, setStepIndex] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState("Locating you...");
  const [micAllowed, setMicAllowed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoAdvancedTriggered, setAutoAdvancedTriggered] = useState(false); // To show a cool UI flash when it auto-updates
  const [journeyCompleteNotification, setJourneyCompleteNotification] = useState(false);
  const [activeDetour, setActiveDetour] = useState<DetourTarget | null>(null);
  const [arrivedAtDetour, setArrivedAtDetour] = useState(false);
  const lastAnnouncementKeyRef = useRef("");
  const isFirstAnnouncementRef = useRef(true);

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
  const activeGuide = stepGuide[currentStep.id as keyof typeof stepGuide] ?? stepGuide.arrive;
  const currentTarget = useMemo(() => {
    if (activeDetour) return { name: activeDetour.name, lat: activeDetour.lat, lon: activeDetour.lon };
    return getTargetForStep(currentStep.id, flight.gate);
  }, [activeDetour, currentStep.id, flight.gate]);
  
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
      if (activeDetour) {
        if (!arrivedAtDetour) {
          setArrivedAtDetour(true);
          setAutoAdvancedTriggered(true);
          setTimeout(() => setAutoAdvancedTriggered(false), 3000);
        }
      } else {
        if (stepIndex < steps.length - 1) {
          
          // Trigger a nice UI glow effect
          setAutoAdvancedTriggered(true);
          setTimeout(() => setAutoAdvancedTriggered(false), 3000);

          // Advance the step automatically!
          setStepIndex((prev) => prev + 1);
          
          // If they have voice enabled, it will automatically read the next step's prompt.
        } else if (stepIndex === steps.length - 1) {
          setJourneyCompleteNotification(true);
        }
      }
    }
  }, [metersToTarget, stepIndex, activeDetour, arrivedAtDetour]);
  // ==========================================

  const friendlyData = useMemo(() => {
    if (activeDetour) {
      const distanceContext = metersToTarget === null 
        ? `I am routing you to ${activeDetour.name}.`
        : arrivedAtDetour 
          ? `You have arrived at ${activeDetour.name}! Take your time, and tap 'Resume Journey' when you are ready to continue.`
          : `You are ${metersToTarget} meters away from ${activeDetour.name}. Follow the map.`;

      return {
        spokenText: distanceContext,
        points: [
          { icon: SVGIcons[activeDetour.icon], text: `Detour active: ${activeDetour.name}` },
          { icon: SVGIcons.Location, text: distanceContext }
        ]
      };
    }

    if (!currentTarget) {
      const text = `Let's focus on ${currentStep.title}.`;
      return {
        spokenText: text,
        points: [{ icon: SVGIcons.Target, text }]
      };
    }
    
    let distanceContext = "";
    let locationPoint = "";
    
    if (metersToTarget === null) {
      distanceContext = `Your next stop is ${currentTarget.name}.`;
      locationPoint = `I need your live location to track your exact distance to ${currentTarget.name}.`;
    } else if (metersToTarget > 300) {
      distanceContext = `You're about ${metersToTarget} meters from ${currentTarget.name}. It's a bit of a walk, but I'm tracking your live location!`;
      locationPoint = `Live Tracking: You are currently ${metersToTarget} meters away. Keep walking!`;
    } else if (metersToTarget > 50) {
      distanceContext = `You're getting closer! Only ${metersToTarget} meters to ${currentTarget.name}. I'm tracking your live location.`;
      locationPoint = `Live Tracking: You are ${metersToTarget} meters away from your destination.`;
    } else {
      distanceContext = `You've practically arrived at ${currentTarget.name}. Look around! My live tracking shows you are right there.`;
      locationPoint = `Live Tracking: You have arrived at ${currentTarget.name}!`;
    }

    let greeting = "Hi there! I am your super friendly companion for today.";
    let stepSpecificTip = "";
    let stepSpecificIcon = SVGIcons.Star;

    if (currentStep.id === "arrive") {
      greeting = "Welcome to the airport! I'm your super friendly companion ready to start this journey with you.";
      stepSpecificTip = "Before heading inside, note that there are currency exchange counters and a Bank of Ceylon ATM right at the BIA main entrance.";
      stepSpecificIcon = SVGIcons.Atm;
    } else if (currentStep.id === "checkin") {
      greeting = "Great job getting here! Now let's handle your check-in together.";
      stepSpecificTip = "If you need your bags wrapped securely, the wrapping station is right across the check-in counters in the lobby.";
      stepSpecificIcon = SVGIcons.Bag;
    } else if (currentStep.id === "security") {
      greeting = "You're doing amazing! Let's breeze through security like a pro.";
      stepSpecificTip = "After clearing security, treat yourself to the Flemingo Duty Free for some great deals at Bandaranaike International Airport.";
      stepSpecificIcon = SVGIcons.Shopping;
    } else if (currentStep.id === "immigration") {
      greeting = "Almost there! I'm right beside you for this quick immigration stop.";
      stepSpecificTip = "BIA immigration queues can get busy. Don't forget to visit Spa Ceylon nearby if you have time to relax afterward!";
      stepSpecificIcon = SVGIcons.Passport;
    } else if (currentStep.id === "gate") {
      greeting = "The final stretch! Let's find your gate so you can relax before the flight.";
      stepSpecificTip = "Grab a quick coffee at The Coffee Bean & Tea Leaf in the BIA transit area before boarding your flight.";
      stepSpecificIcon = SVGIcons.Coffee;
    }

    const points = [
      { icon: SVGIcons.Greeting, text: greeting },
      { icon: SVGIcons.Location, text: locationPoint },
    ];

    if (stepSpecificTip) {
      points.push({ icon: stepSpecificIcon, text: stepSpecificTip });
    }

    points.push({ icon: SVGIcons.Objective, text: activeGuide.objective });
    points.push({ icon: SVGIcons.Tip, text: `Quick tip: ${activeGuide.proTip}` });

    return {
      spokenText: `${greeting} ${distanceContext} ${stepSpecificTip ? stepSpecificTip + " " : ""}${activeGuide.objective} Quick tip: ${activeGuide.proTip}`,
      points: points
    };
  }, [currentTarget, metersToTarget, currentStep.title, currentStep.id, activeGuide, activeDetour, arrivedAtDetour]);

  const mapEmbedUrl = useMemo(() => {
    // Center the embedded map on the user's live location if available
    // so they can actively see themselves being tracked.
    if (coords) {
      return `https://maps.google.com/maps?q=${coords.lat},${coords.lon}&z=18&output=embed`;
    }
    // Fallback to the target destination if location is not yet available
    if (currentTarget) {
      return `https://maps.google.com/maps?q=${currentTarget.lat},${currentTarget.lon}&z=18&output=embed`;
    }
    return "";
  }, [coords, currentTarget]);

  const currentLang = localStorage.getItem("aeroguide_global_language") || "en";
  const ttsLangMap: Record<string, string> = {
    "en": "en-US",
    "si": "si-LK",
    "zh-CN": "zh-CN",
    "es": "es-ES",
    "fr": "fr-FR",
    "ar": "ar-SA",
    "hi": "hi-IN",
  };
  const speakLang = ttsLangMap[currentLang] || "en-US";

  const translateForVoice = async (text: string, targetLang: string) => {
    if (targetLang === "en") return text;
    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ q: text }).toString(),
      });
      const data = await res.json();
      return data[0].map((item: any[]) => item[0]).join("");
    } catch (e) {
      console.error("Translation error:", e);
      return text;
    }
  };

  useEffect(() => {
    if (!micAllowed) return;
    const key = `${flight.flightNo}-${stepIndex}-${currentTarget?.name ?? "none"}-${arrivedAtDetour ? 'arrived' : 'moving'}`;
    if (lastAnnouncementKeyRef.current === key) return;
    
    lastAnnouncementKeyRef.current = key;
    setIsSpeaking(true);
    
    let comprehensiveText = "";
    if (activeDetour) {
      comprehensiveText = friendlyData.spokenText;
    } else {
      comprehensiveText = [
        ...friendlyData.points.map(pt => pt.text),
        `Here are your full guide instructions for ${activeGuide.heading}:`,
        ...activeGuide.points,
        `Please prepare these items: ${activeGuide.prepare.join(", ")}.`,
        `Why this is important: ${activeGuide.why}`,
        `Quality check: ${activeGuide.qualityChecks.join(" ")}`,
        `Common mistake to avoid: ${activeGuide.commonMistakes.join(" ")}`,
        `Estimated time: ${activeGuide.timeHint}.`
      ].join(". ");
    }
    
    translateForVoice(comprehensiveText, currentLang).then((translatedText) => {
      publishVoiceEvent({ source: "guide", text: translatedText });
      speakText(translatedText, { rate: 0.97, pitch: 1, lang: speakLang, queue: isFirstAnnouncementRef.current });
      isFirstAnnouncementRef.current = false;
      setTimeout(() => setIsSpeaking(false), Math.max(5000, translatedText.length * 50)); 
    });
  }, [currentTarget?.name, flight.flightNo, friendlyData.spokenText, friendlyData.points, micAllowed, stepIndex, speakLang, currentLang, activeDetour, arrivedAtDetour, activeGuide]);

  const enableMicForVoiceGuide = async () => {
    const allowed = await requestMicrophonePermission();
    setMicAllowed(allowed);
    if (allowed) {
      isFirstAnnouncementRef.current = true;
      const introEnglish = "Voice guidance enabled. I'm your friendly Aeroguide companion.";
      const eventEnglish = "Voice guidance enabled for your live journey.";
      
      const translatedIntro = await translateForVoice(introEnglish, currentLang);
      const translatedEvent = await translateForVoice(eventEnglish, currentLang);
      
      publishVoiceEvent({ source: "guide", text: translatedEvent });
      speakText(translatedIntro, { rate: 0.98, lang: speakLang });
      lastAnnouncementKeyRef.current = ""; 
    }
  };

  const disableVoiceGuide = async () => {
    setMicAllowed(false);
    stopSpeaking();
    const disableEnglish = "Voice guidance disabled.";
    const translatedDisable = await translateForVoice(disableEnglish, currentLang);
    publishVoiceEvent({ source: "guide", text: translatedDisable });
  };

  useEffect(() => {
    if (journeyCompleteNotification && micAllowed) {
      disableVoiceGuide();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyCompleteNotification]);

  const toggleVoiceGuide = () => {
    if (micAllowed) {
      disableVoiceGuide();
    } else {
      enableMicForVoiceGuide();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#2C6CBC] via-[#71C3F7] to-[#F5F5F5] dark:from-[#0B1021] dark:via-[#1B2845] dark:to-[#5A77A2] text-slate-900 dark:text-slate-100 font-sans selection:bg-aeroguide-gold selection:text-aeroguide-navy relative overflow-x-hidden transition-colors duration-300">
      
      <span id="voice-intro-text" className="sr-only">Voice guidance enabled. I'm your friendly Aeroguide companion.</span>
      <span id="voice-disable-text" className="sr-only">Voice guidance disabled.</span>
      <span id="voice-enabled-event-text" className="sr-only">Voice guidance enabled for your live journey.</span>
      
      {/* Journey Complete Notification Modal */}
      {journeyCompleteNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-aeroguide-navy border border-slate-200 dark:border-aeroguide-gold/30 rounded-3xl p-8 max-w-md w-full shadow-2xl transform animate-in zoom-in-95 duration-300 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-aeroguide-gold opacity-20 blur-[40px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-aeroguide-blue opacity-20 blur-[40px] rounded-full pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                You are complete your all steps!
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-8">
                Congratulations! You have reached your boarding gate. Have a safe and wonderful flight!
              </p>
              
              <button
                onClick={() => setJourneyCompleteNotification(false)}
                className={`w-full rounded-xl px-6 py-4 text-sm font-bold shadow-[0_4px_14px_rgba(253,185,19,0.3)] transition-all ${themeMode === 'dark' ? 'bg-gradient-to-r from-[#1B2845] to-[#5A77A2] text-white hover:brightness-110' : 'bg-gradient-to-r from-[#2C6CBC] via-[#71C3F7] to-[#F5F5F5] text-slate-900 hover:brightness-95'}`}
              >
                Close Notification
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 fixed">
        <div className="absolute -top-[10%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-aeroguide-blue opacity-10 dark:opacity-20 blur-[120px]"></div>
        <div className="absolute top-[40%] -left-[10%] w-[40vw] h-[40vw] rounded-full bg-aeroguide-gold opacity-10 dark:opacity-10 blur-[100px]"></div>
      </div>

      <div className="w-full relative z-10 p-4 sm:p-8 lg:p-10 space-y-6">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-[24px] border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 dark:backdrop-blur-xl p-6 shadow-sm transition-colors duration-300">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Live Companion</h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Your personal step-by-step airport guide.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
              onClick={() => setThemeMode((p) => (p === "light" ? "dark" : "light"))}
            >
              <ThemeModeIcon mode={themeMode} />
            </button>
            <button 
              className="rounded-xl border border-slate-300 dark:border-[#25407a] bg-transparent px-6 py-3 text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-[#132242] transition-colors"
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </button>
            <button 
              className={`rounded-xl px-6 py-3 text-sm font-bold shadow-sm transition-all ${themeMode === 'dark' ? 'bg-gradient-to-r from-[#1B2845] to-[#5A77A2] text-white hover:brightness-110' : 'bg-gradient-to-r from-[#2C6CBC] via-[#71C3F7] to-[#F5F5F5] text-slate-900 hover:brightness-95'}`}
              onClick={() => {
                if (activeDetour) {
                  navigate(`/map?lat=${activeDetour.lat}&lon=${activeDetour.lon}&name=${encodeURIComponent(activeDetour.name)}`);
                } else {
                  navigate(`/map?gate=${encodeURIComponent(flight.gate)}`);
                }
              }}
            >
              Map Route
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-[24px] border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 dark:backdrop-blur-xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-aeroguide-blue opacity-20 blur-[50px] rounded-full pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="text-xs font-bold uppercase tracking-widest text-aeroguide-gold">Current Journey</div>
              <div className="mt-2 text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                {flight.originCode} <span className="text-slate-500 mx-2">→</span> {flight.destinationCode}
              </div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Flight {flight.flightNo} • Terminal {flight.terminal} • Gate {flight.gate}
              </div>
              
              <div className="mt-6 flex items-center gap-4">
                <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div className="h-full bg-aeroguide-gold rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="text-sm font-bold text-aeroguide-gold">{progress}%</div>
              </div>
            </div>
          </div>

          <div className={`rounded-[24px] border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 dark:backdrop-blur-xl p-6 shadow-sm flex flex-col justify-between transition-all duration-500 ${autoAdvancedTriggered ? 'shadow-[0_0_30px_rgba(253,185,19,0.4)] border-aeroguide-gold' : ''}`}>
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
                <div className={`w-2 h-2 rounded-full ${coords ? 'bg-green-500 animate-pulse' : 'bg-[#589efc]'}`}></div>
                {locationStatus}
              </div>
            </div>

            <button
              onClick={toggleVoiceGuide}
              className={`mt-6 w-full rounded-xl border px-4 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                micAllowed 
                  ? 'border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20' 
                  : 'border-slate-300 dark:border-[#25407a] bg-transparent text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-[#132242]'
              }`}
            >
              {micAllowed ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                  Stop Voice Guidance
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

        {/* Horizontal Journey Roadmap */}
        <div className="w-full flex rounded-[20px] overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 dark:backdrop-blur-xl shadow-sm mb-6">
          {steps.map((step, idx) => {
            const isCompleted = idx < stepIndex;
            const isCurrent = idx === stepIndex;
            
            let bgClass = "bg-slate-50 dark:bg-black/20 text-slate-500 dark:text-slate-400";
            if (isCompleted) bgClass = "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300";
            if (isCurrent) bgClass = "bg-blue-600 text-white shadow-lg z-10";
            
            const clipPath = idx === 0 
              ? "polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)"
              : idx === steps.length - 1
              ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 20px 50%)"
              : "polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%, 20px 50%)";
              
            const margin = idx === 0 ? "0" : "-20px";

            return (
              <div 
                key={step.id} 
                className={`flex-1 relative flex flex-col items-center justify-center py-2 px-2 sm:px-6 transition-all duration-500 ${bgClass}`}
                style={{ clipPath, marginLeft: margin, zIndex: steps.length - idx + (isCurrent ? 10 : 0) }}
              >
                <div className="text-[10px] sm:text-[13px] font-black uppercase tracking-wider">
                  Step {idx + 1}
                </div>
                <div className="text-[9px] sm:text-[11px] font-medium text-center">
                  {isCompleted ? "Completed" : isCurrent ? "In progress" : "Awaiting"}
                </div>
              </div>
            );
          })}
        </div>

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
                  <h3 className="text-sm font-bold text-aeroguide-blue dark:text-aeroguide-gold uppercase tracking-wider mb-2">Friendly Assistant</h3>
                  <div className="space-y-3 mt-3">
                    {friendlyData.points.map((pt, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="flex-shrink-0 mt-0.5">{pt.icon}</span>
                        <span className="text-sm text-slate-700 dark:text-slate-200 font-medium leading-relaxed friendly-point-text">
                          {pt.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className={`rounded-[24px] border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-6 shadow-xl backdrop-blur-md transition-all duration-500 ${autoAdvancedTriggered ? 'scale-[1.02] shadow-[0_0_30px_rgba(253,185,19,0.3)]' : ''}`}>
              {activeDetour ? (
                <div className="py-4 text-center">
                  <div className="w-16 h-16 bg-aeroguide-gold/20 text-aeroguide-gold rounded-full flex items-center justify-center mx-auto mb-4">
                    {SVGIcons[activeDetour.icon]}
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                    Pit Stop: {activeDetour.name}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-8">
                    Your main journey is paused. Follow the map to your selected pit stop.
                  </p>
                  
                  <button
                    onClick={() => {
                      setActiveDetour(null);
                      setArrivedAtDetour(false);
                      setAutoAdvancedTriggered(true);
                      setTimeout(() => setAutoAdvancedTriggered(false), 3000);
                      
                      if (micAllowed) {
                        const enText = `Resuming your journey to ${activeGuide.heading}.`;
                        translateForVoice(enText, currentLang).then(translated => {
                          publishVoiceEvent({ source: "guide", text: translated });
                          speakText(translated, { rate: 0.97, lang: speakLang });
                        });
                      }
                    }}
                    className="w-full rounded-xl px-6 py-4 text-sm font-bold shadow-lg transition-all bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white"
                  >
                    Resume Main Journey
                  </button>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>

            {!activeDetour && (
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => setStepIndex((v) => Math.max(0, v - 1))}
                  disabled={stepIndex === 0}
                  className={`w-1/3 rounded-xl px-4 py-4 text-sm font-bold shadow-lg transition-all ${
                    stepIndex === 0 
                      ? 'bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed border dark:border-white/10'
                      : 'bg-white dark:bg-white/10 border border-slate-300 dark:border-white/20 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/20'
                  }`}
                >
                  Previous
                </button>

                <button
                  onClick={() => {
                    if (stepIndex < steps.length - 1) setStepIndex((v) => v + 1);
                    else setJourneyCompleteNotification(true);
                  }}
                  className={`flex-1 rounded-xl px-6 py-4 text-sm font-bold shadow-lg transition-all ${
                    stepIndex >= steps.length - 1 
                      ? 'bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600'
                      : 'bg-slate-800 dark:bg-white/10 border dark:border-white/20 text-white hover:bg-slate-700 dark:hover:bg-white/20'
                  }`}
                >
                  {stepIndex >= steps.length - 1 ? "Complete Journey" : "Manual Override: Next Step"}
                </button>
              </div>
            )}

          </div>

          <div className="space-y-6 flex flex-col">
            
            {/* Quick Pit Stops Menu */}
            <div className="rounded-[24px] border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-4 shadow-sm backdrop-blur-md">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 px-2">Quick Pit Stops</div>
              <div className="grid grid-cols-4 gap-2">
                {detourLocations.map(detour => (
                  <button
                    key={detour.id}
                    onClick={() => {
                      setActiveDetour(detour);
                      setArrivedAtDetour(false);
                      setAutoAdvancedTriggered(true);
                      setTimeout(() => setAutoAdvancedTriggered(false), 3000);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                      activeDetour?.id === detour.id 
                        ? 'border-aeroguide-gold bg-aeroguide-gold/10 text-aeroguide-gold shadow-sm' 
                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center mb-1">
                      {SVGIcons[detour.icon]}
                    </div>
                    <span className="text-[10px] font-bold text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis w-full">
                      {detour.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className={`rounded-[24px] border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-4 shadow-xl backdrop-blur-md flex-1 min-h-[500px] h-full flex flex-col transition-all duration-500 ${activeDetour ? 'border-orange-400/50 shadow-[0_0_20px_rgba(251,146,60,0.15)]' : ''}`}>
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
              
              <div className="w-full flex-1 rounded-[16px] overflow-hidden border border-slate-200 dark:border-white/10 relative bg-slate-200 dark:bg-black/20">
                {mapEmbedUrl ? (
                  <iframe title="Live step map" src={mapEmbedUrl} width="100%" height="100%" style={{ border: 0, position: 'absolute', inset: 0 }} loading="lazy" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500">No map data available</div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}