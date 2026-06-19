import { useState, useRef, useEffect } from "react";
import type { MelodyNote } from "./PlayMode";

// ─── Audio Context ───────────────────────────────────────────────────────────
let _expCtx: AudioContext | null = null;
function getCtx() {
  if (!_expCtx) _expCtx = new AudioContext();
  return _expCtx;
}

// ─── Genre definitions ────────────────────────────────────────────────────────
// scale: semitone intervals from root (C4 = 261.63 Hz)
// filterHz: lowpass cutoff, reverbMix: 0-1, oscType: oscillator character
const ROOT = 261.63; // C4

type OscType = OscillatorType;
interface GenreDef {
  id: string;
  label: string;
  emoji: string;
  color: string;         // row accent
  scale: number[];       // semitones for 6 instrument columns
  filterHz: number;
  reverbMix: number;
  oscType: OscType;
  tempoMult: number;     // duration multiplier (lower = faster)
  distortion: boolean;
}

const GENRES: GenreDef[] = [
  {
    id: "rock", label: "ROCK", emoji: "🎸",
    color: "#FF4444",
    scale: [0, 5, 7, 10, 12, 15],       // minor pentatonic
    filterHz: 3500, reverbMix: 0.15, oscType: "sawtooth",
    tempoMult: 0.85, distortion: true,
  },
  {
    id: "jazz", label: "JAZZ", emoji: "🎷",
    color: "#FFB830",
    scale: [0, 3, 5, 7, 10, 14],        // dorian
    filterHz: 2200, reverbMix: 0.35, oscType: "sine",
    tempoMult: 1.1, distortion: false,
  },
  {
    id: "metal", label: "METAL", emoji: "🤘",
    color: "#888888",
    scale: [0, 1, 5, 6, 7, 10],         // phrygian / diminished
    filterHz: 5000, reverbMix: 0.08, oscType: "sawtooth",
    tempoMult: 0.6, distortion: true,
  },
  {
    id: "pop", label: "POP", emoji: "🎤",
    color: "#FF6BE8",
    scale: [0, 4, 7, 9, 12, 16],        // major
    filterHz: 4000, reverbMix: 0.25, oscType: "triangle",
    tempoMult: 1.0, distortion: false,
  },
  {
    id: "funk", label: "FUNK", emoji: "🎺",
    color: "#B8E04A",
    scale: [0, 3, 5, 7, 10, 12],        // mixolydian
    filterHz: 1800, reverbMix: 0.2, oscType: "square",
    tempoMult: 0.75, distortion: false,
  },
  {
    id: "ballad", label: "BALLAD", emoji: "🎻",
    color: "#5BC8F5",
    scale: [0, 4, 7, 11, 14, 17],       // major 7th / lush
    filterHz: 1400, reverbMix: 0.55, oscType: "sine",
    tempoMult: 1.5, distortion: false,
  },
];

// ─── Instrument columns ───────────────────────────────────────────────────────
interface InstrumentCol {
  id: string;
  label: string;
  emoji: string;
  octaveShift: number; // semitone offset on top of genre scale note
  volMult: number;
  durMult: number;
}
const INSTRUMENTS: InstrumentCol[] = [
  { id: "drums",   label: "DRUMS",  emoji: "🥁", octaveShift: -12, volMult: 1.2, durMult: 0.4 },
  { id: "bass",    label: "BASS",   emoji: "🎵", octaveShift: -5,  volMult: 1.0, durMult: 0.9 },
  { id: "melody",  label: "MEL",    emoji: "🎹", octaveShift: 0,   volMult: 0.9, durMult: 1.0 },
  { id: "harmony", label: "HARM",   emoji: "🪗", octaveShift: 4,   volMult: 0.7, durMult: 1.2 },
  { id: "synth",   label: "SYNTH",  emoji: "🌟", octaveShift: 7,   volMult: 0.6, durMult: 1.4 },
  { id: "fx",      label: "FX",     emoji: "✨", octaveShift: 12,  volMult: 0.5, durMult: 0.6 },
];

// ─── Audio synthesis ──────────────────────────────────────────────────────────
function semitoneToHz(semitones: number): number {
  return ROOT * Math.pow(2, semitones / 12);
}

// Simple convolver-based reverb approximation using noise impulse
function createReverb(ctx: AudioContext, mix: number): { input: GainNode; output: GainNode } {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain(); dry.gain.value = 1 - mix;
  const wet = ctx.createGain(); wet.gain.value = mix;

  const len = ctx.sampleRate * 1.5;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
  }
  const conv = ctx.createConvolver(); conv.buffer = buf;

  input.connect(dry); dry.connect(output);
  input.connect(conv); conv.connect(wet); wet.connect(output);
  return { input, output };
}

function playGenreInstrument(
  genre: GenreDef,
  colIndex: number,
  baseFreqFromMelody: number,
) {
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();

  const inst = INSTRUMENTS[colIndex];
  const scaleSemitone = genre.scale[colIndex] + inst.octaveShift;
  // blend genre scale with melody freq: use melody as root octave reference
  const melodyRoot = baseFreqFromMelody > 0
    ? baseFreqFromMelody * Math.pow(2, Math.round(Math.log2(ROOT / baseFreqFromMelody)))
    : ROOT;
  const freq = melodyRoot * Math.pow(2, scaleSemitone / 12);

  const dur = 0.5 * genre.tempoMult * inst.durMult;
  const vol = 0.7 * inst.volMult;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = genre.oscType;
  osc.frequency.value = Math.max(40, Math.min(freq, 4000));

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.001, now);
  gainNode.gain.linearRampToValueAtTime(vol, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + dur);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = genre.filterHz;

  osc.connect(filter);

  if (genre.distortion && (genre.id === "rock" || genre.id === "metal")) {
    const wave = ctx.createWaveShaper();
    const k = genre.id === "metal" ? 400 : 150;
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
    }
    wave.curve = curve;
    filter.connect(wave);

    const rev = createReverb(ctx, genre.reverbMix);
    wave.connect(gainNode);
    gainNode.connect(rev.input);
    rev.output.connect(ctx.destination);
  } else {
    const rev = createReverb(ctx, genre.reverbMix);
    filter.connect(gainNode);
    gainNode.connect(rev.input);
    rev.output.connect(ctx.destination);
  }

  osc.start(now);
  osc.stop(now + dur + 0.1);
}

// ─── MIME type detection ──────────────────────────────────────────────────────
function getSupportedMimeType(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg", "audio/mp4", ""];
  for (const t of types) {
    if (t === "" || (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t))) return t;
  }
  return "";
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props { melody: MelodyNote[]; }

export function ExperimentMode({ melody }: Props) {
  const [petPhoto,    setPetPhoto]    = useState<string | null>(null);
  const [recording,   setRecording]   = useState(false);
  const [recorded,    setRecorded]    = useState(false);
  const [remixURL,    setRemixURL]    = useState<string | null>(null);
  const [remixExt,    setRemixExt]    = useState("webm");
  const [recSeconds,  setRecSeconds]  = useState(0);
  const [noteStep,    setNoteStep]    = useState(0);
  // flash: "genreId-colIndex"
  const [flash,       setFlash]       = useState<string | null>(null);

  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<BlobPart[]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);

  const notes = melody.filter(n => !n.rest);
  const baseFreq = notes.length > 0 ? notes[noteStep % notes.length].freq : ROOT;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPetPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      const ctx = getCtx();
      if (ctx.state === "suspended") await ctx.resume();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = getSupportedMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const finalMime = mr.mimeType || mimeType || "audio/webm";
        const ext = finalMime.includes("ogg") ? "ogg" : finalMime.includes("mp4") ? "m4a" : "webm";
        setRemixExt(ext);
        setRemixURL(URL.createObjectURL(new Blob(chunksRef.current, { type: finalMime })));
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };
      mr.start(100);
      mediaRecRef.current = mr;
      setRecording(true); setRecorded(false); setRemixURL(null);
      setNoteStep(0); setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch { alert("Microphone access denied."); }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecRef.current?.state !== "inactive") mediaRecRef.current?.stop();
    setRecording(false); setRecorded(true);
  };

  const tapButton = (genre: GenreDef, colIndex: number) => {
    const canTap = recording || recorded;
    if (!canTap) return;
    playGenreInstrument(genre, colIndex, baseFreq);
    setNoteStep(s => (s + 1) % Math.max(notes.length, 1));
    const key = `${genre.id}-${colIndex}`;
    setFlash(key);
    setTimeout(() => setFlash(null), 160);
  };

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const canTap = recording || recorded;

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#1A1A2E", fontFamily:"'Chewy',cursive" }}>

      {/* Header + photo */}
      <div style={{ flexShrink:0, padding:"8px 14px 6px", display:"flex", alignItems:"center", gap:"12px" }}>
        <div style={{ color:"#FFE033", fontSize:"1rem" }}>🧪 Experiments</div>
        {/* Pet photo pill */}
        <label htmlFor="pet-upload-grid" style={{
          width:44, height:44, borderRadius:"50%",
          background: petPhoto ? "transparent" : "#2A2A4A",
          border:"3px solid #FFE033",
          boxShadow:"0 0 0 2px #1A1A1A",
          cursor:"pointer", overflow:"hidden", flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          {petPhoto
            ? <img src={petPhoto} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <span style={{ fontSize:"1.3rem" }}>📷</span>
          }
        </label>
        <input id="pet-upload-grid" type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display:"none" }} />
        <div style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.4)", lineHeight:1.3 }}>
          {petPhoto ? "Tap to change photo" : "Upload your pet →"}<br/>
          {!canTap && "Record first, then tap!"}
          {recording && `🔴 ${recSeconds}s`}
          {recorded && !recording && "✅ Tap buttons to mix!"}
        </div>
      </div>

      {/* Column headers */}
      <div style={{ flexShrink:0, display:"flex", paddingLeft:70, paddingRight:8, gap:3 }}>
        {INSTRUMENTS.map(inst => (
          <div key={inst.id} style={{
            flex:1, textAlign:"center",
            fontSize:"0.55rem", color:"rgba(255,255,255,0.5)",
            lineHeight:1.2, paddingBottom:2,
          }}>
            <div style={{ fontSize:"0.85rem" }}>{inst.emoji}</div>
            {inst.label}
          </div>
        ))}
      </div>

      {/* Genre × Instrument grid */}
      <div style={{ flex:1, overflow:"auto", padding:"4px 8px 4px 8px", display:"flex", flexDirection:"column", gap:5 }}>
        {GENRES.map(genre => (
          <div key={genre.id} style={{ display:"flex", alignItems:"center", gap:3 }}>

            {/* Genre label */}
            <div style={{
              width:62, flexShrink:0,
              background:"#0D0D1E",
              border:`2px solid ${genre.color}`,
              borderRadius:8,
              padding:"4px 6px",
              display:"flex", flexDirection:"column", alignItems:"center",
              gap:1,
            }}>
              <span style={{ fontSize:"1.1rem", lineHeight:1 }}>{genre.emoji}</span>
              <span style={{ fontSize:"0.58rem", color:genre.color, letterSpacing:"0.05em", fontWeight:"bold" }}>{genre.label}</span>
            </div>

            {/* 6 instrument buttons */}
            {INSTRUMENTS.map((inst, colIdx) => {
              const key = `${genre.id}-${colIdx}`;
              const isFlash = flash === key;
              return (
                <button
                  key={inst.id}
                  onPointerDown={e => { e.preventDefault(); tapButton(genre, colIdx); }}
                  style={{
                    flex:1,
                    aspectRatio:"1",
                    borderRadius:8,
                    background: isFlash ? "#FFFFFF" : canTap ? genre.color + "33" : "#1E1E38",
                    border: isFlash ? `2px solid #FFFFFF` : `2px solid ${canTap ? genre.color : "#333"}`,
                    boxShadow: isFlash ? `0 0 14px 4px ${genre.color}` : "none",
                    cursor: canTap ? "pointer" : "default",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    padding:0,
                    transform: isFlash ? "scale(1.18)" : "scale(1)",
                    transition:"transform 0.08s, background 0.08s, box-shadow 0.08s",
                    opacity: canTap ? 1 : 0.35,
                    WebkitTapHighlightColor:"transparent",
                    touchAction:"manipulation",
                    minHeight:0,
                    minWidth:0,
                  }}>
                  {/* LED dot */}
                  <div style={{
                    width: isFlash ? 12 : 8,
                    height: isFlash ? 12 : 8,
                    borderRadius:"50%",
                    background: isFlash ? "#FFFFFF" : canTap ? genre.color : "#333",
                    boxShadow: isFlash ? `0 0 8px ${genre.color}` : "none",
                    transition:"all 0.08s",
                  }} />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom controls */}
      <div style={{ flexShrink:0, padding:"8px 14px 12px", display:"flex", flexDirection:"column", gap:7, background:"#12122A", borderTop:"3px solid #FFE033" }}>
        <button
          onPointerDown={e => { e.preventDefault(); recording ? stopRecording() : startRecording(); }}
          style={{
            width:"100%", padding:"11px", borderRadius:"50px",
            background: recording ? "#FF6B8A" : "#FFE033",
            border: recording ? "3px solid #FF0040" : "3px solid #1A1A1A",
            cursor:"pointer", fontFamily:"'Chewy',cursive", fontSize:"1rem", color:"#1A1A1A",
            boxShadow: recording ? "0 0 14px #FF6B8A88" : "4px 4px 0 #000",
            display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
            WebkitTapHighlightColor:"transparent", touchAction:"manipulation",
          }}>
          <span>{recording ? "⏹" : "🔴"}</span>
          <span>{recording ? `Stop recording (${recSeconds}s)` : "Record your pet"}</span>
        </button>

        {remixURL && (
          <div style={{ background:"#B8E04A", border:"2px solid #1A1A1A", borderRadius:"12px", padding:"7px 10px", display:"flex", alignItems:"center", gap:"8px" }}>
            <audio controls src={remixURL} style={{ flex:1, height:"30px" }} />
            <a
              href={remixURL} download={`pet-experiment.${remixExt}`}
              style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 10px", borderRadius:"50px", background:"#FFFBF2", border:"2px solid #1A1A1A", fontFamily:"'Chewy',cursive", fontSize:"0.8rem", color:"#1A1A1A", boxShadow:"2px 2px 0 #1A1A1A", textDecoration:"none", flexShrink:0 }}>
              ⬇️ Save
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
