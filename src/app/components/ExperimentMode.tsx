import { useState, useRef, useEffect } from "react";
import type { MelodyNote } from "./PlayMode";

// ─── re-use the shared AudioContext from PlayMode module scope via a small bridge
let _sharedCtx: AudioContext | null = null;
function getCtx() {
  if (!_sharedCtx) _sharedCtx = new AudioContext();
  return _sharedCtx;
}

type InstrumentId = "piano" | "guitar" | "marimba" | "flute" | "bells" | "synthpad";

const INSTRUMENTS: { id: InstrumentId; emoji: string; label: string; bg: string; size: number; angle: number }[] = [
  { id: "piano",    emoji: "🎹", label: "Piano",   bg: "#FF6B8A", size: 64, angle: 0   },
  { id: "guitar",   emoji: "🎸", label: "Guitar",  bg: "#FFE033", size: 58, angle: 60  },
  { id: "marimba",  emoji: "🎵", label: "Marimba", bg: "#B8E04A", size: 54, angle: 120 },
  { id: "flute",    emoji: "🪈", label: "Flute",   bg: "#5BC8F5", size: 58, angle: 180 },
  { id: "bells",    emoji: "🔔", label: "Bells",   bg: "#FF8C42", size: 54, angle: 240 },
  { id: "synthpad", emoji: "🌟", label: "Synth",   bg: "#C06BDB", size: 62, angle: 300 },
];

function playNoteInst(freq: number, vol: number, dur: number, inst: InstrumentId) {
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.001, now);

  switch (inst) {
    case "piano": {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq; o.connect(gain);
      gain.gain.linearRampToValueAtTime(vol, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      o.start(now); o.stop(now + dur);
      const o2 = ctx.createOscillator(); o2.type = "triangle"; o2.frequency.value = freq * 2;
      const g2 = ctx.createGain(); g2.gain.value = 0.1; o2.connect(g2); g2.connect(gain);
      o2.start(now); o2.stop(now + dur);
      break;
    }
    case "guitar": {
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq;
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1800;
      o.connect(f); f.connect(gain);
      gain.gain.linearRampToValueAtTime(vol * 0.9, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.8);
      o.start(now); o.stop(now + dur);
      break;
    }
    case "marimba": {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq; o.connect(gain);
      gain.gain.linearRampToValueAtTime(vol, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      o.start(now); o.stop(now + 0.6);
      break;
    }
    case "flute": {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq;
      const vib = ctx.createOscillator(); vib.frequency.value = 5.5;
      const vg = ctx.createGain(); vg.gain.value = freq * 0.012;
      vib.connect(vg); vg.connect(o.frequency); o.connect(gain);
      gain.gain.linearRampToValueAtTime(vol * 0.7, now + 0.06);
      gain.gain.setValueAtTime(vol * 0.7, now + dur - 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      vib.start(now); vib.stop(now + dur);
      o.start(now); o.stop(now + dur);
      break;
    }
    case "bells": {
      [1, 2.756, 5.404].forEach((ratio, i) => {
        const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq * ratio;
        const g = ctx.createGain(); g.gain.value = i === 0 ? vol : vol * 0.14;
        o.connect(g); g.connect(gain); o.start(now); o.stop(now + dur * 1.5);
      });
      gain.gain.linearRampToValueAtTime(1, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur * 1.5);
      break;
    }
    case "synthpad": {
      [1, 1.005, 0.5].forEach(ratio => {
        const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq * ratio;
        const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
        o.connect(f); f.connect(gain); o.start(now); o.stop(now + dur + 0.3);
      });
      gain.gain.linearRampToValueAtTime(vol * 0.5, now + 0.12);
      gain.gain.setValueAtTime(vol * 0.5, now + dur - 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.3);
      break;
    }
  }
}

interface Props {
  melody: MelodyNote[];
}

export function ExperimentMode({ melody }: Props) {
  const [petPhoto,    setPetPhoto]    = useState<string | null>(null);
  const [recording,   setRecording]   = useState(false);
  const [recorded,    setRecorded]    = useState(false);
  const [remixURL,    setRemixURL]    = useState<string | null>(null);
  const [activeInst,  setActiveInst]  = useState<InstrumentId | null>(null);
  const [noteStep,    setNoteStep]    = useState(0);
  const [flashInst,   setFlashInst]   = useState<InstrumentId | null>(null);
  const [recSeconds,  setRecSeconds]  = useState(0);

  // Recording refs
  const mediaRecRef   = useRef<MediaRecorder | null>(null);
  const chunksRef     = useRef<BlobPart[]>([]);
  const audioBlobRef  = useRef<Blob | null>(null);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Recorder + master bus for capturing both mic + synth
  const masterBusRef  = useRef<GainNode | null>(null);
  const captureRecRef = useRef<MediaRecorder | null>(null);
  const captureChunks = useRef<BlobPart[]>([]);

  // Notes to play from (filter out rests)
  const notes = melody.filter(n => !n.rest);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPetPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up master bus so synth taps also get captured
      const ctx = getCtx();
      if (ctx.state === "suspended") await ctx.resume();
      const masterBus = ctx.createGain();
      masterBus.gain.value = 1.0;
      masterBus.connect(ctx.destination);
      masterBusRef.current = masterBus;

      // Mic into master bus
      const micSrc = ctx.createMediaStreamSource(stream);
      micSrc.connect(masterBus);

      // Capture stream from master bus
      const dest = ctx.createMediaStreamDestination();
      masterBus.connect(dest);
      const captureRec = new MediaRecorder(dest.stream);
      captureChunks.current = [];
      captureRec.ondataavailable = e => { if (e.data.size > 0) captureChunks.current.push(e.data); };
      captureRec.start();
      captureRecRef.current = captureRec;

      // Also keep raw mic for fallback
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        audioBlobRef.current = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecRef.current = mr;

      setRecording(true); setRecorded(false); setRemixURL(null);
      setNoteStep(0); setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch { alert("Microphone access denied."); }
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);

    // Stop capture recorder and build remix blob
    const captureRec = captureRecRef.current;
    if (captureRec && captureRec.state !== "inactive") {
      captureRec.onstop = () => {
        const blob = new Blob(captureChunks.current, { type: "audio/webm" });
        setRemixURL(URL.createObjectURL(blob));
      };
      captureRec.stop();
    }

    // Disconnect master bus
    masterBusRef.current?.disconnect();
    masterBusRef.current = null;

    setRecording(false); setRecorded(true);
  };

  // Tap an instrument circle → play next note in sequence
  const tapInstrument = (id: InstrumentId) => {
    if (!notes.length) return;
    const note = notes[noteStep % notes.length];
    playNoteInst(note.freq, note.volume, note.duration, id);
    setActiveInst(id);
    setNoteStep(s => s + 1);

    // Flash effect
    setFlashInst(id);
    setTimeout(() => setFlashInst(null), 180);
  };

  // Cleanup on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    masterBusRef.current?.disconnect();
  }, []);

  const photoSize = 180;
  const orbitRadius = 138;

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#1A1A2E", fontFamily:"'Chewy',cursive" }}>

      {/* Title */}
      <div style={{ padding:"10px 16px 0", color:"#FFE033", fontSize:"1.1rem", flexShrink:0 }}>🧪 Experiments</div>

      {/* Main stage */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>

        {/* Orbit area */}
        <div style={{ position:"relative", width: photoSize + orbitRadius*2, height: photoSize + orbitRadius*2, maxWidth:"92vw", maxHeight:"92vw" }}>

          {/* Instrument circles in orbit */}
          {INSTRUMENTS.map(inst => {
            const rad = (inst.angle * Math.PI) / 180;
            const cx = (photoSize/2 + orbitRadius) + Math.cos(rad) * orbitRadius;
            const cy = (photoSize/2 + orbitRadius) + Math.sin(rad) * orbitRadius;
            const isFlashing = flashInst === inst.id;
            const canTap = recording || recorded;
            return (
              <button
                key={inst.id}
                onClick={() => canTap && tapInstrument(inst.id)}
                style={{
                  position:"absolute",
                  left: cx - inst.size/2,
                  top:  cy - inst.size/2,
                  width: inst.size, height: inst.size,
                  borderRadius:"50%",
                  background: isFlashing ? "#FFFFFF" : inst.bg,
                  border: `3px solid #1A1A1A`,
                  boxShadow: isFlashing ? `0 0 18px 6px ${inst.bg}` : `3px 3px 0 #000`,
                  cursor: canTap ? "pointer" : "default",
                  fontSize: inst.size > 56 ? "1.6rem" : "1.3rem",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transform: isFlashing ? "scale(1.25)" : "scale(1)",
                  transition:"transform 0.1s, box-shadow 0.1s, background 0.1s",
                  opacity: canTap ? 1 : 0.45,
                  zIndex: 2,
                  padding: 0,
                }}>
                {inst.emoji}
              </button>
            );
          })}

          {/* Pet photo / upload in center */}
          <label htmlFor="pet-upload" style={{
            position:"absolute",
            left: orbitRadius, top: orbitRadius,
            width: photoSize, height: photoSize,
            borderRadius:"50%",
            background: petPhoto ? "transparent" : "#2A2A4A",
            border: "4px solid #FFE033",
            boxShadow: "0 0 0 4px #1A1A1A, 6px 6px 0 #000",
            cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            flexDirection:"column", gap:"4px",
            overflow:"hidden",
            zIndex: 3,
          }}>
            {petPhoto
              ? <img src={petPhoto} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : (<>
                  <span style={{ fontSize:"2.2rem" }}>📷</span>
                  <span style={{ fontSize:"0.7rem", color:"#FFE033", textAlign:"center", lineHeight:1.2 }}>Upload{"\n"}pet photo</span>
                </>)
            }
          </label>
          <input id="pet-upload" type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display:"none" }} />

          {/* Note step indicator — small arc of dots */}
          {notes.length > 0 && (
            <div style={{ position:"absolute", left: orbitRadius + photoSize/2 - 40, top: orbitRadius + photoSize + 6, display:"flex", gap:"4px", zIndex:4 }}>
              {Array.from({ length: Math.min(notes.length, 16) }).map((_, i) => (
                <div key={i} style={{
                  width:6, height:6, borderRadius:"50%",
                  background: i === noteStep % Math.min(notes.length, 16) ? "#FFE033" : "rgba(255,255,255,0.25)",
                  transition:"background 0.1s",
                }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{ flexShrink:0, padding:"10px 16px 14px", display:"flex", flexDirection:"column", gap:"8px", background:"#12122A", borderTop:"3px solid #FFE033" }}>

        {/* Help text */}
        <div style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.5)", textAlign:"center" }}>
          {!recording && !recorded && "Record your pet, then tap the circles to play notes!"}
          {recording && `🔴 Recording... ${recSeconds}s — tap the circles to add notes!`}
          {recorded && !recording && "✅ Done! Listen or save your remix below."}
        </div>

        {/* Record / Stop button */}
        <button
          onClick={recording ? stopRecording : startRecording}
          style={{
            width:"100%", padding:"12px",
            borderRadius:"50px",
            background: recording ? "#FF6B8A" : "#FFE033",
            border: recording ? "3px solid #FF0040" : "3px solid #1A1A1A",
            cursor:"pointer",
            fontFamily:"'Chewy',cursive", fontSize:"1rem", color:"#1A1A1A",
            boxShadow: recording ? "0 0 12px #FF6B8A88" : "4px 4px 0 #000",
            display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
            animation: recording ? "pulse 1s infinite" : "none",
          }}>
          <span>{recording ? "⏹" : "🔴"}</span>
          <span>{recording ? `Stop recording (${recSeconds}s)` : "Record your pet"}</span>
        </button>

        {/* Remix result */}
        {remixURL && (
          <div style={{ background:"#B8E04A", border:"2px solid #1A1A1A", borderRadius:"12px", padding:"8px 12px", display:"flex", alignItems:"center", gap:"8px" }}>
            <audio controls src={remixURL} style={{ flex:1, height:"28px" }} />
            <a
              href={remixURL} download="pet-experiment.webm"
              style={{ display:"flex", alignItems:"center", gap:"4px", padding:"6px 10px", borderRadius:"50px", background:"#FFFBF2", border:"2px solid #1A1A1A", fontFamily:"'Chewy',cursive", fontSize:"0.8rem", color:"#1A1A1A", boxShadow:"2px 2px 0 #1A1A1A", textDecoration:"none", flexShrink:0 }}>
              ⬇️ Save
            </a>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 12px #FF6B8A88; }
          50%      { box-shadow: 0 0 24px #FF6B8Acc; }
        }
      `}</style>
    </div>
  );
}
