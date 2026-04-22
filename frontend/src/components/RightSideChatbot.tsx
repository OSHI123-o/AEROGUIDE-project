import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  VOICE_EVENT_NAME,
  requestMicrophonePermission,
  speakText,
  startSpeechRecognition,
  stopSpeaking,
  supportsSpeechRecognition,
  supportsSpeechSynthesis,
  type VoiceEventDetail,
} from "../services/voiceAssistant";
import { fetchLiveWeather } from "../services/weather";

type ChatRole = "user" | "assistant";
type MessageSource = "guide" | "chatbot";

type ChatActionId =
  | "open_map"
  | "open_flights"
  | "open_journey"
  | "open_dashboard"
  | "open_guide"
  | "weather_now"
  | "flight_snapshot";

type ChatSuggestion = {
  id: ChatActionId;
  label: string;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  source?: MessageSource;
  suggestions?: ChatSuggestion[];
};

type ActiveFlight = {
  flightNo?: string;
  gate?: string;
  terminal?: string;
  status?: string;
  destinationCity?: string;
  departureIso?: string;
  boardingTime?: string;
};

type Reply = {
  text: string;
  suggestions?: ChatSuggestion[];
};

const DEFAULT_WELCOME =
  "Hi, I am AeroGuide Copilot. I can guide your next airport step, execute quick actions, and answer flight questions from your live session.";

const quickPrompts = [
  "Flight snapshot",
  "Open map",
];

function newMessage(role: ChatRole, text: string, source?: MessageSource, suggestions?: ChatSuggestion[]): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    source,
    suggestions,
  };
}

function readActiveFlight(): ActiveFlight | null {
  try {
    const raw = localStorage.getItem("aeroguide_active_flight");
    if (!raw) return null;
    return JSON.parse(raw) as ActiveFlight;
  } catch {
    return null;
  }
}

function formatDepartureLabel(iso?: string) {
  if (!iso) return "Unknown departure time";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown departure time";
  return date.toLocaleString([], { weekday: "short", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function classifyCommand(input: string): ChatActionId | null {
  const normalized = input.toLowerCase();
  if (/(open|show|go to).*(map|gate)/.test(normalized)) return "open_map";
  if (/(open|show|go to).*(flight|flights)/.test(normalized)) return "open_flights";
  if (/(open|show|go to).*(journey|boarding|pass)/.test(normalized)) return "open_journey";
  if (/(open|show|go to).*(dashboard|home)/.test(normalized)) return "open_dashboard";
  if (/(open|start).*(guide|assistant)/.test(normalized)) return "open_guide";
  return null;
}

function buildReply(input: string, flight: ActiveFlight | null): Reply {
  const normalized = input.toLowerCase();
  const hasFlight = Boolean(flight?.flightNo || flight?.gate || flight?.status);

  if (normalized.includes("snapshot") || normalized.includes("summary") || normalized.includes("my flight")) {
    if (!hasFlight) {
      return {
        text: "No active passenger session is connected. Open Dashboard and connect your PNR to unlock personalized flight responses.",
        suggestions: [
          { id: "open_dashboard", label: "Open Dashboard" },
          { id: "open_guide", label: "Open Guide" },
        ],
      };
    }
    return {
      text:
        `Flight ${flight?.flightNo ?? "--"} to ${flight?.destinationCity ?? "destination pending"} is ${flight?.status ?? "scheduled"}. ` +
        `Terminal ${flight?.terminal ?? "--"}, Gate ${flight?.gate ?? "--"}. Departure ${formatDepartureLabel(flight?.departureIso)}.`,
      suggestions: [
        { id: "open_map", label: "Open Gate Map" },
        { id: "open_journey", label: "Open Boarding Pass" },
      ],
    };
  }

  if (normalized.includes("security")) {
    return {
      text:
        "Security fast lane checklist: keep liquids in a clear bag, electronics accessible, metal items removed before belt, and passport + boarding pass ready at queue entry.",
      suggestions: [
        { id: "open_journey", label: "Open Boarding Pass" },
        { id: "flight_snapshot", label: "Flight Snapshot" },
      ],
    };
  }

  if (normalized.includes("immigration")) {
    return {
      text:
        "For departure immigration: stand in the correct queue, present passport and boarding pass, answer briefly, and move straight toward your final gate zone.",
      suggestions: [
        { id: "open_map", label: "Open Gate Map" },
        { id: "flight_snapshot", label: "Flight Snapshot" },
      ],
    };
  }

  if (normalized.includes("checklist") || normalized.includes("prepare") || normalized.includes("ready")) {
    return {
      text:
        "Travel readiness checklist: passport, visa (if required), boarding pass, payment card, charger, power bank, medication, and one change of essentials in cabin bag.",
      suggestions: [
        { id: "weather_now", label: "Weather Now" },
        { id: "open_flights", label: "View Flights" },
      ],
    };
  }

  if (normalized.includes("weather") || normalized.includes("temperature") || normalized.includes("rain") || normalized.includes("wind")) {
    return {
      text: "I can fetch live weather for your current location now.",
      suggestions: [{ id: "weather_now", label: "Show Live Weather" }],
    };
  }

  if (normalized.includes("gate") || normalized.includes("board")) {
    if (flight?.gate) {
      return {
        text: `Your current gate is ${flight.gate}${flight.terminal ? ` in Terminal ${flight.terminal}` : ""}. Keep moving early because boarding can close before departure.`,
        suggestions: [
          { id: "open_map", label: "Navigate to Gate" },
          { id: "open_journey", label: "Open Boarding Pass" },
        ],
      };
    }
    return {
      text: "I do not have your gate context yet. Connect your passenger session from Dashboard, then ask again.",
      suggestions: [{ id: "open_dashboard", label: "Open Dashboard" }],
    };
  }

  if (normalized.includes("hello") || normalized.includes("hi") || normalized.includes("hey")) {
    return {
      text: "Hello. I am ready. You can ask for flight snapshot, gate guidance, security prep, or command me to open pages directly.",
      suggestions: [
        { id: "flight_snapshot", label: "Flight Snapshot" },
        { id: "open_map", label: "Open Gate Map" },
      ],
    };
  }

  if (normalized.includes("thank")) {
    return {
      text: "Anytime. Ask me your next step and I will keep it concise.",
      suggestions: [
        { id: "open_guide", label: "Open Guide" },
        { id: "open_dashboard", label: "Open Dashboard" },
      ],
    };
  }

  return {
    text:
      "I can do route commands and travel guidance. Try: 'Open map to my gate', 'Give me my flight snapshot', or 'Show live weather now'.",
    suggestions: [
      { id: "open_map", label: "Open Map" },
      { id: "flight_snapshot", label: "Flight Snapshot" },
      { id: "weather_now", label: "Weather Now" },
    ],
  };
}

export default function RightSideChatbot() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [micAllowed, setMicAllowed] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showTools, setShowTools] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([newMessage("assistant", DEFAULT_WELCOME, "chatbot")]);
  const recognitionRef = useRef<ReturnType<typeof startSpeechRecognition> | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    const onVoiceEvent = (event: Event) => {
      const custom = event as CustomEvent<VoiceEventDetail>;
      const detail = custom.detail;
      if (!detail?.text) return;
      setMessages((prev) => [...prev, newMessage("assistant", detail.text, detail.source)]);
      if (voiceEnabled && micAllowed) {
        speakText(detail.text, { rate: 0.97, pitch: 1, lang: "en-US" });
      }
    };
    window.addEventListener(VOICE_EVENT_NAME, onVoiceEvent);
    return () => window.removeEventListener(VOICE_EVENT_NAME, onVoiceEvent);
  }, [micAllowed, voiceEnabled]);

  useEffect(() => {
    panelRef.current?.scrollTo({ top: panelRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, isTyping]);

  const canUseSpeechRecognition = useMemo(() => supportsSpeechRecognition(), []);
  const canUseSpeechSynthesis = useMemo(() => supportsSpeechSynthesis(), []);

  const performAction = async (actionId: ChatActionId) => {
    const flight = readActiveFlight();
    if (actionId === "open_map") {
      navigate(`/map?gate=${encodeURIComponent(flight?.gate ?? "A12")}`);
      setMessages((prev) => [...prev, newMessage("assistant", `Opening map for Gate ${flight?.gate ?? "A12"}.`, "chatbot")]);
      return;
    }
    if (actionId === "open_flights") {
      navigate("/flights");
      setMessages((prev) => [...prev, newMessage("assistant", "Opening live flights page.", "chatbot")]);
      return;
    }
    if (actionId === "open_journey") {
      navigate("/journey");
      setMessages((prev) => [...prev, newMessage("assistant", "Opening your boarding pass and journey page.", "chatbot")]);
      return;
    }
    if (actionId === "open_dashboard") {
      navigate("/dashboard");
      setMessages((prev) => [...prev, newMessage("assistant", "Opening dashboard.", "chatbot")]);
      return;
    }
    if (actionId === "open_guide") {
      navigate("/guide");
      setMessages((prev) => [...prev, newMessage("assistant", "Opening the live guide assistant.", "chatbot")]);
      return;
    }
    if (actionId === "flight_snapshot") {
      const reply = buildReply("flight snapshot", flight);
      setMessages((prev) => [...prev, newMessage("assistant", reply.text, "chatbot", reply.suggestions)]);
      return;
    }
    if (actionId === "weather_now") {
      if (!navigator.geolocation) {
        setMessages((prev) => [...prev, newMessage("assistant", "Location service is unavailable on this browser.", "chatbot")]);
        return;
      }
      setIsTyping(true);
      try {
        const coords = await new Promise<{ lat: number; lon: number }>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
            () => reject(new Error("location_denied")),
            { timeout: 8000 }
          );
        });
        const weather = await fetchLiveWeather(coords);
        setMessages((prev) => [
          ...prev,
          newMessage(
            "assistant",
            `Current weather: ${weather.temperature} deg C, wind ${weather.wind} km/h (${weather.source === "openweather" ? "OpenWeather" : "Open-Meteo"}).`,
            "chatbot",
            [{ id: "open_dashboard", label: "Open Dashboard" }]
          ),
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          newMessage("assistant", "I could not read location right now. You can still check weather on the dashboard.", "chatbot"),
        ]);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const sendMessage = (text: string) => {
    const value = text.trim();
    if (!value) return;
    setMessages((prev) => [...prev, newMessage("user", value, "chatbot")]);
    setInput("");

    const command = classifyCommand(value);
    if (command) {
      void performAction(command);
      return;
    }

    setIsTyping(true);
    window.setTimeout(() => {
      const reply = buildReply(value, readActiveFlight());
      setMessages((prev) => [...prev, newMessage("assistant", reply.text, "chatbot", reply.suggestions)]);
      setIsTyping(false);

      if (voiceEnabled && micAllowed) {
        speakText(reply.text, { rate: 0.98, pitch: 1, lang: "en-US" });
      }
    }, 300 + Math.random() * 450);
  };

  const enableMic = async () => {
    const ok = await requestMicrophonePermission();
    setMicAllowed(ok);
    const text = ok
      ? "Microphone access enabled. Voice commands are active."
      : "Microphone access was not granted. Allow permission to use voice mode.";
    setMessages((prev) => [...prev, newMessage("assistant", text, "chatbot")]);
    if (ok && voiceEnabled) speakText("Microphone is now enabled.", { rate: 0.98 });
  };

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setListening(false);
      return;
    }
    if (!micAllowed) {
      setMessages((prev) => [...prev, newMessage("assistant", "Enable microphone access first to use voice input.", "chatbot")]);
      return;
    }
    if (!canUseSpeechRecognition) {
      setMessages((prev) => [...prev, newMessage("assistant", "This browser does not support speech recognition.", "chatbot")]);
      return;
    }

    setListening(true);
    recognitionRef.current = startSpeechRecognition(
      (transcript) => {
        setListening(false);
        recognitionRef.current = null;
        sendMessage(transcript);
      },
      (message) => {
        setListening(false);
        recognitionRef.current = null;
        setMessages((prev) => [...prev, newMessage("assistant", message, "chatbot")]);
      }
    );
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle AI chatbot"
        title="Toggle AI chatbot"
        className={`ag-chat-fab ${open ? "open" : ""}`}
      >
        <svg viewBox="0 0 24 24" className="ag-chat-fab-icon" fill="none" aria-hidden="true">
          <rect x="3" y="4" width="18" height="14" rx="5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M7 21L11 18H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="11" r="1.2" fill="currentColor" />
          <circle cx="12" cy="11" r="1.2" fill="currentColor" />
          <circle cx="15" cy="11" r="1.2" fill="currentColor" />
        </svg>
        <span className="ag-chat-fab-label">{open ? "Close" : "AI"}</span>
      </button>

      <div className={`ag-chat-panel ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="ag-chat-header">
          <div className="flex justify-between items-start w-full">
            <div>
              <div className="ag-chat-title">AeroGuide Copilot</div>
              <div className="ag-chat-subtitle">Travel assistant</div>
            </div>
            <button
              onClick={() => setMessages([newMessage("assistant", DEFAULT_WELCOME, "chatbot")])}
              className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        <div ref={panelRef} className="ag-chat-messages">
          {messages.map((m) => (
            <div key={m.id} className={`ag-chat-bubble ${m.role === "user" ? "user" : "assistant"}`}>
              <div>{m.text}</div>
              {m.source === "guide" ? <div className="ag-chat-meta">Live Guide</div> : null}
              {m.suggestions && m.suggestions.length > 0 ? (
                <div className="ag-chat-suggestion-row">
                  {m.suggestions.slice(0, 2).map((s) => (
                    <button key={`${m.id}-${s.id}`} className="ag-chat-inline-action" onClick={() => void performAction(s.id)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          {isTyping ? (
            <div className="ag-chat-bubble assistant">
              <div className="flex items-center gap-1.5 h-4 px-1 opacity-70">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse delay-75" />
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse delay-150" />
              </div>
            </div>
          ) : null}
        </div>

        <div className="ag-chat-controls">
          <div className="ag-chat-prompt-row">
            {quickPrompts.map((prompt) => (
              <button key={prompt} className="ag-chat-chip" onClick={() => sendMessage(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div className="ag-chat-action-row">
            <button className="ag-chat-action" onClick={() => setShowTools((v) => !v)}>
              {showTools ? "Hide Tools" : "Show Tools"}
            </button>
          </div>
          {showTools ? (
            <div className="ag-chat-action-row">
              <button className={`ag-chat-action ${micAllowed ? "ok" : ""}`} onClick={enableMic}>
                {micAllowed ? "Mic Ready" : "Enable Mic"}
              </button>
              <button className={`ag-chat-action ${listening ? "active" : ""}`} onClick={toggleListening} disabled={!canUseSpeechRecognition}>
                {listening ? "Stop" : "Voice Input"}
              </button>
              <button className="ag-chat-action" onClick={() => setVoiceEnabled((v) => !v)} disabled={!canUseSpeechSynthesis}>
                {voiceEnabled ? "Mute" : "Unmute"}
              </button>
              <button className="ag-chat-action" onClick={() => stopSpeaking()} disabled={!canUseSpeechSynthesis}>
                Stop Speech
              </button>
            </div>
          ) : null}

          <form
            className="ag-chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask or command: open map, show weather, flight snapshot..."
              className="ag-chat-input"
            />
            <button type="submit" className="ag-chat-send">
              Send
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
