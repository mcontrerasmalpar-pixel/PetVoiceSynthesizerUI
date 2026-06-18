import { useState } from "react";

// ─── Audio Engine ────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;
function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playOsc(freq: number, type: OscillatorType, dur = 1.2, vol = 0.35, attack = 0.01, vib = 0) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (vib > 0) {
    const vibOsc = ctx.createOscillator();
    const vibGain = ctx.createGain();
    vibOsc.frequency.value = 5.5;
    vibGain.gain.value = vib;
    vibOsc.connect(vibGain);
    vibGain.connect(osc.frequency);
    vibOsc.start(ctx.currentTime);
    vibOsc.stop(ctx.currentTime + dur);
  }
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + dur);
}

function playNoise(dur = 0.18, vol = 0.4, highpass = 1200) {
  const ctx = getCtx();
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = "highpass";
  filt.frequency.value = highpass;
  const gain = ctx.createGain();
  src.connect(filt);
  filt.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  src.start();
  src.stop(ctx.currentTime + dur);
}

function piano(f: number)   { playOsc(f, "sine", 1.6, 0.4, 0.005); }
function guitar(f: number)  { playOsc(f, "triangle", 1.4, 0.45, 0.003); }
function trumpet(f: number) { playOsc(f, "sawtooth", 0.9, 0.35, 0.05, 8); }
function sax(f: number)     { playOsc(f, "sawtooth", 1.1, 0.38, 0.08, 5); }
function violin(f: number)  { playOsc(f, "sawtooth", 1.8, 0.3, 0.18, 14); }
function marimba(f: number) { playOsc(f, "sine", 0.7, 0.5, 0.002); }
function accordion(f: number) { playOsc(f, "square", 1.0, 0.28, 0.04, 6); }

function kick() {
  const ctx = getCtx();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = "sine";
  o.frequency.setValueAtTime(160, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.35);
  g.gain.setValueAtTime(0.9, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
  o.start(); o.stop(ctx.currentTime + 0.45);
}
function snare()    { playNoise(0.18, 0.5, 1200); }
function hihat()    { playNoise(0.08, 0.28, 8000); }
function tom(f: number) {
  const ctx = getCtx();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = "sine";
  o.frequency.setValueAtTime(f, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(f * 0.6, ctx.currentTime + 0.25);
  g.gain.setValueAtTime(0.7, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  o.start(); o.stop(ctx.currentTime + 0.35);
}

function guitarChord(freqs: number[]) {
  freqs.forEach((f, i) => setTimeout(() => guitar(f), i * 28));
}

// ─── Note tables ─────────────────────────────────────────────────────────────
const NOTES_C4 = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25];
const NOTE_NAMES = ["C", "D", "E", "F", "G", "A", "B", "C²"];
const BLACK = [
  { after: 0, freq: 277.18, name: "C#", color: "#4A3060" },
  { after: 1, freq: 311.13, name: "D#", color: "#3A5040" },
  { after: 3, freq: 369.99, name: "F#", color: "#504A20" },
  { after: 4, freq: 415.30, name: "G#", color: "#204050" },
  { after: 5, freq: 466.16, name: "A#", color: "#502040" },
];
const KEY_COLORS = ["#FFF0F5","#F0FFF4","#FFF8F0","#FFFFF0","#F0F8FF","#FFF5F0","#F5F0FF","#F0FFF8"];

const GUITAR_CHORDS: Record<string, number[]> = {
  "C":  [261.63, 329.63, 392, 523.25, 659.25],
  "G":  [196, 246.94, 293.66, 392, 493.88, 659.25],
  "Am": [220, 261.63, 329.63, 440, 523.25],
  "F":  [174.61, 220, 261.63, 349.23, 440],
  "Em": [164.81, 196, 246.94, 329.63, 392, 493.88],
  "D":  [293.66, 369.99, 440, 587.33],
  "Dm": [293.66, 349.23, 440, 587.33],
  "A":  [220, 277.18, 329.63, 440, 554.37],
};
const GUITAR_STRINGS = [
  { name: "E²", freq: 329.63 }, { name: "B", freq: 246.94 },
  { name: "G", freq: 196 },    { name: "D", freq: 146.83 },
  { name: "A", freq: 110 },    { name: "E", freq: 82.41 },
];

const TRUMPET_NOTES = [
  { label: "○○○", name: "Bb4", freq: 466.16 },
  { label: "●○○", name: "Ab4", freq: 415.3 },
  { label: "○●○", name: "Bb4♭", freq: 440 },
  { label: "○○●", name: "F4♯", freq: 392 },
  { label: "●●○", name: "G4", freq: 349.23 },
  { label: "●○●", name: "F4", freq: 329.63 },
  { label: "○●●", name: "Eb4", freq: 311.13 },
  { label: "●●●", name: "D4", freq: 293.66 },
];

const SAX_KEYS = [
  { name: "Low B", freq: 123.47 }, { name: "C", freq: 130.81 },
  { name: "D", freq: 146.83 },    { name: "E", freq: 164.81 },
  { name: "F", freq: 174.61 },    { name: "G", freq: 196 },
  { name: "A", freq: 220 },       { name: "B", freq: 246.94 },
  { name: "C²", freq: 261.63 },   { name: "D²", freq: 293.66 },
  { name: "E²", freq: 329.63 },   { name: "F²", freq: 349.23 },
];
const SAX_COLORS = ["#F9C4D0","#B8D8F0","#A8D8B0","#C8B8E8","#F5E4A0","#F0B870","#F4C2E8","#B8E0E8","#F9C4D0","#B8D8F0","#A8D8B0","#F5E4A0"];

const VIOLIN_STRINGS = [
  { name: "G", freq: 196, color: "#A8D8B0" },
  { name: "D", freq: 293.66, color: "#F5E4A0" },
  { name: "A", freq: 440, color: "#F9C4D0" },
  { name: "E", freq: 659.25, color: "#C8B8E8" },
];

const MARIMBA_NOTES = [
  { name: "C", freq: 261.63, color: "#F9C4D0", h: 90 },
  { name: "D", freq: 293.66, color: "#B8D8F0", h: 86 },
  { name: "E", freq: 329.63, color: "#A8D8B0", h: 82 },
  { name: "F", freq: 349.23, color: "#C8B8E8", h: 78 },
  { name: "G", freq: 392,    color: "#F5E4A0", h: 74 },
  { name: "A", freq: 440,    color: "#F0B870", h: 70 },
  { name: "B", freq: 493.88, color: "#F4C2E8", h: 66 },
  { name: "C²", freq: 523.25, color: "#B8E0E8", h: 62 },
];

const ACCORDION_BASS = [
  { name: "C", freq: 65.41 }, { name: "F", freq: 87.31 },
  { name: "G", freq: 98 },    { name: "Am", freq: 110 },
  { name: "D", freq: 73.42 }, { name: "E", freq: 82.41 },
];
const ACCORDION_TREBLE = [
  { name: "C", freq: 261.63 }, { name: "D", freq: 293.66 }, { name: "E", freq: 329.63 },
  { name: "F", freq: 349.23 }, { name: "G", freq: 392 },    { name: "A", freq: 440 },
  { name: "B", freq: 493.88 }, { name: "C²", freq: 523.25 }, { name: "D²", freq: 587.33 },
  { name: "E²", freq: 659.25 }, { name: "F²", freq: 698.46 }, { name: "G²", freq: 783.99 },
];

// ─── Instruments list ─────────────────────────────────────────────────────────
const INSTRUMENTS = [
  { id: "piano",     label: "Piano",    emoji: "🎹", color: "#F9C4D0" },
  { id: "guitar",    label: "Guitarra", emoji: "🎸", color: "#FAEAA0" },
  { id: "trumpet",   label: "Trompeta", emoji: "🎺", color: "#F0B870" },
  { id: "saxophone", label: "Saxofón",  emoji: "🎷", color: "#C8B8E8" },
  { id: "violin",    label: "Violín",   emoji: "🎻", color: "#B8D8F0" },
  { id: "drums",     label: "Batería",  emoji: "🥁", color: "#A8D8B0" },
  { id: "accordion", label: "Acordeón", emoji: "🪗", color: "#F4C2E8" },
  { id: "marimba",   label: "Marimba",  emoji: "🎵", color: "#B8E0E8" },
];

// ─── Reusable pressed hook ────────────────────────────────────────────────────
function usePressed() {
  const [pressed, setPressed] = useState<string | null>(null);
  const press = (key: string, fn: () => void) => {
    fn();
    setPressed(key);
    setTimeout(() => setPressed(null), 180);
  };
  return { pressed, press };
}

// ─── Embroidery Hoop ─────────────────────────────────────────────────────────
function EmbroideryHoop({ dataUrl }: { dataUrl: string | null }) {
  const R = 128, cx = 148, cy = 148;
  const n = 52;
  const stitches = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return {
      x1: cx + (R - 20) * Math.cos(a), y1: cy + (R - 20) * Math.sin(a),
      x2: cx + (R - 7)  * Math.cos(a), y2: cy + (R - 7)  * Math.sin(a),
    };
  });
  return (
    <svg width="296" height="296" viewBox="0 0 296 296">
      <defs>
        <clipPath id="hc"><circle cx={cx} cy={cy} r={R - 24} /></clipPath>
        <radialGradient id="wood" cx="38%" cy="32%">
          <stop offset="0%" stopColor="#D4A56A" />
          <stop offset="100%" stopColor="#8B5E2A" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="url(#wood)" />
      <circle cx={cx} cy={cy} r={R - 11} fill="#F2EAD8" />
      {dataUrl ? (
        <image href={dataUrl} x={cx-(R-24)} y={cy-(R-24)} width={(R-24)*2} height={(R-24)*2} clipPath="url(#hc)" />
      ) : (
        <>
          <circle cx={cx} cy={cy} r={R-24} fill="#FDF6E8" />
          <text x={cx} y={cy-8} textAnchor="middle" fontSize="22" fontFamily="Caveat,cursive" fill="#C4975A">¡Dibuja primero!</text>
          <text x={cx} y={cy+22} textAnchor="middle" fontSize="20" fontFamily="Caveat,cursive" fill="#C4975A">🎨</text>
        </>
      )}
      {stitches.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#8B6B4A" strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
      ))}
      <circle cx={cx} cy={cy} r={R-24} fill="none" stroke="#C4975A" strokeWidth="1.5" strokeDasharray="4 3" opacity={0.4} />
      <rect x={cx-13} y={6} width={26} height={16} rx={5} fill="url(#wood)" />
      <rect x={cx-7} y={8} width={14} height={12} rx={3} fill="#C4975A" />
    </svg>
  );
}

// ─── Instrument circle button ─────────────────────────────────────────────────
function InstrumentBtn({ inst, active, onClick, style }: {
  inst: typeof INSTRUMENTS[0]; active: boolean; onClick: () => void; style: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute",
        width: "72px", height: "72px",
        borderRadius: "50%",
        background: active
          ? `radial-gradient(circle at 38% 35%, white 0%, ${inst.color} 70%)`
          : `radial-gradient(circle at 38% 35%, white 0%, ${inst.color}CC 80%)`,
        border: active ? "3px solid #3D2B1F" : "2.5px dashed #8B6B4A",
        boxShadow: active
          ? `0 0 0 3px rgba(61,43,31,0.35), 4px 4px 0 #8B6B4A`
          : `3px 3px 0 rgba(139,107,74,0.4)`,
        cursor: "pointer",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "1px",
        transform: active ? "scale(1.12)" : "scale(1)",
        transition: "transform 0.15s, box-shadow 0.15s",
        fontFamily: "'Caveat', cursive",
        ...style,
      }}
    >
      <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>{inst.emoji}</span>
      <span style={{ fontSize: "0.62rem", color: "#3D2B1F", fontWeight: 700 }}>{inst.label}</span>
    </button>
  );
}

// ─── Panel: Piano ─────────────────────────────────────────────────────────────
function PianoPanel() {
  const { pressed, press } = usePressed();
  const W = 56;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "1.1rem", color: "#7A5C44" }}>🎹 ¡Toca las teclas! ✨</span>
      <div style={{ position: "relative", height: "110px", width: `${NOTES_C4.length*(W+4)+4}px`, background: "#FFFBF2", border: "2.5px dashed #8B6B4A", borderRadius: "8px", padding: "4px", boxShadow: "4px 4px 0 #C4975A" }}>
        {NOTES_C4.map((freq, i) => (
          <button key={NOTE_NAMES[i]}
            onMouseDown={() => press(NOTE_NAMES[i], () => piano(freq))}
            onTouchStart={() => press(NOTE_NAMES[i], () => piano(freq))}
            style={{
              position: "absolute", left: `${i*(W+4)+4}px`, top: "4px",
              width: `${W}px`, height: "94px",
              background: pressed === NOTE_NAMES[i] ? "#E8D8C0" : KEY_COLORS[i],
              border: "2px dashed #C4975A", borderRadius: "4px", cursor: "pointer",
              transform: pressed === NOTE_NAMES[i] ? "scaleY(0.95) translateY(3px)" : "none",
              transition: "transform 0.08s",
              backgroundImage: "repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(139,107,74,0.04) 4px,rgba(139,107,74,0.04) 6px)",
              display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "6px", zIndex: 1,
            }}>
            <span style={{ fontSize: "0.85rem", color: "#8B6B4A", fontFamily: "'Caveat',cursive" }}>{NOTE_NAMES[i]}</span>
          </button>
        ))}
        {BLACK.map(b => (
          <button key={b.name}
            onMouseDown={() => press(b.name, () => piano(b.freq))}
            onTouchStart={() => press(b.name, () => piano(b.freq))}
            style={{
              position: "absolute",
              left: `${b.after*(W+4)+W-12+4}px`, top: "4px",
              width: "26px", height: "60px",
              background: pressed === b.name ? `${b.color}BB` : b.color,
              border: "1.5px dashed rgba(255,255,255,0.25)", borderRadius: "0 0 4px 4px",
              cursor: "pointer", zIndex: 2,
              transform: pressed === b.name ? "scaleY(0.95) translateY(2px)" : "none",
              transition: "transform 0.08s",
              boxShadow: "2px 4px 8px rgba(0,0,0,0.3)",
            }} />
        ))}
      </div>
    </div>
  );
}

// ─── Panel: Guitar ────────────────────────────────────────────────────────────
function GuitarPanel() {
  const { pressed, press } = usePressed();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
      <span style={{ fontSize: "1.1rem", color: "#7A5C44" }}>🎸 Cuerdas & Acordes 🌟</span>
      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
        {/* Strings */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "#FFFBF2", padding: "10px 14px", border: "2.5px dashed #8B6B4A", borderRadius: "12px", boxShadow: "3px 3px 0 #C4975A" }}>
          <span style={{ fontSize: "0.9rem", color: "#7A5C44", textAlign: "center" }}>Cuerdas sueltas</span>
          {GUITAR_STRINGS.map((s) => (
            <button key={s.name}
              onMouseDown={() => press(s.name, () => guitar(s.freq))}
              style={{
                height: "18px", width: "180px", borderRadius: "50px", cursor: "pointer",
                background: pressed === s.name ? "#A8D8B0" : "#F2EAD8",
                border: "none",
                boxShadow: pressed === s.name ? "inset 0 1px 4px rgba(0,0,0,0.3)" : "0 2px 0 #C4975A, inset 0 0 0 1px #C4975A",
                transition: "all 0.08s",
                display: "flex", alignItems: "center", paddingLeft: "10px", gap: "8px",
                fontFamily: "'Caveat',cursive",
              }}>
              <div style={{ height: "2px", flex: 1, background: pressed === s.name ? "#1E4D2B" : "#8B6B4A", borderRadius: "1px" }} />
              <span style={{ fontSize: "0.8rem", color: "#7A5C44", minWidth: "28px" }}>{s.name}</span>
            </button>
          ))}
        </div>
        {/* Chords */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "#FFFBF2", padding: "10px 14px", border: "2.5px dashed #8B6B4A", borderRadius: "12px", boxShadow: "3px 3px 0 #C4975A" }}>
          <span style={{ fontSize: "0.9rem", color: "#7A5C44", textAlign: "center" }}>Acordes</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            {Object.entries(GUITAR_CHORDS).map(([name, freqs]) => (
              <button key={name}
                onMouseDown={() => press(name, () => guitarChord(freqs))}
                style={{
                  padding: "8px 14px", borderRadius: "50px", cursor: "pointer",
                  background: pressed === name ? "#A8D8B0" : "#F9C4D0",
                  border: pressed === name ? "2px solid #1E4D2B" : "2px dashed #8B6B4A",
                  fontFamily: "'Caveat',cursive", fontSize: "1.1rem", color: "#3D2B1F", fontWeight: 700,
                  boxShadow: pressed === name ? "none" : "2px 2px 0 #C4975A",
                  transform: pressed === name ? "translate(2px,2px)" : "none",
                  transition: "all 0.08s",
                }}>
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Panel: Trumpet ──────────────────────────────────────────────────────────
function TrumpetPanel() {
  const { pressed, press } = usePressed();
  const VALVE_COLORS = ["#F9C4D0","#FAEAA0","#A8D8B0","#C8B8E8","#F0B870","#B8D8F0","#F4C2E8","#B8E0E8"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
      <span style={{ fontSize: "1.1rem", color: "#7A5C44" }}>🎺 Combinaciones de válvulas ✨</span>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        {/* Valve guide */}
        <div style={{ background: "#FFFBF2", padding: "8px 12px", border: "2px dashed #8B6B4A", borderRadius: "12px", boxShadow: "3px 3px 0 #C4975A" }}>
          <div style={{ display: "flex", gap: "10px", marginBottom: "8px", justifyContent: "center" }}>
            {["I","II","III"].map(v => (
              <div key={v} style={{ width: "38px", height: "52px", borderRadius: "50% 50% 40% 40%", background: "linear-gradient(to bottom, #D4A56A, #8B5E2A)", border: "2px solid #6B4020", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "0.85rem", color: "#FFFDF6", fontFamily: "'Caveat',cursive", fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
          <span style={{ fontSize: "0.8rem", color: "#7A5C44", display: "block", textAlign: "center" }}>Válvulas 🎺</span>
        </div>
        {/* Note buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" }}>
          {TRUMPET_NOTES.map((n, i) => (
            <button key={n.name}
              onMouseDown={() => press(n.name, () => trumpet(n.freq))}
              style={{
                padding: "8px 12px", borderRadius: "12px", cursor: "pointer",
                background: pressed === n.name ? "#A8D8B0" : VALVE_COLORS[i],
                border: pressed === n.name ? "2px solid #1E4D2B" : "2px dashed #8B6B4A",
                fontFamily: "'Caveat',cursive", textAlign: "center",
                boxShadow: pressed === n.name ? "none" : "2px 2px 0 #C4975A",
                transform: pressed === n.name ? "translate(2px,2px)" : "none",
                transition: "all 0.08s",
              }}>
              <div style={{ fontSize: "0.75rem", color: "#8B6B4A" }}>{n.label}</div>
              <div style={{ fontSize: "1rem", color: "#3D2B1F", fontWeight: 700 }}>{n.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Panel: Saxophone ────────────────────────────────────────────────────────
function SaxPanel() {
  const { pressed, press } = usePressed();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
      <span style={{ fontSize: "1.1rem", color: "#7A5C44" }}>🎷 Llaves del saxofón 🌸</span>
      <div style={{ background: "#FFFBF2", padding: "12px 16px", border: "2.5px dashed #8B6B4A", borderRadius: "16px", boxShadow: "4px 4px 0 #C4975A" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "8px" }}>
          {SAX_KEYS.map((k, i) => (
            <button key={k.name}
              onMouseDown={() => press(k.name, () => sax(k.freq))}
              style={{
                width: "46px", height: "46px", borderRadius: "50%", cursor: "pointer",
                background: pressed === k.name
                  ? `radial-gradient(circle at 38% 35%, white, ${SAX_COLORS[i]})`
                  : `radial-gradient(circle at 38% 35%, white 0%, ${SAX_COLORS[i]}CC 80%)`,
                border: pressed === k.name ? "2.5px solid #3D2B1F" : "2px dashed #8B6B4A",
                fontFamily: "'Caveat',cursive", fontSize: "0.72rem", color: "#3D2B1F", fontWeight: 700,
                boxShadow: pressed === k.name ? "none" : "2px 2px 0 rgba(139,107,74,0.5)",
                transform: pressed === k.name ? "scale(0.9)" : "scale(1)",
                transition: "all 0.1s",
              }}>
              {k.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Panel: Violin ────────────────────────────────────────────────────────────
function ViolinPanel() {
  const { pressed, press } = usePressed();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
      <span style={{ fontSize: "1.1rem", color: "#7A5C44" }}>🎻 Desliza para tocar 💫</span>
      <div style={{ display: "flex", gap: "14px", alignItems: "center", background: "#FFFBF2", padding: "14px 20px", border: "2.5px dashed #8B6B4A", borderRadius: "16px", boxShadow: "4px 4px 0 #C4975A" }}>
        {VIOLIN_STRINGS.map((s) => (
          <div key={s.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.9rem", color: "#7A5C44", fontFamily: "'Caveat',cursive" }}>{s.name}</span>
            <button
              onMouseDown={() => press(s.name, () => violin(s.freq))}
              style={{
                width: "28px", height: "100px", borderRadius: "14px",
                background: pressed === s.name
                  ? `linear-gradient(to bottom, white, ${s.color})`
                  : `linear-gradient(to bottom, ${s.color}80, ${s.color})`,
                border: pressed === s.name ? "2.5px solid #3D2B1F" : "2px dashed #8B6B4A",
                cursor: "ns-resize", position: "relative",
                boxShadow: pressed === s.name ? "0 0 12px " + s.color : `2px 2px 0 rgba(139,107,74,0.4)`,
                transition: "all 0.1s",
              }}>
              {/* string line */}
              <div style={{ position: "absolute", left: "50%", top: "8px", bottom: "8px", width: "2px", background: "#8B6B4A", transform: "translateX(-50%)", borderRadius: "1px" }} />
            </button>
          </div>
        ))}
        <div style={{ fontSize: "2.5rem", opacity: 0.6 }}>🎻</div>
      </div>
    </div>
  );
}

// ─── Panel: Drums ─────────────────────────────────────────────────────────────
function DrumsPanel() {
  const { pressed, press } = usePressed();
  const PADS = [
    { id: "crash", label: "Crash", fn: () => playNoise(0.35, 0.35, 3000), color: "#F5E4A0", w: 70, h: 14 },
    { id: "hihat", label: "Hi-hat", fn: hihat, color: "#F9C4D0", w: 56, h: 14 },
    { id: "ride",  label: "Ride",  fn: () => playNoise(0.4, 0.28, 5000), color: "#C8B8E8", w: 60, h: 14 },
    { id: "tom1",  label: "Tom 1", fn: () => tom(220), color: "#F4C2E8", w: 62, h: 50 },
    { id: "tom2",  label: "Tom 2", fn: () => tom(160), color: "#B8D8F0", w: 68, h: 54 },
    { id: "snare", label: "Snare", fn: snare, color: "#F9C4D0", w: 76, h: 60 },
    { id: "kick",  label: "Kick",  fn: kick,  color: "#A8D8B0", w: 100, h: 80 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
      <span style={{ fontSize: "1.1rem", color: "#7A5C44" }}>🥁 Kit de batería 💥</span>
      <div style={{ background: "#FFFBF2", padding: "12px 16px", border: "2.5px dashed #8B6B4A", borderRadius: "16px", boxShadow: "4px 4px 0 #C4975A" }}>
        {/* Cymbals row */}
        <div style={{ display: "flex", gap: "14px", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
          {PADS.slice(0, 3).map(p => (
            <button key={p.id}
              onMouseDown={() => press(p.id, p.fn)}
              style={{
                width: `${p.w}px`, height: `${p.h}px`, borderRadius: "50%", cursor: "pointer",
                background: pressed === p.id ? `radial-gradient(circle at 38% 35%, white, ${p.color})` : p.color,
                border: pressed === p.id ? "2px solid #3D2B1F" : "2px dashed #8B6B4A",
                fontFamily: "'Caveat',cursive", fontSize: "0.72rem", color: "#3D2B1F", fontWeight: 700,
                transform: pressed === p.id ? "scaleY(0.88)" : "none",
                transition: "all 0.07s", boxShadow: pressed === p.id ? "none" : "0 2px 0 #C4975A",
              }}>{p.label}</button>
          ))}
        </div>
        {/* Toms + snare row */}
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", justifyContent: "center", marginBottom: "10px" }}>
          {PADS.slice(3, 6).map(p => (
            <button key={p.id}
              onMouseDown={() => press(p.id, p.fn)}
              style={{
                width: `${p.w}px`, height: `${p.h}px`, borderRadius: "50%", cursor: "pointer",
                background: pressed === p.id ? `radial-gradient(circle at 38% 35%, white, ${p.color})` : p.color,
                border: pressed === p.id ? "2.5px solid #3D2B1F" : "2.5px dashed #8B6B4A",
                fontFamily: "'Caveat',cursive", fontSize: "0.8rem", color: "#3D2B1F", fontWeight: 700,
                transform: pressed === p.id ? "scale(0.92)" : "scale(1)",
                transition: "all 0.08s", boxShadow: pressed === p.id ? "none" : "3px 3px 0 #C4975A",
              }}>{p.label}</button>
          ))}
        </div>
        {/* Kick drum */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            onMouseDown={() => press("kick", kick)}
            style={{
              width: "100px", height: "80px", borderRadius: "50%", cursor: "pointer",
              background: pressed === "kick" ? `radial-gradient(circle at 38% 35%, white, #A8D8B0)` : "#A8D8B0",
              border: pressed === "kick" ? "3px solid #1E4D2B" : "3px dashed #8B6B4A",
              fontFamily: "'Caveat',cursive", fontSize: "1rem", color: "#1E4D2B", fontWeight: 700,
              transform: pressed === "kick" ? "scale(0.92)" : "scale(1)",
              transition: "all 0.08s", boxShadow: pressed === "kick" ? "none" : "4px 4px 0 #C4975A",
            }}>
            Kick 💥
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Panel: Accordion ────────────────────────────────────────────────────────
function AccordionPanel() {
  const { pressed, press } = usePressed();
  const BASS_COLORS = ["#F9C4D0","#FAEAA0","#A8D8B0","#C8B8E8","#F0B870","#B8D8F0"];
  const TREBLE_COLORS = ["#F9C4D0","#B8D8F0","#A8D8B0","#C8B8E8","#F5E4A0","#F0B870","#F4C2E8","#B8E0E8","#F9C4D0","#B8D8F0","#A8D8B0","#F5E4A0"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
      <span style={{ fontSize: "1.1rem", color: "#7A5C44" }}>🪗 Botones del acordeón 🌸</span>
      <div style={{ display: "flex", gap: "14px", alignItems: "stretch" }}>
        {/* Bass */}
        <div style={{ background: "#FFFBF2", padding: "10px 12px", border: "2.5px dashed #8B6B4A", borderRadius: "12px", boxShadow: "3px 3px 0 #C4975A", display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", color: "#7A5C44" }}>Bajos</span>
          {ACCORDION_BASS.map((b, i) => (
            <button key={b.name}
              onMouseDown={() => press("b"+b.name, () => accordion(b.freq))}
              style={{
                width: "48px", height: "40px", borderRadius: "50%", cursor: "pointer",
                background: pressed === "b"+b.name
                  ? `radial-gradient(circle at 38% 35%, white, ${BASS_COLORS[i]})`
                  : BASS_COLORS[i],
                border: pressed === "b"+b.name ? "2px solid #3D2B1F" : "2px dashed #8B6B4A",
                fontFamily: "'Caveat',cursive", fontSize: "0.85rem", color: "#3D2B1F", fontWeight: 700,
                boxShadow: pressed === "b"+b.name ? "none" : "2px 2px 0 rgba(139,107,74,0.4)",
                transform: pressed === "b"+b.name ? "scale(0.9)" : "scale(1)",
                transition: "all 0.1s",
              }}>{b.name}</button>
          ))}
        </div>
        {/* Treble */}
        <div style={{ background: "#FFFBF2", padding: "10px 12px", border: "2.5px dashed #8B6B4A", borderRadius: "12px", boxShadow: "3px 3px 0 #C4975A" }}>
          <span style={{ fontSize: "0.85rem", color: "#7A5C44", display: "block", textAlign: "center", marginBottom: "6px" }}>Agudos</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px" }}>
            {ACCORDION_TREBLE.map((t, i) => (
              <button key={t.name}
                onMouseDown={() => press("t"+t.name+i, () => accordion(t.freq))}
                style={{
                  width: "44px", height: "36px", borderRadius: "50%", cursor: "pointer",
                  background: pressed === "t"+t.name+i
                    ? `radial-gradient(circle at 38% 35%, white, ${TREBLE_COLORS[i%12]})`
                    : TREBLE_COLORS[i%12],
                  border: pressed === "t"+t.name+i ? "2px solid #3D2B1F" : "1.5px dashed #8B6B4A",
                  fontFamily: "'Caveat',cursive", fontSize: "0.72rem", color: "#3D2B1F", fontWeight: 700,
                  boxShadow: pressed === "t"+t.name+i ? "none" : "2px 2px 0 rgba(139,107,74,0.35)",
                  transform: pressed === "t"+t.name+i ? "scale(0.9)" : "scale(1)",
                  transition: "all 0.1s",
                }}>{t.name}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Panel: Marimba ──────────────────────────────────────────────────────────
function MarimbaPanel() {
  const { pressed, press } = usePressed();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
      <span style={{ fontSize: "1.1rem", color: "#7A5C44" }}>🎵 Marimba de tela ✂️</span>
      <div style={{ background: "#FFFBF2", padding: "14px 18px", border: "2.5px dashed #8B6B4A", borderRadius: "16px", boxShadow: "4px 4px 0 #C4975A", display: "flex", gap: "8px", alignItems: "flex-end" }}>
        {MARIMBA_NOTES.map((n) => (
          <button key={n.name}
            onMouseDown={() => press(n.name, () => marimba(n.freq))}
            style={{
              width: "52px", height: `${n.h}px`, borderRadius: "8px", cursor: "pointer",
              background: pressed === n.name
                ? `linear-gradient(to bottom, white, ${n.color})`
                : n.color,
              border: pressed === n.name ? "2.5px solid #3D2B1F" : "2px dashed #8B6B4A",
              fontFamily: "'Caveat',cursive", fontSize: "0.85rem", color: "#3D2B1F", fontWeight: 700,
              display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "6px",
              transform: pressed === n.name ? "scaleY(0.93) translateY(4px)" : "none",
              transition: "all 0.09s",
              boxShadow: pressed === n.name ? "none" : "3px 3px 0 rgba(139,107,74,0.4)",
              backgroundImage: `repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(139,107,74,0.06) 4px,rgba(139,107,74,0.06) 6px)`,
            }}>
            {n.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function PlayMode({ drawingDataUrl }: { drawingDataUrl: string | null }) {
  const [activeInst, setActiveInst] = useState(0);
  const inst = INSTRUMENTS[activeInst];

  function renderPanel() {
    switch (inst.id) {
      case "piano":     return <PianoPanel />;
      case "guitar":    return <GuitarPanel />;
      case "trumpet":   return <TrumpetPanel />;
      case "saxophone": return <SaxPanel />;
      case "violin":    return <ViolinPanel />;
      case "drums":     return <DrumsPanel />;
      case "accordion": return <AccordionPanel />;
      case "marimba":   return <MarimbaPanel />;
      default:          return <PianoPanel />;
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ fontFamily: "'Caveat', cursive" }}>
      {/* Top: Hoop + instrument rings */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", minHeight: 0 }}>
        {/* Title */}
        <div style={{
          position: "absolute", top: "10px", left: "50%", transform: "translateX(-50%)",
          background: `radial-gradient(circle at 38% 35%, white 0%, ${inst.color} 80%)`,
          borderRadius: "50px", padding: "5px 20px", border: "2.5px dashed #8B6B4A",
          boxShadow: "3px 3px 0 #C4975A", whiteSpace: "nowrap",
        }}>
          <span style={{ fontSize: "1.2rem", color: "#3D2B1F", fontWeight: 700 }}>
            {inst.emoji} Tocando: {inst.label} ✨
          </span>
        </div>

        {/* Central cluster: hoop + 8 buttons */}
        <div style={{ position: "relative", width: "330px", height: "330px", flexShrink: 0 }}>
          {/* Hoop centered */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>
            <EmbroideryHoop dataUrl={drawingDataUrl} />
          </div>
          {/* Instrument buttons in a circle */}
          {INSTRUMENTS.map((ins, i) => {
            const a = (i / INSTRUMENTS.length) * Math.PI * 2 - Math.PI / 2;
            const r = 150;
            const bx = 165 + r * Math.cos(a) - 36;
            const by = 165 + r * Math.sin(a) - 36;
            return (
              <InstrumentBtn
                key={ins.id}
                inst={ins}
                active={activeInst === i}
                onClick={() => setActiveInst(i)}
                style={{ left: `${bx}px`, top: `${by}px` }}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom: Instrument panel */}
      <div
        style={{
          background: "#EDE0C8",
          borderTop: "3px dashed #8B6B4A",
          padding: "14px 24px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          minHeight: "170px",
          position: "relative",
          backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(139,107,74,0.03) 3px,rgba(139,107,74,0.03) 4px),repeating-linear-gradient(90deg,transparent,transparent 3px,rgba(139,107,74,0.03) 3px,rgba(139,107,74,0.03) 4px)",
        }}
      >
        {renderPanel()}
        {/* corner sparkles */}
        <span style={{ position: "absolute", bottom: "10px", right: "16px", fontSize: "1.3rem", opacity: 0.5, transform: "rotate(12deg)" }}>✨</span>
        <span style={{ position: "absolute", bottom: "10px", left: "16px", fontSize: "1.1rem", opacity: 0.5, transform: "rotate(-8deg)" }}>🌸</span>
      </div>
    </div>
  );
}
