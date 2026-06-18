import { useState, useRef, useEffect } from "react";
import { useDrawSound } from "../../hooks/useDrawSound";
import { getMoodResult, type MoodResult } from "../../lib/moodDetect";

const ANIMAL_META: Record<string, { emoji: string; label: string; bg: string }> = {
  cat:     { emoji: "🐱", label: "Cat",     bg: "#FF6B8A" },
  dog:     { emoji: "🐶", label: "Dog",     bg: "#FF8C42" },
  bird:    { emoji: "🐦", label: "Bird",    bg: "#5BC8F5" },
  frog:    { emoji: "🐸", label: "Frog",    bg: "#B8E04A" },
  rabbit:  { emoji: "🐇", label: "Rabbit",  bg: "#C06BDB" },
  hamster: { emoji: "🐹", label: "Hamster", bg: "#FFE033" },
  cow:     { emoji: "🐄", label: "Cow",     bg: "#5BAEFF" },
  lion:    { emoji: "🦁", label: "Lion",    bg: "#FF6B8A" },
};
const ANIMAL_LIST = Object.keys(ANIMAL_META);

export function VoiceMode({ drawingDataUrl }: { drawingDataUrl: string | null }) {
  const { profile, analyze, play, stopAll, isPlaying, isAnalyzing } = useDrawSound();
  const [animal,     setAnimal]     = useState("cat");
  const [moodResult, setMoodResult] = useState<MoodResult | null>(null);
  const [recording,  setRecording]  = useState(false);
  const [audioURL,   setAudioURL]   = useState<string | null>(null);
  const [audioBlob,  setAudioBlob]  = useState<Blob | null>(null);
  const [remixing,   setRemixing]   = useState(false);
  const [remixURL,   setRemixURL]   = useState<string | null>(null);
  const mediaRecRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<BlobPart[]>([]);

  const meta = ANIMAL_META[animal] ?? ANIMAL_META.cat;

  useEffect(() => {
    if (!drawingDataUrl) return;
    analyze(drawingDataUrl).then(p => setMoodResult(getMoodResult(p, animal as any)));
  }, [drawingDataUrl]);

  useEffect(() => {
    if (!profile) return;
    setMoodResult(getMoodResult(profile, animal as any));
  }, [animal, profile]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        setRemixURL(null);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecRef.current = mr;
      setRecording(true);
      setAudioURL(null);
      setRemixURL(null);
    } catch {
      alert("Microphone access denied. Please allow mic access and try again.");
    }
  };

  const stopRecording = () => { mediaRecRef.current?.stop(); setRecording(false); };

  const remixWithMelody = async () => {
    if (!audioBlob || !drawingDataUrl) return;
    setRemixing(true);
    try {
      play(drawingDataUrl);
      const actx     = new AudioContext();
      const arrayBuf = await audioBlob.arrayBuffer();
      const decoded  = await actx.decodeAudioData(arrayBuf);
      const src      = actx.createBufferSource();
      src.buffer     = decoded;
      src.detune.value = profile ? Math.max(-1200, Math.min(1200, Math.round(((profile.baseFreq - 440) / 440) * 100))) : 0;
      src.loop       = true;
      const gain     = actx.createGain();
      gain.gain.value = profile ? Math.min(profile.volume * 1.2, 1) : 0.8;
      if (profile?.echo) {
        const conv  = actx.createConvolver();
        const irLen = actx.sampleRate * 1.5;
        const irBuf = actx.createBuffer(2, irLen, actx.sampleRate);
        for (let c = 0; c < 2; c++) {
          const d = irBuf.getChannelData(c);
          for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2);
        }
        conv.buffer = irBuf;
        src.connect(gain).connect(conv).connect(actx.destination);
      } else {
        src.connect(gain).connect(actx.destination);
      }
      src.start();
      const dest   = actx.createMediaStreamDestination();
      gain.connect(dest);
      const mr2    = new MediaRecorder(dest.stream);
      const chunks2: BlobPart[] = [];
      mr2.ondataavailable = e => chunks2.push(e.data);
      const duration = (profile?.duration ?? 4) * 1000 + 2000;
      mr2.onstop = () => {
        setRemixURL(URL.createObjectURL(new Blob(chunks2, { type: "audio/webm" })));
        setRemixing(false);
      };
      mr2.start();
      setTimeout(() => { mr2.stop(); src.stop(); actx.close(); stopAll(); }, duration);
    } catch (err) {
      console.error(err);
      setRemixing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ fontFamily: "'Chewy',cursive", background: "#5BC8F5" }}>

      {/* Top bar */}
      <div style={{ background: "#FFE033", borderBottom: "3px solid #1A1A1A", padding: "8px 16px", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0, flexWrap: "wrap" }}>
        <div style={{ width: "48px", height: "48px", background: drawingDataUrl ? "transparent" : "#FFFBF2", border: "3px solid #1A1A1A", borderRadius: "12px", overflow: "hidden", flexShrink: 0, boxShadow: "3px 3px 0 #1A1A1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {drawingDataUrl ? <img src={drawingDataUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "1.4rem" }}>🎨</span>}
        </div>
        {moodResult && (
          <div style={{ background: meta.bg, border: "3px solid #1A1A1A", borderRadius: "50px", padding: "6px 16px", boxShadow: "3px 3px 0 #1A1A1A", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.4rem" }}>{moodResult.emoji}</span>
            <div>
              <div style={{ fontSize: "0.65rem", color: "#5A3A00", textTransform: "uppercase", letterSpacing: "0.5px" }}>Your drawing says...</div>
              <div style={{ fontSize: "1rem", color: "#1A1A1A" }}>{meta.emoji} {meta.label} feels <strong>{moodResult.label}</strong></div>
            </div>
          </div>
        )}
        {recording && (
          <div style={{ background: "#FF6B8A", border: "3px solid #1A1A1A", borderRadius: "50px", padding: "4px 14px", boxShadow: "2px 2px 0 #1A1A1A", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>🔴</span><span style={{ fontSize: "0.85rem" }}>Recording...</span>
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Animal selector */}
        <div style={{ width: "96px", flexShrink: 0, background: "#FFE033", borderRight: "3px solid #1A1A1A", padding: "12px 8px", display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto" }}>
          <span style={{ fontSize: "0.65rem", color: "#1A1A1A", textAlign: "center" }}>ANIMAL</span>
          {ANIMAL_LIST.map(a => {
            const m = ANIMAL_META[a]; const active = animal === a;
            return (
              <button key={a} onClick={() => setAnimal(a)} style={{ width: "78px", height: "68px", borderRadius: "14px", background: active ? m.bg : "#FFFBF2", border: active ? "4px solid #1A1A1A" : "3px solid #1A1A1A", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px", boxShadow: active ? "2px 2px 0 #1A1A1A" : "3px 3px 0 #1A1A1A", transform: active ? "translate(2px,2px)" : "none", transition: "all 0.1s", fontFamily: "'Chewy',cursive" }}>
                <span style={{ fontSize: "1.5rem" }}>{m.emoji}</span>
                <span style={{ fontSize: "0.6rem", color: "#1A1A1A" }}>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Single main card — sequential steps */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* MOOD — step 0, always visible if drawing exists */}
          {moodResult ? (
            <div style={{ background: "#FFFBF2", border: "4px solid #1A1A1A", borderRadius: "20px", padding: "16px", boxShadow: "5px 5px 0 #1A1A1A", position: "relative" }}>
              <div style={{ position: "absolute", top: "-14px", left: "18px", background: meta.bg, border: "3px solid #1A1A1A", borderRadius: "50px", padding: "3px 14px", fontSize: "0.75rem", color: "#1A1A1A", boxShadow: "2px 2px 0 #1A1A1A" }}>
                🎨 Generated from your drawing
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: meta.bg, border: "3px solid #1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", boxShadow: "3px 3px 0 #1A1A1A", flexShrink: 0 }}>
                  {moodResult.emoji}
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "#5A3A00", textTransform: "uppercase", letterSpacing: "0.5px" }}>Detected mood: <strong>{moodResult.label}</strong></div>
                  <div style={{ fontSize: "1rem", color: "#1A1A1A", fontStyle: "italic", marginTop: "4px" }}>"{moodResult.phrase}"</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: "#FFFBF2", border: "3px solid #1A1A1A", borderRadius: "16px", padding: "20px", boxShadow: "4px 4px 0 #1A1A1A", textAlign: "center" }}>
              <div style={{ fontSize: "2rem" }}>{isAnalyzing ? "🔍" : "🎨"}</div>
              <div style={{ fontSize: "0.95rem", marginTop: "8px", color: "#1A1A1A" }}>{isAnalyzing ? "Reading your drawing..." : "Draw something first — your pet needs a mood 👀"}</div>
            </div>
          )}

          {/* STEP 1 — Record */}
          <div style={{ background: "#FFFBF2", border: "4px solid #1A1A1A", borderRadius: "20px", padding: "20px", boxShadow: "5px 5px 0 #1A1A1A" }}>
            <div style={{ fontSize: "0.7rem", color: "#5A3A00", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Step 1 — Record your {meta.label}</div>
            <button
              onClick={recording ? stopRecording : startRecording}
              style={{ width: "100%", padding: "18px", borderRadius: "16px", background: recording ? "#FF6B8A" : meta.bg, border: recording ? "4px solid #1A1A1A" : "3px solid #1A1A1A", cursor: "pointer", fontFamily: "'Chewy',cursive", fontSize: "1.3rem", color: "#1A1A1A", boxShadow: recording ? "2px 2px 0 #1A1A1A" : "5px 5px 0 #1A1A1A", transform: recording ? "translate(2px,2px)" : "none", transition: "all 0.1s", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
              <span>{recording ? "⏹" : "🔴"}</span>
              <span>{recording ? "Stop" : `Record ${meta.emoji} ${meta.label}`}</span>
            </button>
          </div>

          {/* STEP 2 — Listen (appears after recording) */}
          {audioURL && !recording && (
            <div style={{ background: "#FFFBF2", border: "4px solid #1A1A1A", borderRadius: "20px", padding: "20px", boxShadow: "5px 5px 0 #1A1A1A" }}>
              <div style={{ fontSize: "0.7rem", color: "#5A3A00", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Step 2 — Listen</div>
              <audio controls src={audioURL} style={{ width: "100%", borderRadius: "8px" }} />
            </div>
          )}

          {/* STEP 3 — Remix (appears after recording) */}
          {audioURL && !recording && (
            <div style={{ background: "#FFFBF2", border: "4px solid #1A1A1A", borderRadius: "20px", padding: "20px", boxShadow: "5px 5px 0 #1A1A1A" }}>
              <div style={{ fontSize: "0.7rem", color: "#5A3A00", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Step 3 — Remix with your drawing</div>
              <button
                onClick={remixWithMelody}
                disabled={remixing || !drawingDataUrl}
                style={{ width: "100%", padding: "18px", borderRadius: "16px", background: remixing ? "#DDD" : "#C06BDB", border: "3px solid #1A1A1A", cursor: remixing || !drawingDataUrl ? "not-allowed" : "pointer", fontFamily: "'Chewy',cursive", fontSize: "1.2rem", color: "#1A1A1A", boxShadow: remixing ? "none" : "5px 5px 0 #1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                <span>🎵</span>
                <span>{remixing ? "Mixing..." : "Remix with my drawing!"}</span>
              </button>
              {!drawingDataUrl && <div style={{ fontSize: "0.75rem", color: "#FF6B8A", textAlign: "center", marginTop: "8px" }}>⚠️ Draw something first to enable remix</div>}
            </div>
          )}

          {/* STEP 4 — Download (appears after remix) */}
          {remixURL && (
            <div style={{ background: "#B8E04A", border: "4px solid #1A1A1A", borderRadius: "20px", padding: "20px", boxShadow: "5px 5px 0 #1A1A1A" }}>
              <div style={{ fontSize: "0.7rem", color: "#1A1A1A", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>🎉 Your pet + your drawing</div>
              <audio controls src={remixURL} style={{ width: "100%", borderRadius: "8px", marginBottom: "12px" }} />
              <a
                href={remixURL}
                download={`${meta.label.toLowerCase()}-remix.webm`}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "14px", borderRadius: "16px", background: "#FFFBF2", border: "3px solid #1A1A1A", fontFamily: "'Chewy',cursive", fontSize: "1.1rem", color: "#1A1A1A", boxShadow: "4px 4px 0 #1A1A1A", textDecoration: "none" }}>
                <span>⬇️</span><span>Download remix</span>
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
