export type VoiceEventDetail = {
  source: "guide" | "chatbot";
  text: string;
};

export const VOICE_EVENT_NAME = "aeroguide:voice-message";

type SpeechOptions = {
  rate?: number;
  pitch?: number;
  lang?: string;
  volume?: number;
  queue?: boolean;
};

type SpeechRecognitionCtor = new () => SpeechRecognition;

type SpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const maybeWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return maybeWindow.SpeechRecognition ?? maybeWindow.webkitSpeechRecognition ?? null;
}

export function supportsSpeechSynthesis() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function supportsSpeechRecognition() {
  return typeof window !== "undefined" && getSpeechRecognitionCtor() !== null;
}

let googleTTSQueue: string[] = [];
let currentAudioQueue: HTMLAudioElement[] = [];
let isGoogleTTSPlaying = false;

export function stopSpeaking() {
  if (supportsSpeechSynthesis()) {
    window.speechSynthesis.cancel();
  }
  googleTTSQueue = [];
  currentAudioQueue.forEach(a => {
    a.pause();
    a.src = "";
  });
  currentAudioQueue = [];
  isGoogleTTSPlaying = false;
}

async function processGoogleTTSQueue() {
  if (isGoogleTTSPlaying || googleTTSQueue.length === 0) return;
  isGoogleTTSPlaying = true;
  
  while (googleTTSQueue.length > 0) {
    const url = googleTTSQueue.shift();
    if (!url) continue;
    
    const audio = new Audio(url);
    currentAudioQueue = [audio];
    
    await new Promise<void>(resolve => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    });
  }
  
  currentAudioQueue = [];
  isGoogleTTSPlaying = false;
}

function speakWithGoogleTTS(text: string, lang: string, queue: boolean) {
  if (!queue) {
    stopSpeaking();
  }
  
  const chunks = text.match(/[^.!?]+[.!?]+/g) || [text];
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    let subChunks = [];
    if (chunk.length > 180) {
      const words = chunk.split(' ');
      let current = '';
      for (const word of words) {
        if (current.length + word.length > 160) {
          subChunks.push(current);
          current = word + ' ';
        } else {
          current += word + ' ';
        }
      }
      if (current) subChunks.push(current);
    } else {
      subChunks = [chunk];
    }

    for (const sub of subChunks) {
      if (!sub.trim()) continue;
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(sub.trim())}`;
      googleTTSQueue.push(url);
    }
  }
  
  processGoogleTTSQueue();
}

export function speakText(text: string, options: SpeechOptions = {}) {
  if (!text) return;

  const langKey = options.lang?.split('-')[0] || "en";
  if (["si", "hi", "zh", "ar"].includes(langKey)) {
    speakWithGoogleTTS(text, langKey, !!options.queue);
    return;
  }

  if (!supportsSpeechSynthesis()) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate ?? 1;
  utterance.pitch = options.pitch ?? 1;
  utterance.lang = options.lang ?? "en-US";
  utterance.volume = options.volume ?? 1;
  if (!options.queue) {
    stopSpeaking();
  }
  window.speechSynthesis.speak(utterance);
}

export async function requestMicrophonePermission() {
  if (!navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

export function startSpeechRecognition(onTranscript: (text: string) => void, onError?: (message: string) => void) {
  const Recognition = getSpeechRecognitionCtor();
  if (!Recognition) {
    onError?.("Voice input is not supported by this browser.");
    return null;
  }

  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript?.trim();
    if (transcript) onTranscript(transcript);
  };
  recognition.onerror = (event) => onError?.(event.error || "Unable to capture voice.");
  recognition.start();
  return recognition;
}

export function publishVoiceEvent(detail: VoiceEventDetail) {
  window.dispatchEvent(new CustomEvent(VOICE_EVENT_NAME, { detail }));
}
