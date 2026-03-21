import { useEffect, useMemo, useRef, useState } from "react";
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

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  source?: "guide" | "chatbot";
};

const quickPrompts = [
  "How early should I arrive for an international flight?",
  "What should I prepare for security screening?",
  "Give me a short checklist before boarding.",
];

function buildReply(input: string) {
  const normalized = input.toLowerCase();
  if (normalized.includes("security")) {
    return "For security screening, keep laptop and liquids ready, remove restricted items, and keep your boarding pass in hand.";
  }
  if (normalized.includes("immigration")) {
    return "At immigration, join the departure queue, present passport and boarding pass, then move directly toward your gate.";
  }
  if (normalized.includes("arrive") || normalized.includes("early")) {
    return "For international travel, target arriving about 3 hours before departure. This gives buffer for check-in, security, and immigration queues.";
  }
  if (normalized.includes("checklist") || normalized.includes("prepare")) {
    return "Quick checklist: passport, boarding pass, PNR or ticket, visa if needed, phone charger, and essential medication in cabin baggage.";
  }
  if (normalized.includes("gate")) {
    return "Reach your gate early and keep flight updates visible. Boarding may close 20 to 30 minutes before departure.";
  }
  return "I can help with check-in, security, immigration, gate readiness, and step-by-step airport guidance. Ask me what you need next.";
}

function newMessage(role: ChatRole, text: string, source?: "guide" | "chatbot"): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    source,
  };
}

export default function RightSideChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [micAllowed, setMicAllowed] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    newMessage("assistant", "Hi, I am AeroGuide Assistant. I can support airport steps, checklists, and live guide prompts.", "chatbot"),
  ]);
  const recognitionRef = useRef<ReturnType<typeof startSpeechRecognition> | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
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
    if (!panelRef.current) return;
    panelRef.current.scrollTop = panelRef.current.scrollHeight;
  }, [messages, open]);

  const canUseSpeechRecognition = useMemo(() => supportsSpeechRecognition(), []);
  const canUseSpeechSynthesis = useMemo(() => supportsSpeechSynthesis(), []);

  const sendMessage = (text: string) => {
    const value = text.trim();
    if (!value) return;
    setMessages((prev) => [...prev, newMessage("user", value, "chatbot")]);
    const reply = buildReply(value);
    setMessages((prev) => [...prev, newMessage("assistant", reply, "chatbot")]);
    setInput("");
    if (voiceEnabled && micAllowed) {
      speakText(reply, { rate: 0.98, pitch: 1, lang: "en-US" });
    }
  };

  const enableMic = async () => {
    const ok = await requestMicrophonePermission();
    setMicAllowed(ok);
    setMessages((prev) => [
      ...prev,
      newMessage(
        "assistant",
        ok
          ? "Microphone access enabled. Voice input and spoken guide announcements are active."
          : "Microphone access was not granted. Please allow microphone permission to use voice mode.",
        "chatbot"
      ),
    ]);
    if (ok && voiceEnabled) {
      speakText("Microphone access enabled. Voice mode is ready.", { rate: 0.98 });
    }
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
        <span className="ag-chat-fab-dot" />
        <span className="ag-chat-fab-label">{open ? "Close" : "AI"}</span>
      </button>

      <div className={`ag-chat-panel ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="ag-chat-header">
          <div>
            <div className="ag-chat-title">AeroGuide AI</div>
            <div className="ag-chat-subtitle">Voice-enabled travel assistant</div>
          </div>
          <div className="ag-chat-status">
            <span className={`ag-chat-pill ${micAllowed ? "ok" : ""}`}>{micAllowed ? "Mic Ready" : "Mic Off"}</span>
            <span className={`ag-chat-pill ${voiceEnabled ? "ok" : ""}`}>{voiceEnabled ? "Voice On" : "Voice Off"}</span>
          </div>
        </div>

        <div ref={panelRef} className="ag-chat-messages">
          {messages.map((m) => (
            <div key={m.id} className={`ag-chat-bubble ${m.role === "user" ? "user" : "assistant"}`}>
              <div>{m.text}</div>
              {m.source === "guide" ? <div className="ag-chat-meta">Live Guide</div> : null}
            </div>
          ))}
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
            <button className={`ag-chat-action ${micAllowed ? "ok" : ""}`} onClick={enableMic}>
              {micAllowed ? "Microphone Allowed" : "Enable Microphone"}
            </button>
            <button
              className={`ag-chat-action ${listening ? "active" : ""}`}
              onClick={toggleListening}
              disabled={!canUseSpeechRecognition}
            >
              {listening ? "Stop Listening" : "Voice Input"}
            </button>
            <button className="ag-chat-action" onClick={() => setVoiceEnabled((v) => !v)} disabled={!canUseSpeechSynthesis}>
              {voiceEnabled ? "Mute Voice" : "Unmute Voice"}
            </button>
            <button className="ag-chat-action" onClick={() => stopSpeaking()} disabled={!canUseSpeechSynthesis}>
              Stop Speech
            </button>
          </div>

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
              placeholder="Ask about your next airport step..."
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
