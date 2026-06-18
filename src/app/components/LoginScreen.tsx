import { useState, useRef, useCallback, useEffect, useMemo } from "react";

// ─── Keyframes injected once ──────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes floatParticle {
    0%   { transform: translateY(0)       rotate(0deg)   scale(0.85); opacity: 0;   }
    8%   {                                                              opacity: 0.75; }
    50%  { transform: translateY(-44vh)   rotate(14deg)  scale(1.1);  opacity: 0.55; }
    92%  {                                                              opacity: 0.3;  }
    100% { transform: translateY(-96vh)   rotate(-8deg)  scale(0.7);  opacity: 0;   }
  }
  @keyframes slideUpIn {
    from { transform: translateY(72px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes fadeCardIn {
    from { transform: translateY(16px) scale(0.97); opacity: 0; }
    to   { transform: translateY(0)    scale(1);    opacity: 1; }
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 6px 6px 0 #8B6B4A; }
    50%       { box-shadow: 6px 6px 0 #8B6B4A, 0 0 22px rgba(168,216,176,0.5); }
  }
  @keyframes wobble {
    0%,100% { transform: rotate(-4deg) scale(1);    }
    50%     { transform: rotate(4deg)  scale(1.06); }
  }
  @keyframes shimmer {
    0%   { opacity: 0.55; }
    50%  { opacity: 0.9;  }
    100% { opacity: 0.55; }
  }
  .pet-input::placeholder { color: #A08060; font-style: italic; font-family: 'Caveat', cursive; }
  .pet-input:focus { outline: none; border-color: #A8D8B0 !important; box-shadow: 0 0 0 3px rgba(168,216,176,0.35); }
  .login-btn:hover { transform: scale(1.03) translateY(-1px); box-shadow: 7px 7px 0 #1E4D2B !important; }
  .login-btn:active { transform: scale(0.97); }
`;

// ─── Background SVG: Hand-drawn cat illustration ───────────────────────────────
function CatIllustrationBg() {
  return (
    <svg viewBox="0 0 900 640" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}>
      <rect width="900" height="640" fill="#F5EFE0" />
      {/* Head */}
      <circle cx="450" cy="248" r="138" fill="none" stroke="#1A6E7E" strokeWidth="12" strokeLinecap="round" />
      {/* Ears */}
      <path d="M 348 162 L 365 82 L 416 162" fill="#FDDDE6" stroke="#1A6E7E" strokeWidth="11" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
      <path d="M 484 162 L 535 82 L 552 162" fill="#FDDDE6" stroke="#1A6E7E" strokeWidth="11" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
      {/* Body */}
      <ellipse cx="452" cy="468" rx="170" ry="146" fill="none" stroke="#1A6E7E" strokeWidth="12" strokeLinecap="round" />
      {/* Left eye */}
      <ellipse cx="416" cy="236" rx="22" ry="27" fill="#1A6E7E" />
      <ellipse cx="410" cy="230" rx="7" ry="9" fill="#F5EFE0" opacity="0.6" />
      <circle cx="418" cy="238" r="4" fill="#0A3D45" opacity="0.5" />
      {/* Right eye */}
      <ellipse cx="484" cy="236" rx="22" ry="27" fill="#1A6E7E" />
      <ellipse cx="478" cy="230" rx="7" ry="9" fill="#F5EFE0" opacity="0.6" />
      <circle cx="486" cy="238" r="4" fill="#0A3D45" opacity="0.5" />
      {/* Nose */}
      <path d="M 443 268 L 450 280 L 457 268 Z" fill="#1A6E7E" />
      {/* Mouth */}
      <path d="M 441 281 Q 432 298 422 293" fill="none" stroke="#1A6E7E" strokeWidth="6" strokeLinecap="round" />
      <path d="M 459 281 Q 468 298 478 293" fill="none" stroke="#1A6E7E" strokeWidth="6" strokeLinecap="round" />
      {/* Whiskers */}
      <line x1="278" y1="264" x2="400" y2="268" stroke="#1A6E7E" strokeWidth="4.5" strokeLinecap="round" opacity="0.7" />
      <line x1="275" y1="280" x2="398" y2="278" stroke="#1A6E7E" strokeWidth="4.5" strokeLinecap="round" opacity="0.7" />
      <line x1="280" y1="296" x2="400" y2="290" stroke="#1A6E7E" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
      <line x1="500" y1="268" x2="622" y2="264" stroke="#1A6E7E" strokeWidth="4.5" strokeLinecap="round" opacity="0.7" />
      <line x1="502" y1="278" x2="625" y2="280" stroke="#1A6E7E" strokeWidth="4.5" strokeLinecap="round" opacity="0.7" />
      <line x1="500" y1="290" x2="620" y2="296" stroke="#1A6E7E" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
      {/* Tail */}
      <path d="M 612 468 Q 700 382 672 282 Q 655 222 690 172" fill="none" stroke="#1A6E7E" strokeWidth="12" strokeLinecap="round" />
      {/* Paws */}
      <ellipse cx="376" cy="602" rx="55" ry="34" fill="none" stroke="#1A6E7E" strokeWidth="10" strokeLinecap="round" />
      <ellipse cx="528" cy="602" rx="55" ry="34" fill="none" stroke="#1A6E7E" strokeWidth="10" strokeLinecap="round" />
      {/* Toe marks */}
      {[356,376,396].map((x,i) => <line key={i} x1={x} y1="592" x2={x} y2="610" stroke="#1A6E7E" strokeWidth="3.5" strokeLinecap="round" opacity="0.55" />)}
      {[508,528,548].map((x,i) => <line key={i} x1={x} y1="592" x2={x} y2="610" stroke="#1A6E7E" strokeWidth="3.5" strokeLinecap="round" opacity="0.55" />)}
      {/* Decorative notes + prints */}
      <text x="138" y="198" fontSize="54" fill="#1A6E7E" opacity="0.22" fontFamily="serif">♪</text>
      <text x="698" y="548" fontSize="40" fill="#1A6E7E" opacity="0.2" fontFamily="serif">♫</text>
      <text x="756" y="148" fontSize="30" fill="#1A6E7E" opacity="0.18" fontFamily="serif">♩</text>
      <text x="88" y="538" fontSize="34" fill="#1A6E7E" opacity="0.2" fontFamily="serif">♬</text>
      <text x="152" y="388" fontSize="28" fill="#1A6E7E" opacity="0.18">🐾</text>
      <text x="704" y="308" fontSize="26" fill="#1A6E7E" opacity="0.18">🐾</text>
      <text x="800" y="450" fontSize="22" fill="#1A6E7E" opacity="0.15">✦</text>
      <text x="60" y="300" fontSize="20" fill="#1A6E7E" opacity="0.15">✦</text>
    </svg>
  );
}

// ─── Background layer ─────────────────────────────────────────────────────────
function BackgroundLayer({ drawing }: { drawing: string | null }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>
      {drawing ? (
        <img
          src={drawing}
          alt=""
          style={{
            width: "110%", height: "110%",
            objectFit: "cover",
            filter: "blur(18px) brightness(0.72) saturate(1.3)",
            transform: "translate(-5%, -5%)",
          }}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", filter: "blur(5px) brightness(0.82) saturate(1.1)" }}>
          <CatIllustrationBg />
        </div>
      )}
    </div>
  );
}

// ─── Linen texture overlay ────────────────────────────────────────────────────
function LinenOverlay() {
  return (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(139,107,74,0.07) 3px, rgba(139,107,74,0.07) 4px),
          repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(139,107,74,0.07) 3px, rgba(139,107,74,0.07) 4px)
        `,
      }}
    />
  );
}

// ─── Floating particles ───────────────────────────────────────────────────────
const EMOJIS = ["🎵","🐾","✦","🎶","⭐","🎵","🐾","✦","🎵","🌸","✦","🎶","🐾","⭐","🎵","✦","🐾","🎶"];
function Particles({ dark = false }: { dark?: boolean }) {
  const items = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    id: i,
    emoji: EMOJIS[i % EMOJIS.length],
    left: 4 + (i * 5.8) % 92,
    delay: (i * 0.63) % 11,
    dur: 9 + (i * 1.17) % 8,
    size: 0.7 + (i * 0.13) % 0.65,
  })), []);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 3 }}>
      {items.map(p => (
        <span key={p.id} style={{
          position: "absolute",
          left: `${p.left}%`,
          bottom: "-40px",
          fontSize: `${p.size * 1.3}rem`,
          animation: `floatParticle ${p.dur}s ${p.delay}s infinite ease-in-out`,
          opacity: 0,
          color: dark ? "rgba(245,239,224,0.8)" : undefined,
          filter: dark ? "brightness(1.5)" : undefined,
        }}>
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

// ─── First-time drawing canvas ────────────────────────────────────────────────
const DRAW_COLORS = [
  { c: "#F5EFE0", name: "Crema" },
  { c: "#F9C4D0", name: "Rosa" },
  { c: "#A8D8B0", name: "Menta" },
  { c: "#F5E4A0", name: "Sol" },
  { c: "#C8B8E8", name: "Lavanda" },
  { c: "#AACCE0", name: "Cielo" },
  { c: "#F0B870", name: "Melocotón" },
];

function FirstDrawCanvas({ onDone, canvasOpacity }: {
  onDone: (dataUrl: string) => void;
  canvasOpacity: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [color, setColor] = useState(DRAW_COLORS[0].c);
  const [hasStrokes, setHasStrokes] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.fillStyle = "#1A1208";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDrawing(true);
    setHasStrokes(true);
    const pos = getPos(e);
    setLastPos(pos);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }, [color]);

  const drawStroke = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 0.7;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    setLastPos(pos);
  }, [drawing, lastPos, color]);

  const stopDraw = useCallback(() => setDrawing(false), []);

  const handleDone = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onDone(canvas.toDataURL());
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.fillStyle = "#1A1208";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  };

  return (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: 5,
        opacity: canvasOpacity,
        transition: "opacity 1.3s ease",
        fontFamily: "'Caveat', cursive",
      }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "crosshair", touchAction: "none" }}
        onMouseDown={startDraw}
        onMouseMove={drawStroke}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={drawStroke}
        onTouchEnd={stopDraw}
      />

      {/* Top instruction */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0,
          display: "flex", flexDirection: "column", alignItems: "center",
          paddingTop: "48px", gap: "12px", zIndex: 6, pointerEvents: "none",
          animation: "fadeCardIn 0.9s ease forwards",
        }}
      >
        <h1
          style={{
            fontSize: "2.2rem",
            color: "#F5EFE0",
            fontFamily: "'Caveat', cursive",
            fontWeight: 700,
            margin: 0,
            textShadow: "0 2px 12px rgba(0,0,0,0.6)",
            textAlign: "center",
          }}
        >
          dibuja a tu mascota antes de entrar ✨
        </h1>
        <p style={{ color: "rgba(245,239,224,0.65)", fontSize: "1.2rem", margin: 0, textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}>
          usa el crayón y deja volar tu imaginación 🎨
        </p>
      </div>

      {/* Bottom toolbar */}
      <div
        style={{
          position: "absolute", bottom: "40px", left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: "14px", alignItems: "center", zIndex: 6,
          background: "rgba(26,18,8,0.75)",
          borderRadius: "50px",
          padding: "12px 22px",
          border: "2px dashed rgba(196,151,90,0.6)",
          backdropFilter: "blur(8px)",
          animation: "slideUpIn 0.8s 0.3s ease both",
        }}
      >
        {/* Color swatches */}
        <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
          {DRAW_COLORS.map(d => (
            <button
              key={d.c}
              title={d.name}
              onClick={() => setColor(d.c)}
              style={{
                width: "30px", height: "30px", borderRadius: "50%",
                background: d.c,
                border: color === d.c ? "3px solid #F5EFE0" : "2px dashed rgba(245,239,224,0.3)",
                cursor: "pointer",
                transform: color === d.c ? "scale(1.22)" : "scale(1)",
                transition: "transform 0.13s",
                boxShadow: color === d.c ? `0 0 10px ${d.c}` : "none",
              }}
            />
          ))}
        </div>

        <div style={{ width: "1px", height: "32px", background: "rgba(196,151,90,0.5)" }} />

        {/* Clear */}
        <button
          onClick={clearCanvas}
          style={{
            padding: "7px 14px", borderRadius: "50px",
            background: "rgba(255,255,255,0.08)",
            border: "1.5px dashed rgba(245,239,224,0.4)",
            color: "rgba(245,239,224,0.7)",
            cursor: "pointer",
            fontFamily: "'Caveat', cursive",
            fontSize: "1rem",
            transition: "all 0.15s",
          }}
        >
          ✨ Limpiar
        </button>

        <div style={{ width: "1px", height: "32px", background: "rgba(196,151,90,0.5)" }} />

        {/* Done */}
        <button
          onClick={handleDone}
          disabled={!hasStrokes}
          style={{
            padding: "10px 22px", borderRadius: "50px",
            background: hasStrokes ? "#A8D8B0" : "rgba(168,216,176,0.3)",
            border: hasStrokes ? "2px dashed #1E4D2B" : "2px dashed rgba(30,77,43,0.3)",
            color: hasStrokes ? "#1E4D2B" : "rgba(30,77,43,0.5)",
            cursor: hasStrokes ? "pointer" : "not-allowed",
            fontFamily: "'Caveat', cursive",
            fontSize: "1.1rem",
            fontWeight: 700,
            boxShadow: hasStrokes ? "3px 3px 0 rgba(30,77,43,0.4)" : "none",
            transition: "all 0.2s",
          }}
        >
          ¡Listo! 🐾
        </button>
      </div>
    </div>
  );
}

// ─── Shared input style ───────────────────────────────────────────────────────
function PetInput({ label, type = "text", value, onChange, placeholder, icon }: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder: string; icon: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontSize: "1.05rem", color: "#7A5C44", fontFamily: "'Caveat', cursive", fontWeight: 600 }}>
        {icon} {label}
      </label>
      <input
        className="pet-input"
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: "#EDE0C8",
          border: "2px dashed #C4975A",
          borderRadius: "12px",
          padding: "12px 16px",
          fontFamily: "'Caveat', cursive",
          fontSize: "1.1rem",
          color: "#3D2B1F",
          width: "100%",
          boxSizing: "border-box",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      />
    </div>
  );
}

// ─── Avatar circle ────────────────────────────────────────────────────────────
function PetAvatar({ drawing, size = 72 }: { drawing: string | null; size?: number }) {
  return (
    <div
      style={{
        width: `${size}px`, height: `${size}px`,
        borderRadius: "50%",
        border: "3px dashed #C4975A",
        boxShadow: "3px 3px 0 #8B6B4A",
        overflow: "hidden",
        background: "#EDE0C8",
        flexShrink: 0,
        animation: "wobble 3.5s ease-in-out infinite",
      }}
    >
      {drawing ? (
        <img
          src={drawing}
          alt="Tu mascota"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: `${size * 0.45}px` }}>
          🐾
        </div>
      )}
    </div>
  );
}

// ─── Register form ────────────────────────────────────────────────────────────
function RegisterForm({ drawing, onRegister }: {
  drawing: string | null;
  onRegister: (name: string, email: string, pass: string) => void;
}) {
  const [petName, setPetName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  return (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "slideUpIn 0.75s cubic-bezier(0.34,1.56,0.64,1) both",
        fontFamily: "'Caveat', cursive",
      }}
    >
      <div
        style={{
          width: "380px",
          background: "#FFFBF2",
          borderRadius: "24px",
          border: "3px dashed #C4975A",
          boxShadow: "6px 6px 0 #8B6B4A",
          padding: "28px 30px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        {/* Card header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <PetAvatar drawing={drawing} size={72} />
          <h1 style={{ margin: 0, fontSize: "1.9rem", color: "#3D2B1F", textAlign: "center", fontWeight: 700 }}>
            ponle nombre a tu mascota ✨
          </h1>
          <p style={{ margin: 0, fontSize: "1rem", color: "#7A5C44", textAlign: "center" }}>
            ya casi entras… ¡falta poco! 🎵
          </p>
        </div>

        {/* Divider stitch */}
        <div style={{ borderTop: "2px dashed #C4975A", margin: "0 -4px" }} />

        {/* Inputs */}
        <PetInput label="Nombre de tu mascota" value={petName} onChange={setPetName} placeholder="p.ej. Mochi, Luna, Tofu…" icon="🐾" />
        <PetInput label="Tu email" type="email" value={email} onChange={setEmail} placeholder="hola@correo.com" icon="📬" />
        <PetInput label="Contraseña" type="password" value={pass} onChange={setPass} placeholder="algo secreto y kawaii…" icon="🔑" />

        {/* Register button */}
        <button
          className="login-btn"
          disabled={!petName.trim()}
          onClick={() => onRegister(petName.trim(), email, pass)}
          style={{
            background: petName.trim() ? "#A8D8B0" : "#C8E8D0",
            border: "2.5px dashed #1E4D2B",
            borderRadius: "14px",
            padding: "14px",
            fontSize: "1.2rem",
            color: "#1E4D2B",
            fontWeight: 700,
            cursor: petName.trim() ? "pointer" : "not-allowed",
            fontFamily: "'Caveat', cursive",
            boxShadow: "5px 5px 0 #1E4D2B",
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
          }}
        >
          ¡Crear mi mascota! 🐾
        </button>

        {/* Decorative tag */}
        <p style={{ textAlign: "center", margin: 0, fontSize: "0.9rem", color: "#A08060" }}>
          🧵 tejido con amor para tu pet ✦
        </p>
      </div>
    </div>
  );
}

// ─── Login card ───────────────────────────────────────────────────────────────
function LoginCard({ drawing, petName, onLogin, onFirstTime }: {
  drawing: string | null; petName: string;
  onLogin: () => void; onFirstTime: () => void;
}) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!email.trim()) { setShake(true); setTimeout(() => setShake(false), 500); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 900);
  };

  return (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Caveat', cursive",
      }}
    >
      <div
        style={{
          width: "380px",
          background: "#FFFBF2",
          borderRadius: "24px",
          border: "3px dashed #C4975A",
          boxShadow: "6px 6px 0 #8B6B4A",
          padding: "28px 30px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          animation: shake ? "none" : "fadeCardIn 0.65s cubic-bezier(0.34,1.56,0.64,1) both",
          transform: shake ? "translateX(0)" : undefined,
        }}
      >
        {/* Card header: avatar + pet name */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <div style={{ position: "relative" }}>
            <PetAvatar drawing={drawing} size={72} />
            {/* Sparkle badge */}
            <div
              style={{
                position: "absolute", bottom: "-4px", right: "-4px",
                width: "24px", height: "24px", borderRadius: "50%",
                background: "#F5E4A0",
                border: "2px dashed #C4975A",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.8rem",
                animation: "shimmer 2s ease-in-out infinite",
              }}
            >
              ✦
            </div>
          </div>

          {petName && (
            <p style={{ margin: 0, fontSize: "1.2rem", color: "#7A5C44", fontWeight: 700 }}>
              🐾 {petName}
            </p>
          )}

          <h1 style={{ margin: 0, fontSize: "1.9rem", color: "#3D2B1F", textAlign: "center", fontWeight: 700, lineHeight: 1.2 }}>
            hola de nuevo 👋
          </h1>
          <p style={{ margin: 0, fontSize: "1rem", color: "#A08060", textAlign: "center" }}>
            tu mascota te espera para hacer música ✨
          </p>
        </div>

        {/* Stitch divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ flex: 1, borderTop: "2px dashed #C4975A" }} />
          <span style={{ fontSize: "1rem", color: "#C4975A" }}>🧵</span>
          <div style={{ flex: 1, borderTop: "2px dashed #C4975A" }} />
        </div>

        {/* Inputs */}
        <PetInput label="Email" type="email" value={email} onChange={setEmail} placeholder="tu@correo.com" icon="📬" />
        <PetInput label="Contraseña" type="password" value={pass} onChange={setPass} placeholder="••••••••" icon="🔑" />

        {/* Primary button */}
        <button
          className="login-btn"
          onClick={handleLogin}
          style={{
            background: loading ? "#C8E8D0" : "#A8D8B0",
            border: "2.5px dashed #1E4D2B",
            borderRadius: "14px",
            padding: "14px",
            fontSize: "1.2rem",
            color: "#1E4D2B",
            fontWeight: 700,
            cursor: loading ? "default" : "pointer",
            fontFamily: "'Caveat', cursive",
            boxShadow: "5px 5px 0 #1E4D2B",
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
            animation: loading ? "pulse-glow 0.9s ease-in-out infinite" : "none",
          }}
        >
          {loading ? "entrando… 🎵" : "¡Entrar con mi mascota! 🐾"}
        </button>

        {/* First-time link */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={onFirstTime}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#C4975A",
              fontFamily: "'Caveat', cursive",
              fontSize: "1rem",
              textDecoration: "underline",
              textDecorationStyle: "dashed",
              textDecorationColor: "#C4975A",
            }}
          >
            ¿primera vez aquí? dibuja tu mascota →
          </button>
        </div>

        {/* Bottom sticker strip */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          {[
            { e: "🌸", bg: "#F9C4D0", rot: -6 },
            { e: "⭐", bg: "#F5E4A0", rot: 4 },
            { e: "🎵", bg: "#A8D8B0", rot: -10 },
            { e: "🐾", bg: "#C8B8E8", rot: 7 },
            { e: "✦",  bg: "#AACCE0", rot: -4 },
          ].map((d, i) => (
            <div key={i} style={{
              width: "30px", height: "30px", borderRadius: "50%",
              background: d.bg,
              border: "1.5px dashed #8B6B4A",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.9rem",
              transform: `rotate(${d.rot}deg)`,
              boxShadow: "1.5px 1.5px 0 #C4975A",
            }}>
              {d.e}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main LoginScreen ─────────────────────────────────────────────────────────
type Flow = "first-draw" | "transitioning" | "register" | "login";

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const savedDrawing = localStorage.getItem("petDrawing");
  const savedName    = localStorage.getItem("petName");

  const [flow, setFlow]           = useState<Flow>(savedDrawing ? "login" : "first-draw");
  const [drawing, setDrawing]     = useState<string | null>(savedDrawing);
  const [petName, setPetName]     = useState(savedName || "");
  const [canvasOpacity, setOpacity] = useState(1);
  const [showReg, setShowReg]     = useState(false);

  const handleDrawDone = (dataUrl: string) => {
    setDrawing(dataUrl);
    setFlow("transitioning");
    // Fade canvas out — next animation frame ensures React has rendered the new drawing first
    requestAnimationFrame(() => setTimeout(() => setOpacity(0), 30));
    setTimeout(() => { setFlow("register"); setShowReg(true); }, 1350);
  };

  const handleRegister = (name: string, email: string, _pass: string) => {
    localStorage.setItem("petName", name);
    localStorage.setItem("petDrawing", drawing || "");
    setPetName(name);
    setFlow("login");
    setShowReg(false);
  };

  const handleGoFirstTime = () => {
    setOpacity(1);
    setDrawing(null);
    setFlow("first-draw");
  };

  const isFirstDraw = flow === "first-draw" || flow === "transitioning";

  return (
    <div className="size-full" style={{ position: "relative", overflow: "hidden", fontFamily: "'Caveat', cursive" }}>
      <style>{KEYFRAMES}</style>

      {/* Layer 0: Background */}
      {!isFirstDraw || flow === "transitioning" ? (
        <BackgroundLayer drawing={drawing} />
      ) : (
        /* Dark bg for first-draw — canvas itself is opaque so this is hidden */
        <div style={{ position: "absolute", inset: 0, background: "#1A1208", zIndex: 0 }} />
      )}

      {/* Layer 1: Linen texture */}
      <LinenOverlay />

      {/* Layer 2: Particles */}
      <Particles dark={isFirstDraw && flow !== "transitioning"} />

      {/* Layer 5: Drawing canvas (first-draw + transitioning) */}
      {isFirstDraw && (
        <FirstDrawCanvas onDone={handleDrawDone} canvasOpacity={canvasOpacity} />
      )}

      {/* Layer 10: Register form */}
      {showReg && flow === "register" && (
        <RegisterForm drawing={drawing} onRegister={handleRegister} />
      )}

      {/* Layer 10: Login card */}
      {flow === "login" && (
        <LoginCard
          drawing={drawing}
          petName={petName}
          onLogin={onLogin}
          onFirstTime={handleGoFirstTime}
        />
      )}
    </div>
  );
}
