import { useState, useEffect, useCallback, useRef } from "react";
import { DrawMode } from "./DrawMode";
import { PlayMode } from "./PlayMode";
import type { MelodyNote } from "./PlayMode";

// ── Prompts ────────────────────────────────────────────────────────────────
// Seeded by day-of-year so the same prompt shows globally each day.
// Add/edit freely — just keep the array growing!
const PROMPTS = [
  "How does a Monday morning feel?",
  "Draw a thunderstorm",
  "Your favourite song, without words",
  "Draw something you dreamed last night",
  "What does happiness look like?",
  "Draw the city you live in",
  "A day at the beach",
  "Draw something tiny",
  "What does silence look like?",
  "Draw an emotion you felt today",
  "Your favourite season",
  "Something that makes you laugh",
  "Draw the colour of your mood",
  "A memory from childhood",
  "What does music look like?",
  "Draw something wild",
  "The feeling of flying",
  "Draw a secret",
  "Something you want to say but can't",
  "Draw the last thing you ate",
  "A place you want to visit",
  "Draw something round",
  "What does a hug feel like?",
  "Your perfect day",
  "Draw something that scares you",
  "The smell of rain",
  "Draw something fast",
  "A colour that doesn't exist",
  "Draw the future",
  "Something broken but beautiful",
  "Draw the ocean",
  "What does tired feel like?",
  "Draw a superpower",
  "Something you love but never say",
  "Draw the first thing you see when you close your eyes",
];

function getDailyPrompt(): { text: string; dateLabel: string; dayIndex: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const idx = dayOfYear % PROMPTS.length;
  const label = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return { text: PROMPTS[idx], dateLabel: label, dayIndex: dayOfYear };
}

function getStreakKey() { return "doodio_daily_streak"; }
function getLastPlayedKey() { return "doodio_daily_last"; }

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function loadStreak(): { count: number; lastDay: string } {
  try {
    const raw = localStorage.getItem(getStreakKey());
    if (raw) return JSON.parse(raw);
  } catch {}
  return { count: 0, lastDay: "" };
}

function saveStreak(count: number) {
  localStorage.setItem(getStreakKey(), JSON.stringify({ count, lastDay: getTodayString() }));
}

function updateStreak(): number {
  const { count, lastDay } = loadStreak();
  const today = getTodayString();
  if (lastDay === today) return count; // already played today
  const yesterday = (() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  })();
  const newCount = lastDay === yesterday ? count + 1 : 1;
  saveStreak(newCount);
  return newCount;
}

function hasPlayedToday(): boolean {
  try {
    const raw = localStorage.getItem(getLastPlayedKey());
    return raw === getTodayString();
  } catch { return false; }
}

function markPlayedToday() {
  try { localStorage.setItem(getLastPlayedKey(), getTodayString()); } catch {}
}

// ── Countdown to midnight ──────────────────────────────────────────────────
function useCountdown() {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);
  return timeLeft;
}

// ── Component ──────────────────────────────────────────────────────────────
interface DailyModeProps {
  onMelodyReady?: (notes: MelodyNote[]) => void;
}

type DailyScreen = "prompt" | "draw" | "listen" | "done";

export function DailyMode({ onMelodyReady }: DailyModeProps) {
  const { text: promptText, dateLabel, dayIndex } = getDailyPrompt();
  const timeLeft = useCountdown();

  const [phase, setPhase] = useState<DailyScreen>(
    hasPlayedToday() ? "done" : "prompt"
  );
  const [drawingDataUrl, setDrawingDataUrl] = useState<string | null>(null);
  const [melody, setMelody] = useState<MelodyNote[]>([]);
  const [streak, setStreak] = useState(loadStreak().count);
  const [showConfetti, setShowConfetti] = useState(false);

  const stopRef = useRef<(() => void) | null>(null);

  const handleDrawSave = useCallback((url: string) => {
    setDrawingDataUrl(url);
  }, []);

  const handleMelodyReady = useCallback((notes: MelodyNote[]) => {
    setMelody(notes);
    onMelodyReady?.(notes);
  }, [onMelodyReady]);

  const handleDone = () => {
    stopRef.current?.();
    markPlayedToday();
    const newStreak = updateStreak();
    setStreak(newStreak);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
    setPhase("done");
  };

  // ── PROMPT SCREEN ────────────────────────────────────────────────────────
  if (phase === "prompt") {
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#FFE033", fontFamily:"'Chewy',cursive" }}>
        {/* Header */}
        <div style={{ background:"#FF8C42", borderBottom:"3px solid #1A1A1A", padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:"1.1rem", color:"#1A1A1A" }}>🎯 Doodio Daily</div>
            <div style={{ fontSize:"0.7rem", color:"#1A1A1A", opacity:0.7 }}>{dateLabel}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:"0.65rem", color:"#1A1A1A", opacity:0.6 }}>New prompt in</div>
            <div style={{ fontSize:"0.9rem", color:"#1A1A1A", fontVariantNumeric:"tabular-nums" }}>{timeLeft}</div>
          </div>
        </div>

        {/* Prompt card */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px 20px", gap:"24px" }}>
          <div style={{ fontSize:"0.8rem", color:"#5A3A00", letterSpacing:"0.1em", textTransform:"uppercase" }}>Today's prompt</div>

          <div style={{ background:"#FFFBF2", border:"4px solid #1A1A1A", borderRadius:"20px", padding:"28px 32px", boxShadow:"6px 6px 0 #1A1A1A", maxWidth:"340px", textAlign:"center" }}>
            <div style={{ fontSize:"2.5rem", marginBottom:"10px" }}>✏️</div>
            <div style={{ fontSize:"1.4rem", color:"#1A1A1A", lineHeight:1.3 }}>
              &ldquo;{promptText}&rdquo;
            </div>
          </div>

          {/* Streak badge */}
          {streak > 0 && (
            <div style={{ background:"#FF6B8A", border:"3px solid #1A1A1A", borderRadius:"50px", padding:"6px 18px", boxShadow:"3px 3px 0 #1A1A1A", display:"flex", alignItems:"center", gap:"6px" }}>
              <span style={{ fontSize:"1.1rem" }}>🔥</span>
              <span style={{ fontSize:"0.95rem", color:"#FFF" }}>{streak} day streak!</span>
            </div>
          )}

          <div style={{ fontSize:"0.75rem", color:"#5A3A00", opacity:0.7, textAlign:"center", maxWidth:280 }}>
            Draw your interpretation — no rules, no wrong answers.<br/>Your drawing becomes a unique melody. 🎵
          </div>

          <button
            onClick={() => setPhase("draw")}
            style={{ padding:"14px 40px", borderRadius:"50px", background:"#B8E04A", border:"4px solid #1A1A1A", cursor:"pointer", fontFamily:"'Chewy',cursive", fontSize:"1.2rem", color:"#1A1A1A", boxShadow:"5px 5px 0 #1A1A1A", touchAction:"manipulation" }}
            onMouseDown={e => { e.currentTarget.style.transform="translate(3px,3px)"; e.currentTarget.style.boxShadow="2px 2px 0 #1A1A1A"; }}
            onMouseUp={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="5px 5px 0 #1A1A1A"; }}>
            🎨 Start drawing!
          </button>
        </div>

        {/* Day counter */}
        <div style={{ padding:"8px", textAlign:"center", fontSize:"0.65rem", color:"#5A3A00", opacity:0.5 }}>Day #{dayIndex}</div>
      </div>
    );
  }

  // ── DRAW SCREEN ──────────────────────────────────────────────────────────
  if (phase === "draw") {
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Prompt banner */}
        <div style={{ flexShrink:0, background:"#FF8C42", borderBottom:"3px solid #1A1A1A", padding:"6px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
          <div style={{ fontSize:"0.8rem", color:"#1A1A1A", fontFamily:"'Chewy',cursive", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            ✏️ &ldquo;{promptText}&rdquo;
          </div>
          {drawingDataUrl && (
            <button
              onClick={() => setPhase("listen")}
              style={{ flexShrink:0, padding:"5px 14px", borderRadius:"50px", background:"#B8E04A", border:"2px solid #1A1A1A", cursor:"pointer", fontFamily:"'Chewy',cursive", fontSize:"0.8rem", color:"#1A1A1A", boxShadow:"2px 2px 0 #1A1A1A", touchAction:"manipulation" }}>
              🎵 Hear it!
            </button>
          )}
        </div>
        <DrawMode
          onSaveDrawing={handleDrawSave}
          onGoToListen={() => setPhase("listen")}
          hasDrawing={!!drawingDataUrl}
        />
      </div>
    );
  }

  // ── LISTEN SCREEN ────────────────────────────────────────────────────────
  if (phase === "listen") {
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Prompt banner */}
        <div style={{ flexShrink:0, background:"#FF8C42", borderBottom:"3px solid #1A1A1A", padding:"6px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
          <div style={{ fontSize:"0.8rem", color:"#1A1A1A", fontFamily:"'Chewy',cursive", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            🎵 &ldquo;{promptText}&rdquo;
          </div>
          <button
            onClick={() => setPhase("draw")}
            style={{ flexShrink:0, padding:"5px 14px", borderRadius:"50px", background:"#FFE033", border:"2px solid #1A1A1A", cursor:"pointer", fontFamily:"'Chewy',cursive", fontSize:"0.8rem", color:"#1A1A1A", boxShadow:"2px 2px 0 #1A1A1A", touchAction:"manipulation" }}>
            ← Draw more
          </button>
        </div>
        <PlayMode
          drawingDataUrl={drawingDataUrl}
          onMelodyReady={handleMelodyReady}
          onStopRef={stopRef}
        />
        {/* Submit button */}
        {melody.length > 0 && (
          <div style={{ flexShrink:0, background:"#FFFBF2", borderTop:"3px solid #1A1A1A", padding:"10px 16px" }}>
            <button
              onClick={handleDone}
              style={{ width:"100%", padding:"13px", borderRadius:"50px", background:"#FF8C42", border:"3px solid #1A1A1A", cursor:"pointer", fontFamily:"'Chewy',cursive", fontSize:"1rem", color:"#1A1A1A", boxShadow:"4px 4px 0 #1A1A1A", touchAction:"manipulation" }}
              onMouseDown={e => { e.currentTarget.style.transform="translate(2px,2px)"; e.currentTarget.style.boxShadow="2px 2px 0 #1A1A1A"; }}
              onMouseUp={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="4px 4px 0 #1A1A1A"; }}>
              ✅ Submit today's doodle!
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── DONE SCREEN ──────────────────────────────────────────────────────────
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#B8E04A", fontFamily:"'Chewy',cursive", padding:"24px", gap:"20px", overflow:"hidden" }}>

      {showConfetti && (
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:50, overflow:"hidden" }}>
          {Array.from({length:24}).map((_,i) => (
            <div key={i} style={{
              position:"absolute",
              left:`${Math.random()*100}%`,
              top:"-20px",
              width:"10px", height:"10px",
              borderRadius: i%2===0 ? "50%" : "2px",
              background: ["#FF6B8A","#FFE033","#5BC8F5","#C06BDB","#B8E04A","#FF8C42"][i%6],
              animation: `fall ${1.2+Math.random()*1.5}s linear ${Math.random()*0.8}s forwards`,
            }}/>
          ))}
          <style>{`@keyframes fall { to { transform: translateY(110vh) rotate(540deg); opacity:0; } }`}</style>
        </div>
      )}

      <div style={{ fontSize:"3rem" }}>🎉</div>

      <div style={{ background:"#FFFBF2", border:"4px solid #1A1A1A", borderRadius:"20px", padding:"24px 28px", boxShadow:"6px 6px 0 #1A1A1A", textAlign:"center", maxWidth:320 }}>
        <div style={{ fontSize:"1.3rem", color:"#1A1A1A", marginBottom:8 }}>Today's doodle done! ✅</div>
        <div style={{ fontSize:"0.82rem", color:"#555", marginBottom:16, lineHeight:1.5 }}>
          &ldquo;{promptText}&rdquo;
        </div>
        {drawingDataUrl && (
          <img src={drawingDataUrl} style={{ width:"100%", maxWidth:200, borderRadius:12, border:"3px solid #1A1A1A", boxShadow:"3px 3px 0 #1A1A1A" }} />
        )}
      </div>

      {/* Streak */}
      <div style={{ background:"#FF6B8A", border:"3px solid #1A1A1A", borderRadius:"50px", padding:"8px 24px", boxShadow:"4px 4px 0 #1A1A1A", display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:"1.4rem" }}>🔥</span>
        <div>
          <div style={{ fontSize:"1.1rem", color:"#FFF" }}>{streak} day streak!</div>
          <div style={{ fontSize:"0.65rem", color:"#FFE0E8" }}>Come back tomorrow for a new prompt</div>
        </div>
      </div>

      {/* Countdown */}
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:"0.7rem", color:"#1A1A1A", opacity:0.6 }}>Next prompt in</div>
        <div style={{ fontSize:"1.4rem", color:"#1A1A1A", fontVariantNumeric:"tabular-nums" }}>{timeLeft}</div>
      </div>
    </div>
  );
}
