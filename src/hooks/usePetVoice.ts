import { useRef, useState, useCallback, useEffect } from "react";

export type PetVoicePreset =
  | "cat" | "dog" | "bird" | "frog" | "robot" | "ghost" | "baby" | "giant";

export interface PetVoiceConfig {
  preset: PetVoicePreset;
  pitch: number;
  rate: number;
  pitchShift: number;
  robotize: boolean;
  echo: boolean;
}

export const PRESETS: Record<PetVoicePreset, Omit<PetVoiceConfig, "preset">> = {
  cat:   { pitch: 2.0, rate: 1.1, pitchShift:  7, robotize: false, echo: false },
  dog:   { pitch: 0.6, rate: 0.9, pitchShift: -3, robotize: false, echo: false },
  bird:  { pitch: 3.8, rate: 1.4, pitchShift: 12, robotize: false, echo: true  },
  frog:  { pitch: 0.4, rate: 0.7, pitchShift: -6, robotize: false, echo: false },
  robot: { pitch: 0.8, rate: 0.8, pitchShift:  0, robotize: true,  echo: false },
  ghost: { pitch: 1.6, rate: 0.6, pitchShift: -2, robotize: false, echo: true  },
  baby:  { pitch: 3.5, rate: 1.3, pitchShift:  9, robotize: false, echo: false },
  giant: { pitch: 0.2, rate: 0.5, pitchShift:-10, robotize: false, echo: false },
};

export const PRESET_META: Record<PetVoicePreset, { emoji: string; label: string; bg: string }> = {
  cat:   { emoji: "🐱", label: "Gato",    bg: "#FF6B8A" },
  dog:   { emoji: "🐶", label: "Perro",   bg: "#FF8C42" },
  bird:  { emoji: "🐦", label: "Pájaro",  bg: "#5BC8F5" },
  frog:  { emoji: "🐸", label: "Rana",    bg: "#B8E04A" },
  robot: { emoji: "🤖", label: "Robot",   bg: "#5BAEFF" },
  ghost: { emoji: "👻", label: "Fantasma",bg: "#C06BDB" },
  baby:  { emoji: "🍼", label: "Bebé",    bg: "#FFE033" },
  giant: { emoji: "🦕", label: "Gigante", bg: "#5FD49A" },
};

/** Wait for voices to be loaded — fixes the race condition on first call */
function getVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) { resolve(voices); return; }
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };
    // Safari fallback: voices may never fire onvoiceschanged
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 500);
  });
}

export function usePetVoice() {
  const [config, setConfig] = useState<PetVoiceConfig>({
    preset: "cat",
    ...PRESETS["cat"],
  });
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript,  setTranscript]  = useState("");
  const [error,       setError]       = useState<string | null>(null);

  const recognRef = useRef<any>(null);

  // Pre-warm voice list on mount so first speak() is instant
  useEffect(() => {
    if (window.speechSynthesis) getVoicesAsync();
  }, []);

  // ── speak ──────────────────────────────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;
    if (!window.speechSynthesis) {
      setError("Tu browser no soporta síntesis de voz 😢");
      return;
    }
    window.speechSynthesis.cancel();
    setError(null);
    setIsSpeaking(true);

    const utt    = new SpeechSynthesisUtterance(text);
    utt.pitch    = Math.min(Math.max(config.pitch, 0.1), 2); // clamp: Web Speech max is 2
    utt.rate     = Math.min(Math.max(config.rate,  0.1), 10);
    utt.lang     = "es-ES";
    utt.volume   = 1;

    // ✔ Wait for voices before assigning — this fixes the "Error al sintetizar" bug
    try {
      const voices = await getVoicesAsync();
      const esVoice = voices.find(v => v.lang.startsWith("es"))
                   ?? voices.find(v => v.default)
                   ?? voices[0];
      if (esVoice) utt.voice = esVoice;
    } catch { /* ignore, browser will use default */ }

    utt.onend   = () => setIsSpeaking(false);
    utt.onerror = (ev) => {
      setIsSpeaking(false);
      // 'interrupted' fires when we cancel before new speech — not a real error
      if ((ev as any).error !== "interrupted") {
        setError(`Error al sintetizar voz (${(ev as any).error ?? "desconocido"})`);
      }
    };

    window.speechSynthesis.speak(utt);
  }, [config]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  // ── mic listen ───────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Tu browser no soporta reconocimiento de voz. Usa Chrome.");
      return;
    }
    const recog = new SR();
    recog.lang           = "es-ES";
    recog.interimResults = true;
    recog.continuous     = false;
    recog.onstart  = () => { setIsListening(true); setError(null); };
    recog.onend    = () => setIsListening(false);
    recog.onerror  = (e: any) => {
      setIsListening(false);
      setError(e.error === "not-allowed" ? "Permite el micrófono 🎤" : `Error mic: ${e.error}`);
    };
    recog.onresult = (e: any) => {
      const t = Array.from(e.results as any[])
        .map((r: any) => r[0].transcript).join("");
      setTranscript(t);
      if (e.results[e.results.length - 1].isFinal) speak(t);
    };
    recognRef.current = recog;
    recog.start();
  }, [speak]);

  const stopListening = useCallback(() => {
    recognRef.current?.stop();
    setIsListening(false);
  }, []);

  const applyPreset = useCallback((preset: PetVoicePreset) => {
    setConfig({ preset, ...PRESETS[preset] });
  }, []);

  const updateConfig = useCallback((patch: Partial<PetVoiceConfig>) => {
    setConfig(prev => ({ ...prev, ...patch }));
  }, []);

  return {
    config, updateConfig, applyPreset,
    speak, stopSpeaking, isSpeaking,
    startListening, stopListening, isListening,
    transcript, setTranscript,
    error,
  };
}
