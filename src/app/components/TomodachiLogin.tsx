import { useState } from "react";

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes floatA {
    0%,100%{transform:translateY(0) rotate(0deg) scale(1)}
    50%{transform:translateY(-11px) rotate(8deg) scale(1.08)}
  }
  @keyframes floatB {
    0%,100%{transform:translateY(0) rotate(0deg)}
    50%{transform:translateY(-14px) rotate(-7deg)}
  }
  @keyframes floatC {
    0%,100%{transform:translateY(0)}
    33%{transform:translateY(-8px)}
    66%{transform:translateY(-4px)}
  }
  @keyframes cloudDrift {
    0%,100%{transform:translateX(0)}
    50%{transform:translateX(10px)}
  }
  @keyframes btnBounce {
    0%,100%{transform:scale(1)}
    50%{transform:scale(1.04)}
  }
  .tomo-input::placeholder{color:#B0A898;font-family:'Nunito',sans-serif;font-size:1rem}
  .tomo-input:focus{outline:none;border-color:#FF8C42!important;box-shadow:0 0 0 3px rgba(255,140,66,0.25)!important}
  .go-btn{transition:transform .12s ease,box-shadow .12s ease}
  .go-btn:hover{transform:scale(1.06)!important}
  .go-btn:active{transform:scale(0.93)!important}
  .first-link:hover{text-decoration:underline}
`;

// ─── Blob path (330×490 viewBox) ──────────────────────────────────────────────
const BLOB = `
  M 118 28
  Q 140 10 165 24
  Q 190 8 218 26
  Q 240 10 262 32
  Q 288 20 308 48
  Q 326 42 328 70
  Q 342 94 328 122
  Q 344 148 326 175
  Q 342 202 322 228
  Q 338 258 316 278
  Q 332 308 308 322
  Q 320 354 294 366
  Q 290 396 262 404
  Q 248 426 220 420
  Q 200 438 175 430
  Q 152 445 130 432
  Q 106 443 84 424
  Q 56 430 40 408
  Q 12 398 14 368
  Q -6 346 12 318
  Q -6 292 12 265
  Q -4 238 14 212
  Q -4 184 14 158
  Q 0 130 18 108
  Q 4 78 30 66
  Q 28 38 58 30
  Q 75 14 102 28
  Q 112 12 118 28 Z
`;

// ─── Letter colours (rainbow) ─────────────────────────────────────────────────
const RCOLS = ["#FF6B9D","#FF8C42","#4FC3F7","#B8E04A","#AB47BC","#FF4444"];

function RainbowTitle() {
  const lines = [["P","e","t"," ","V","o","i","c","e"], ["S","y","n","t","h","e","s","i","z","e","r"]];
  let ci = 0;
  return (
    <div style={{ textAlign: "center", lineHeight: 1.15, marginBottom: "4px" }}>
      {lines.map((chars, li) => (
        <div key={li} style={{ display: "block", whiteSpace: "nowrap" }}>
          {chars.map((ch, idx) => {
            if (ch === " ") return <span key={idx}>&nbsp;</span>;
            const col = RCOLS[(ci++) % RCOLS.length];
            return (
              <span
                key={idx}
                style={{
                  fontFamily: "'Chewy', cursive",
                  fontSize: li === 0 ? "2.5rem" : "2.1rem",
                  color: col,
                  WebkitTextStroke: "2px #1A1A1A",
                  display: "inline-block",
                  letterSpacing: "0.5px",
                  lineHeight: 1,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Pixel-art Dog ────────────────────────────────────────────────────────────
function Dog() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      {/* ears */}
      <ellipse cx="14" cy="22" rx="11" ry="13" fill="#B5722A" stroke="#1A1A1A" strokeWidth="2.5"/>
      <ellipse cx="50" cy="22" rx="11" ry="13" fill="#B5722A" stroke="#1A1A1A" strokeWidth="2.5"/>
      <ellipse cx="14" cy="24" rx="7" ry="9"  fill="#C8863C"/>
      <ellipse cx="50" cy="24" rx="7" ry="9"  fill="#C8863C"/>
      {/* head */}
      <ellipse cx="32" cy="36" rx="24" ry="22" fill="#E8A850" stroke="#1A1A1A" strokeWidth="2.5"/>
      {/* eyes */}
      <circle cx="23" cy="31" r="5"   fill="#1A1A1A"/>
      <circle cx="41" cy="31" r="5"   fill="#1A1A1A"/>
      <circle cx="24.5" cy="29.5" r="2" fill="white"/>
      <circle cx="42.5" cy="29.5" r="2" fill="white"/>
      {/* muzzle */}
      <ellipse cx="32" cy="42" rx="10" ry="7" fill="#D49040"/>
      {/* nose */}
      <ellipse cx="32" cy="38" rx="5" ry="4"  fill="#1A1A1A"/>
      <ellipse cx="31" cy="37" rx="2" ry="1.5" fill="rgba(255,255,255,0.35)"/>
      {/* mouth */}
      <path d="M 25 45 Q 32 52 39 45" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round"/>
      {/* blush */}
      <ellipse cx="14" cy="42" rx="5.5" ry="3.5" fill="#FFB8B8" opacity="0.7"/>
      <ellipse cx="50" cy="42" rx="5.5" ry="3.5" fill="#FFB8B8" opacity="0.7"/>
    </svg>
  );
}

// ─── Pixel-art Cat ────────────────────────────────────────────────────────────
function Cat() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      {/* ears */}
      <polygon points="12,30 20,8 30,30"  fill="#E0E0E0" stroke="#1A1A1A" strokeWidth="2.5" strokeLinejoin="round"/>
      <polygon points="34,30 44,8 52,30"  fill="#E0E0E0" stroke="#1A1A1A" strokeWidth="2.5" strokeLinejoin="round"/>
      <polygon points="15,28 20,12 27,28" fill="#FFB8C8"/>
      <polygon points="37,28 44,12 49,28" fill="#FFB8C8"/>
      {/* head */}
      <ellipse cx="32" cy="39" rx="24" ry="22" fill="#F4F4F4" stroke="#1A1A1A" strokeWidth="2.5"/>
      {/* eyes (happy arch) */}
      <path d="M 20 35 Q 24.5 29 29 35" fill="none" stroke="#1A1A1A" strokeWidth="2.8" strokeLinecap="round"/>
      <path d="M 35 35 Q 39.5 29 44 35" fill="none" stroke="#1A1A1A" strokeWidth="2.8" strokeLinecap="round"/>
      {/* nose */}
      <path d="M 29 44 L 32 48 L 35 44 Z" fill="#FFB8B8" stroke="#FFB8B8"/>
      {/* mouth */}
      <path d="M 27 49 Q 32 55 37 49" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round"/>
      {/* whisker dots */}
      <circle cx="16" cy="45" r="2.2" fill="#1A1A1A"/>
      <circle cx="11" cy="41" r="1.7" fill="#1A1A1A"/>
      <circle cx="48" cy="45" r="2.2" fill="#1A1A1A"/>
      <circle cx="53" cy="41" r="1.7" fill="#1A1A1A"/>
      {/* blush */}
      <ellipse cx="15" cy="46" rx="5"   ry="3.2" fill="#FFB8B8" opacity="0.6"/>
      <ellipse cx="49" cy="46" rx="5"   ry="3.2" fill="#FFB8B8" opacity="0.6"/>
    </svg>
  );
}

// ─── Cloud ────────────────────────────────────────────────────────────────────
function Cloud({ x, y, scale = 1, delay = "0s" }: { x: string; y: string; scale?: number; delay?: string }) {
  return (
    <div style={{
      position: "absolute", left: x, top: y,
      transform: `scale(${scale})`, transformOrigin: "left top",
      animation: `cloudDrift 6s ${delay} ease-in-out infinite`,
      zIndex: 1, pointerEvents: "none",
    }}>
      <svg width="80" height="46" viewBox="0 0 80 46">
        <ellipse cx="40" cy="36" rx="36" ry="18" fill="white" stroke="#1A1A1A" strokeWidth="2.5"/>
        <ellipse cx="26" cy="28" rx="18" ry="16" fill="white" stroke="#1A1A1A" strokeWidth="2.5"/>
        <ellipse cx="52" cy="26" rx="16" ry="14" fill="white" stroke="#1A1A1A" strokeWidth="2.5"/>
        <ellipse cx="40" cy="32" rx="20" ry="14" fill="white"/>
        <ellipse cx="28" cy="30" rx="15" ry="12" fill="white"/>
        <ellipse cx="52" cy="30" rx="14" ry="10" fill="white"/>
      </svg>
    </div>
  );
}

// ─── Floating decoration ──────────────────────────────────────────────────────
const FLOATS = [
  { ch:"♪", c:"#FF6B9D", x:"6%",  y:"7%",  s:"2rem",   a:"floatA 3.2s ease-in-out infinite",      stroke:"1.5px #1A1A1A" },
  { ch:"♩", c:"#FFE033", x:"84%", y:"6%",  s:"1.8rem",  a:"floatB 2.9s ease-in-out infinite",      stroke:"1.5px #1A1A1A" },
  { ch:"🐾",c:"#FF8C42", x:"2%",  y:"34%", s:"1.5rem",  a:"floatC 3.6s ease-in-out infinite",      stroke:"0" },
  { ch:"✦", c:"#FFE033", x:"90%", y:"24%", s:"1.7rem",  a:"floatA 4s ease-in-out infinite",        stroke:"1.5px #1A1A1A" },
  { ch:"♫", c:"#B8E04A", x:"12%", y:"62%", s:"1.5rem",  a:"floatB 3.8s ease-in-out infinite",      stroke:"1.5px #1A1A1A" },
  { ch:"🐾",c:"#FF6B9D", x:"83%", y:"55%", s:"1.5rem",  a:"floatC 3.3s 0.4s ease-in-out infinite", stroke:"0" },
  { ch:"✦", c:"#FFE033", x:"4%",  y:"76%", s:"1.4rem",  a:"floatA 2.7s ease-in-out infinite",      stroke:"1.5px #1A1A1A" },
  { ch:"♪", c:"#4FC3F7", x:"88%", y:"72%", s:"1.6rem",  a:"floatB 3.7s 1s ease-in-out infinite",   stroke:"1.5px #1A1A1A" },
  { ch:"★", c:"#FFE033", x:"22%", y:"5%",  s:"1.3rem",  a:"floatC 4.2s ease-in-out infinite",      stroke:"1px #1A1A1A" },
  { ch:"★", c:"#FF6B9D", x:"72%", y:"11%", s:"1.2rem",  a:"floatA 3.1s 0.7s ease-in-out infinite", stroke:"1px #1A1A1A" },
  { ch:"♩", c:"#B8E04A", x:"9%",  y:"19%", s:"1.4rem",  a:"floatB 3.5s ease-in-out infinite",      stroke:"1.5px #1A1A1A" },
  { ch:"✦", c:"#AB47BC", x:"80%", y:"42%", s:"1.3rem",  a:"floatC 3.2s 0.3s ease-in-out infinite", stroke:"1.5px #1A1A1A" },
  { ch:"🐾",c:"#4FC3F7", x:"17%", y:"80%", s:"1.3rem",  a:"floatA 3.4s 0.6s ease-in-out infinite", stroke:"0" },
  { ch:"♪", c:"#FF8C42", x:"75%", y:"82%", s:"1.2rem",  a:"floatB 4s 0.2s ease-in-out infinite",   stroke:"1px #1A1A1A" },
  { ch:"★", c:"#B8E04A", x:"50%", y:"4%",  s:"1.1rem",  a:"floatC 3s 1.2s ease-in-out infinite",   stroke:"1px #1A1A1A" },
];

// ─── Hills with trees & building ─────────────────────────────────────────────
function BottomScene() {
  return (
    <svg
      viewBox="0 0 390 175"
      preserveAspectRatio="xMidYMax meet"
      style={{ position: "absolute", bottom: 0, left: 0, width: "100%", display: "block", zIndex: 2 }}
    >
      {/* back hill */}
      <path d="M-5 175 Q 55 85 130 95 Q 195 104 250 72 Q 310 45 395 88 L 395 175 Z"
        fill="#8BC34A" />
      {/* front hill */}
      <path d="M-5 175 Q 50 108 120 118 Q 180 126 230 104 Q 285 84 350 114 Q 375 126 395 118 L 395 175 Z"
        fill="#B8E04A" stroke="#1A1A1A" strokeWidth="3" strokeLinejoin="round" />

      {/* Tree 1 */}
      <rect x="65"  y="88"  width="8" height="22" fill="#5D4037" stroke="#1A1A1A" strokeWidth="2"/>
      <ellipse cx="69"  cy="80"  rx="20" ry="18" fill="#558B2F" stroke="#1A1A1A" strokeWidth="2.5"/>
      <ellipse cx="69"  cy="78"  rx="15" ry="13" fill="#689F38"/>

      {/* Tree 2 */}
      <rect x="148" y="74"  width="8" height="22" fill="#5D4037" stroke="#1A1A1A" strokeWidth="2"/>
      <ellipse cx="152" cy="65"  rx="20" ry="18" fill="#558B2F" stroke="#1A1A1A" strokeWidth="2.5"/>
      <ellipse cx="152" cy="63"  rx="15" ry="13" fill="#689F38"/>

      {/* Tree 3 */}
      <rect x="285" y="91"  width="8" height="22" fill="#5D4037" stroke="#1A1A1A" strokeWidth="2"/>
      <ellipse cx="289" cy="83"  rx="20" ry="18" fill="#558B2F" stroke="#1A1A1A" strokeWidth="2.5"/>
      <ellipse cx="289" cy="81"  rx="15" ry="13" fill="#689F38"/>

      {/* Building */}
      <rect   x="178" y="107" width="32" height="24" fill="#EDE8DC" stroke="#1A1A1A" strokeWidth="2"/>
      <polygon points="173,110 194,90 215,110"      fill="#8D6E63" stroke="#1A1A1A" strokeWidth="2"/>
      <rect   x="188" y="117" width="9" height="14"  fill="#795548" stroke="#1A1A1A" strokeWidth="1.5"/>
      {/* windows */}
      <rect   x="180" y="110" width="7" height="7"   fill="#AED6F1" stroke="#1A1A1A" strokeWidth="1"/>
      <rect   x="200" y="110" width="7" height="7"   fill="#AED6F1" stroke="#1A1A1A" strokeWidth="1"/>

      {/* Path / road */}
      <ellipse cx="194" cy="155" rx="18" ry="6" fill="#D4C9A0" stroke="#1A1A1A" strokeWidth="1.5"/>
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function TomodachiLogin({ onLogin, onFirstTime }: {
  onLogin: () => void;
  onFirstTime: () => void;
}) {
  const [email, setEmail]     = useState("");
  const [pass,  setPass]      = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake]     = useState(false);

  const handleLogin = () => {
    if (!email.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 420);
      return;
    }
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 900);
  };

  return (
    <div
      style={{
        width: "100%", height: "100%",
        position: "relative", overflow: "hidden",
        background: "#5BC8F5",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      <style>{CSS}</style>

      {/* ── Floating decorations ── */}
      {FLOATS.map((f, i) => (
        <span key={i} style={{
          position: "absolute", left: f.x, top: f.y,
          fontSize: f.s, color: f.c,
          animation: f.a,
          WebkitTextStroke: f.stroke,
          zIndex: 1, pointerEvents: "none",
          userSelect: "none", display: "inline-block",
        }}>
          {f.ch}
        </span>
      ))}

      {/* ── Clouds ── */}
      <Cloud x="4%"  y="12%" scale={0.85} delay="0s" />
      <Cloud x="62%" y="8%"  scale={0.7}  delay="2s" />
      <Cloud x="38%" y="18%" scale={0.6}  delay="3.5s" />

      {/* ── Hills ── */}
      <BottomScene />

      {/* ── Blob card ── */}
      <div
        style={{
          position: "relative",
          width: "330px",
          height: "490px",
          zIndex: 5,
          marginBottom: "60px",
          animation: shake ? "none" : undefined,
          filter: shake ? "drop-shadow(4px 0 0 #FF4444) drop-shadow(-4px 0 0 #FF4444)" : "none",
          transition: "filter 0.05s",
        }}
      >
        {/* SVG blob shape */}
        <svg
          viewBox="0 0 330 490"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}
        >
          <path d={BLOB} fill="#FFE033" stroke="#1A1A1A" strokeWidth="4.5" strokeLinejoin="round"/>
        </svg>

        {/* Card content */}
        <div
          style={{
            position: "relative", zIndex: 1,
            padding: "30px 38px 34px",
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: "14px", height: "100%", boxSizing: "border-box",
          }}
        >
          {/* Pet sprites */}
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", marginTop: "4px" }}>
            <Dog />
            <Cat />
          </div>

          {/* Rainbow title */}
          <RainbowTitle />

          {/* Divider */}
          <div style={{
            width: "80%", height: "3px",
            background: "#1A1A1A",
            borderRadius: "2px",
            margin: "-2px 0",
          }} />

          {/* Inputs */}
          <input
            className="tomo-input"
            type="text"
            placeholder="username"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "white",
              border: "2.5px solid #1A1A1A",
              borderRadius: "20px",
              padding: "11px 20px",
              fontSize: "1.05rem",
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 600,
              color: "#2A2A2A",
            }}
          />

          <input
            className="tomo-input"
            type="password"
            placeholder="password"
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "white",
              border: "2.5px solid #1A1A1A",
              borderRadius: "20px",
              padding: "11px 20px",
              fontSize: "1.05rem",
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 600,
              color: "#2A2A2A",
            }}
          />

          {/* Login button */}
          <button
            className="go-btn"
            onClick={handleLogin}
            style={{
              width: "100%",
              background: loading ? "#FFAA66" : "#FF8C42",
              border: "3px solid #1A1A1A",
              borderRadius: "18px",
              padding: "13px 0",
              fontSize: "1.3rem",
              fontFamily: "'Chewy', cursive",
              fontWeight: 400,
              color: "white",
              WebkitTextStroke: "0.5px #1A1A1A",
              cursor: loading ? "default" : "pointer",
              letterSpacing: "1px",
              animation: loading ? "btnBounce 0.5s ease-in-out infinite" : "none",
            }}
          >
            {loading ? "Loading… 🎵" : "Let's Go! 🐾"}
          </button>

          {/* First time link */}
          <a
            className="first-link"
            onClick={(e) => { e.preventDefault(); onFirstTime(); }}
            href="#"
            style={{
              color: "#1A6B8A",
              fontSize: "0.95rem",
              fontWeight: 700,
              fontFamily: "'Nunito', sans-serif",
              textDecoration: "none",
              cursor: "pointer",
              marginTop: "-4px",
            }}
          >
            primera vez? dibuja tu mascota →
          </a>
        </div>
      </div>
    </div>
  );
}
