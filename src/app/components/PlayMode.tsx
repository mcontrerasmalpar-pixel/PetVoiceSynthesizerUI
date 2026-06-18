import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────
// MELODY GENERATOR — derives a note sequence from the drawing
// ─────────────────────────────────────────────────────────────────

// Musical scales (relative semitones from root)
const SCALES: Record<string, number[]> = {
  major:      [0, 2, 4, 5, 7, 9, 11, 12],
  minor:      [0, 2, 3, 5, 7, 8, 10, 12],
  pentatonic: [0, 2, 4, 7, 9, 12, 14, 16],
  blues:      [0, 3, 5, 6, 7, 10, 12, 15],
  dorian:     [0, 2, 3, 5, 7, 9, 10, 12],
};

// Note roots in Hz (C4 = 261.63)
const ROOTS: Record<string, number> = {
  C: 261.63, D: 293.66, E: 329.63, F: 349.23,
  G: 392.00, A: 440.00, B: 493.88,
};

const ROOT_NAMES = Object.keys(ROOTS);
const SCALE_NAMES = Object.keys(SCALES);

export interface MelodyNote {
  freq:     number;
  duration: number; // seconds
  volume:   number; // 0–1
  rest:     boolean;
}

/** Analyze canvas pixels → derive melody */
export function generateMelody(dataUrl: string): Promise<MelodyNote[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const COLS = 16; // 16 time steps
      const ROWS = 8;  // 8 pitch slots
      const W = COLS * 4;
      const H = ROWS * 4;

      const cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      const ctx = cv.getContext("2d")!;
      ctx.drawImage(img, 0, 0, W, H);
      const { data } = ctx.getImageData(0, 0, W, H);

      // ─ 1. Determine scale & root from average hue ──────────────────────
      let hueSum = 0, inkCount = 0;
      let totalBrightness = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        if (a < 10) continue;
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        if (brightness > 0.94 && r > 238 && g > 232) continue; // skip background
        inkCount++;
        totalBrightness += brightness;
        // hue
        const rn = r/255, gn = g/255, bn = b/255;
        const max = Math.max(rn,gn,bn), min = Math.min(rn,gn,bn);
        if (max !== min) {
          let h = 0;
          const d = max - min;
          if (max === rn)      h = ((gn-bn)/d + (gn < bn ? 6:0)) / 6;
          else if (max === gn) h = ((bn-rn)/d + 2) / 6;
          else                 h = ((rn-gn)/d + 4) / 6;
          hueSum += h * 360;
        }
      }

      if (inkCount < 8) {
        // empty canvas — return a simple C-major arpeggio
        const scale = SCALES.major;
        const root  = ROOTS.C;
        resolve(scale.map(s => ({
          freq: root * Math.pow(2, s/12),
          duration: 0.4, volume: 0.4, rest: false,
        })));
        return;
      }

      const avgHue    = hueSum / inkCount;
      const avgBright = totalBrightness / inkCount;

      // Hue → root note (0°–360° mapped to 7 notes)
      const rootName  = ROOT_NAMES[Math.floor((avgHue / 360) * ROOT_NAMES.length) % ROOT_NAMES.length];
      const rootHz    = ROOTS[rootName];

      // Brightness → scale type
      const scaleName = avgBright > 0.6 ? "major"
                      : avgBright > 0.4 ? "pentatonic"
                      : avgBright > 0.25 ? "dorian"
                      : avgBright > 0.15 ? "minor"
                      : "blues";
      const scale = SCALES[scaleName];

      // ─ 2. Build 16-step grid from pixel columns ──────────────────────
      // For each column (time step), find the vertical centroid of ink pixels
      // → maps to a note in the scale (high row = high note)
      const notes: MelodyNote[] = [];

      for (let col = 0; col < COLS; col++) {
        const x0 = Math.floor((col / COLS) * W);
        const x1 = Math.floor(((col+1) / COLS) * W);

        let colInk = 0;
        let rowWeightSum = 0;
        let volSum = 0;

        for (let row = 0; row < ROWS; row++) {
          const y0 = Math.floor((row / ROWS) * H);
          const y1 = Math.floor(((row+1) / ROWS) * H);
          let cellInk = 0;

          for (let px = x0; px < x1; px++) {
            for (let py = y0; py < y1; py++) {
              const idx = (py * W + px) * 4;
              const r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
              if (a < 10) continue;
              const br = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
              if (br > 0.94 && r > 238 && g > 232) continue;
              cellInk++;
              volSum += 1 - br; // darker = louder
            }
          }

          if (cellInk > 0) {
            colInk += cellInk;
            // inverted row: row 0 (top) = high note
            rowWeightSum += (ROWS - 1 - row) * cellInk;
          }
        }

        if (colInk === 0) {
          notes.push({ freq: 0, duration: 0.25, volume: 0, rest: true });
        } else {
          const avgRow    = rowWeightSum / colInk;
          const noteIndex = Math.round((avgRow / (ROWS - 1)) * (scale.length - 1));
          const semitones = scale[Math.min(noteIndex, scale.length - 1)];
          const freq      = rootHz * Math.pow(2, semitones / 12);
          const volume    = Math.min(0.7, 0.25 + (volSum / colInk) * 0.8);
          const density   = colInk / ((x1 - x0) * H);
          const duration  = density > 0.3 ? 0.5 : 0.3;

          notes.push({ freq, duration, volume, rest: false });
        }
      }

      resolve(notes);
    };
    img.src = dataUrl;
  });
}

// ─────────────────────────────────────────────────────────────────
// INSTRUMENT SYNTH ENGINE
// ─────────────────────────────────────────────────────────────────

let _ctx: AudioContext | null = null;
function getCtx() {
  if (!_ctx) _ctx = new AudioContext();
  return _ctx;
}

type InstrumentId = "piano" | "guitar" | "marimba" | "flute" | "bells" | "synthpad";

function playNote(freq: number, vol: number, dur: number, inst: InstrumentId, startTime: number) {
  const ctx = getCtx();
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.001, startTime);

  switch (inst) {
    case "piano": {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
      osc.start(startTime); osc.stop(startTime + dur);
      // add slight harmonic
      const osc2 = ctx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.value = freq * 2;
      const g2 = ctx.createGain(); g2.gain.value = 0.12;
      osc2.connect(g2); g2.connect(gain);
      osc2.start(startTime); osc2.stop(startTime + dur);
      break;
    }
    case "guitar": {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      const filt = ctx.createBiquadFilter();
      filt.type = "lowpass"; filt.frequency.value = 1800;
      osc.connect(filt); filt.connect(gain);
      gain.gain.linearRampToValueAtTime(vol * 0.9, startTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur * 0.8);
      osc.start(startTime); osc.stop(startTime + dur);
      break;
    }
    case "marimba": {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.55);
      osc.connect(gain); osc.start(startTime); osc.stop(startTime + 0.6);
      break;
    }
    case "flute": {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      // vibrato
      const vib = ctx.createOscillator(); vib.frequency.value = 5.5;
      const vibG = ctx.createGain(); vibG.gain.value = freq * 0.012;
      vib.connect(vibG); vibG.connect(osc.frequency);
      osc.connect(gain);
      gain.gain.linearRampToValueAtTime(vol * 0.7, startTime + 0.06);
      gain.gain.setValueAtTime(vol * 0.7, startTime + dur - 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
      vib.start(startTime); vib.stop(startTime + dur);
      osc.start(startTime); osc.stop(startTime + dur);
      break;
    }
    case "bells": {
      [1, 2.756, 5.404].forEach((ratio, i) => {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = freq * ratio;
        const g = ctx.createGain();
        g.gain.value = i === 0 ? vol : vol * 0.15;
        o.connect(g); g.connect(gain);
        o.start(startTime); o.stop(startTime + dur * 1.6);
      });
      gain.gain.linearRampToValueAtTime(1, startTime + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur * 1.6);
      break;
    }
    case "synthpad": {
      [1, 1.005, 0.5].forEach((ratio) => {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = freq * ratio;
        const filt = ctx.createBiquadFilter();
        filt.type = "lowpass"; filt.frequency.value = 900;
        o.connect(filt); filt.connect(gain);
        o.start(startTime); o.stop(startTime + dur + 0.3);
      });
      gain.gain.linearRampToValueAtTime(vol * 0.5, startTime + 0.12);
      gain.gain.setValueAtTime(vol * 0.5, startTime + dur - 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur + 0.3);
      break;
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// INSTRUMENT CONFIG
// ─────────────────────────────────────────────────────────────────

const INSTRUMENTS: { id: InstrumentId; label: string; emoji: string; bg: string }[] = [
  { id: "piano",    label: "Piano",     emoji: "🎩", bg: "#FF6B8A" },
  { id: "guitar",   label: "Guitarra",  emoji: "🎸", bg: "#FFE033" },
  { id: "marimba",  label: "Marimba",   emoji: "🎵", bg: "#B8E04A" },
  { id: "flute",    label: "Flauta",    emoji: "🎺", bg: "#5BC8F5" },
  { id: "bells",    label: "Campanas",  emoji: "🔔", bg: "#FFE033" },
  { id: "synthpad", label: "Synth Pad", emoji: "🌟", bg: "#C06BDB" },
];

// ─────────────────────────────────────────────────────────────────
// VISUALIZER — shows which note is playing in the grid
// ─────────────────────────────────────────────────────────────────

const NOTE_COLORS = [
  "#FF6B8A","#FF8C42","#FFE033","#B8E04A",
  "#5BC8F5","#5BAEFF","#C06BDB","#5FD49A",
];

function MelodyGrid({ notes, activeStep }: { notes: MelodyNote[]; activeStep: number }) {
  const ROWS = 8;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${notes.length}, 1fr)`,
      gridTemplateRows: `repeat(${ROWS}, 1fr)`,
      gap: "2px",
      width: "100%",
      height: "100%",
    }}>
      {Array.from({ length: ROWS }).map((_, row) =>
        notes.map((note, col) => {
          // Which row does this note's pitch land on?
          const noteRow = note.rest ? -1 : Math.round(
            (1 - (note.volume - 0.25) / 0.45) * (ROWS - 1)
          );
          const isActive = col === activeStep;
          const hasNote  = !note.rest && noteRow === row;

          return (
            <div
              key={`${row}-${col}`}
              style={{
                borderRadius: "4px",
                background:
                  isActive && hasNote ? NOTE_COLORS[row % NOTE_COLORS.length]
                  : isActive          ? "rgba(255,255,255,0.25)"
                  : hasNote           ? `${NOTE_COLORS[row % NOTE_COLORS.length]}99`
                  : "rgba(255,255,255,0.08)",
                border: hasNote ? "2px solid #1A1A1A" : "1px solid rgba(0,0,0,0.1)",
                transform: isActive && hasNote ? "scale(1.08)" : "none",
                transition: "all 0.08s",
              }}
            />
          );
        })
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

export function PlayMode({ drawingDataUrl }: { drawingDataUrl: string | null }) {
  const [melody,      setMelody]      = useState<MelodyNote[]>([]);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [activeStep,  setActiveStep]  = useState(-1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeInst,  setActiveInst]  = useState(0);
  const [tempo,       setTempo]       = useState(120); // BPM
  const [loop,        setLoop]        = useState(true);

  const stopRef      = useRef(false);
  const timeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Analyze drawing on mount / when drawing changes
  useEffect(() => {
    if (!drawingDataUrl) return;
    setIsAnalyzing(true);
    generateMelody(drawingDataUrl).then(notes => {
      setMelody(notes);
      setIsAnalyzing(false);
    });
  }, [drawingDataUrl]);

  const inst = INSTRUMENTS[activeInst];

  const stop = useCallback(() => {
    stopRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsPlaying(false);
    setActiveStep(-1);
  }, []);

  const play = useCallback(() => {
    if (!melody.length) return;
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();

    stopRef.current = false;
    setIsPlaying(true);

    const beatMs = (60 / tempo) * 1000; // ms per beat

    let step = 0;
    function tick() {
      if (stopRef.current) return;
      const note = melody[step];
      setActiveStep(step);

      if (!note.rest) {
        const now = ctx.currentTime;
        playNote(note.freq, note.volume, note.duration * (120 / tempo), inst.id, now);
      }

      step++;
      if (step >= melody.length) {
        if (loop) {
          step = 0;
          timeoutRef.current = setTimeout(tick, beatMs * 0.5);
        } else {
          setIsPlaying(false);
          setActiveStep(-1);
        }
        return;
      }

      timeoutRef.current = setTimeout(tick, beatMs * (note.rest ? 0.5 : note.duration * (120/tempo) * 1.05));
    }

    tick();
  }, [melody, tempo, inst, loop]);

  // Auto-play when melody is ready
  useEffect(() => {
    if (melody.length && !isPlaying) {
      // small delay so the UI settles first
      const t = setTimeout(() => play(), 400);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [melody]);

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{ fontFamily: "'Chewy', cursive", background: "#5BC8F5" }}
    >

      {/* ─ Top bar: pet + instruments ─ */}
      <div style={{
        background: "#5BC8F5",
        borderBottom: "3px solid #1A1A1A",
        padding: "10px 16px",
        display: "flex", alignItems: "center", gap: "14px",
        flexShrink: 0, flexWrap: "wrap",
      }}>
        {/* Pet thumbnail */}
        <div style={{
          width: "64px", height: "64px",
          background: "#FFFBF2",
          border: "3px solid #1A1A1A", borderRadius: "14px",
          overflow: "hidden", flexShrink: 0,
          boxShadow: "3px 3px 0 #1A1A1A",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {drawingDataUrl
            ? <img src={drawingDataUrl} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <span style={{ fontSize: "1.6rem" }}>🎨</span>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}>
          <span style={{ fontSize: "0.85rem", color: "#1A1A1A" }}>🎵 Melodía de tu mascota</span>
          {isAnalyzing && <span style={{ fontSize: "0.7rem", color: "#555" }}>⏳ Analizando dibujo...</span>}
          {!isAnalyzing && melody.length > 0 && (
            <span style={{ fontSize: "0.7rem", color: "#555" }}>
              {melody.filter(n => !n.rest).length} notas generadas
            </span>
          )}
        </div>

        {/* Instrument selector */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", flex: 1, justifyContent: "center" }}>
          {INSTRUMENTS.map((ins, i) => {
            const active = activeInst === i;
            return (
              <button key={ins.id} onClick={() => { stop(); setActiveInst(i); }} style={{
                padding: "7px 14px", borderRadius: "50px",
                background: active ? ins.bg : "#FFFBF2",
                border: active ? "4px solid #1A1A1A" : "3px solid #1A1A1A",
                cursor: "pointer", fontFamily: "'Chewy',cursive", fontSize: "0.9rem",
                color: "#1A1A1A",
                boxShadow: active ? "2px 2px 0 #1A1A1A" : "3px 3px 0 #1A1A1A",
                transform: active ? "translate(1px,1px)" : "none",
                transition: "all 0.1s",
                display: "flex", alignItems: "center", gap: "5px",
              }}>
                <span>{ins.emoji}</span><span>{ins.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─ Center: melody grid ─ */}
      <div style={{
        flex: 1, padding: "16px",
        display: "flex", flexDirection: "column", gap: "12px",
        overflow: "hidden",
      }}>
        <div style={{
          flex: 1,
          background: "rgba(0,0,0,0.15)",
          border: "3px solid #1A1A1A",
          borderRadius: "16px",
          padding: "12px",
          boxShadow: "4px 4px 0 #1A1A1A",
          overflow: "hidden",
        }}>
          {isAnalyzing ? (
            <div style={{
              height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: "10px",
            }}>
              <span style={{ fontSize: "2.5rem" }}>🔍</span>
              <span style={{ fontSize: "1rem", color: "#FFFBF2", fontFamily: "'Chewy',cursive" }}>
                Analizando tu dibujo...
              </span>
            </div>
          ) : melody.length > 0 ? (
            <MelodyGrid notes={melody} activeStep={activeStep} />
          ) : (
            <div style={{
              height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "#FFFBF2", fontFamily: "'Chewy',cursive" }}>Ve a Dibujar primero 🎨</span>
            </div>
          )}
        </div>
      </div>

      {/* ─ Bottom controls ─ */}
      <div style={{
        background: "#FFFBF2",
        borderTop: "3px solid #1A1A1A",
        padding: "10px 20px",
        display: "flex", alignItems: "center", gap: "16px",
        flexShrink: 0, flexWrap: "wrap",
        boxShadow: "0 -2px 0 #1A1A1A",
      }}>

        {/* Play / Stop */}
        <button
          onClick={isPlaying ? stop : play}
          disabled={!melody.length || isAnalyzing}
          style={{
            width: "56px", height: "56px", borderRadius: "50%",
            background: isPlaying ? "#FF6B8A" : "#B8E04A",
            border: "3px solid #1A1A1A",
            cursor: melody.length ? "pointer" : "not-allowed",
            fontSize: "1.6rem",
            boxShadow: "4px 4px 0 #1A1A1A",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.1s",
          }}
          onMouseDown={e => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = "2px 2px 0 #1A1A1A"; }}
          onMouseUp={e =>   { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "4px 4px 0 #1A1A1A"; }}
        >
          {isPlaying ? "⏹" : "▶️"}
        </button>

        {/* Tempo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "160px" }}>
          <span style={{ fontSize: "0.9rem", color: "#1A1A1A", flexShrink: 0 }}>Tempo</span>
          <input
            type="range" min={60} max={200} step={5}
            value={tempo}
            onChange={e => { stop(); setTempo(Number(e.target.value)); }}
            style={{ flex: 1, accentColor: inst.bg, cursor: "pointer" }}
          />
          <span style={{
            background: inst.bg, border: "2px solid #1A1A1A",
            borderRadius: "50px", padding: "2px 12px",
            fontSize: "0.9rem", color: "#1A1A1A", minWidth: "50px", textAlign: "center",
            flexShrink: 0,
          }}>{tempo}</span>
        </div>

        {/* Loop toggle */}
        <button
          onClick={() => setLoop(l => !l)}
          style={{
            padding: "8px 16px", borderRadius: "50px",
            background: loop ? inst.bg : "#FFFBF2",
            border: loop ? "4px solid #1A1A1A" : "3px solid #1A1A1A",
            cursor: "pointer", fontFamily: "'Chewy',cursive",
            fontSize: "0.9rem", color: "#1A1A1A",
            boxShadow: loop ? "2px 2px 0 #1A1A1A" : "3px 3px 0 #1A1A1A",
            transform: loop ? "translate(1px,1px)" : "none",
            transition: "all 0.1s",
            display: "flex", alignItems: "center", gap: "6px",
          }}
        >
          <span>🔁</span>
          <span>Loop {loop ? "ON" : "OFF"}</span>
        </button>

        {/* Instrument badge */}
        <div style={{
          background: inst.bg, border: "3px solid #1A1A1A",
          borderRadius: "50px", padding: "6px 16px",
          boxShadow: "3px 3px 0 #1A1A1A",
          display: "flex", alignItems: "center", gap: "6px",
        }}>
          <span style={{ fontSize: "1.2rem" }}>{inst.emoji}</span>
          <span style={{ fontSize: "0.9rem", color: "#1A1A1A" }}>{inst.label}</span>
        </div>
      </div>
    </div>
  );
}
