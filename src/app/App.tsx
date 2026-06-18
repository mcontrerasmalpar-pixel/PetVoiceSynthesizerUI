import { useState } from "react";
import { DrawMode } from "./components/DrawMode";
import { PlayMode } from "./components/PlayMode";

type Screen = "draw" | "play";

export default function App() {
  const [screen, setScreen] = useState<Screen>("draw");
  const [drawingDataUrl, setDrawingDataUrl] = useState<string | null>(null);

  return (
    <div
      className="size-full flex flex-col overflow-hidden"
      style={{
        fontFamily: "'Caveat', cursive",
        background: "#F2EAD8",
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(139,107,74,0.04) 3px, rgba(139,107,74,0.04) 4px),
          repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(139,107,74,0.04) 3px, rgba(139,107,74,0.04) 4px)
        `,
      }}
    >
      {/* ===== Header ===== */}
      <header
        style={{
          background: "#FFFBF2",
          borderBottom: "3px dashed #C4975A",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(61,43,31,0.1)",
        }}
      >
        {/* Logo / title */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "2rem" }}>🐾</span>
          <div>
            <h1
              style={{
                fontSize: "1.7rem",
                color: "#3D2B1F",
                fontFamily: "'Caveat', cursive",
                lineHeight: 1.1,
                margin: 0,
                fontWeight: 700,
              }}
            >
              Pet Voice Synthesizer
            </h1>
            <p style={{ fontSize: "0.85rem", color: "#7A5C44", margin: 0, fontFamily: "'Caveat', cursive" }}>
              ✂️ Handmade sounds for handmade pets ✂️
            </p>
          </div>
        </div>

        {/* Screen switcher tabs */}
        <div
          style={{
            display: "flex",
            background: "#EDE0C8",
            borderRadius: "50px",
            padding: "4px",
            border: "2.5px dashed #8B6B4A",
            gap: "4px",
          }}
        >
          {(["draw", "play"] as Screen[]).map((s) => {
            const label = s === "draw" ? "🎨 Draw Mode" : "🎵 Play Mode";
            const isActive = screen === s;
            return (
              <button
                key={s}
                onClick={() => setScreen(s)}
                style={{
                  padding: "8px 22px",
                  borderRadius: "50px",
                  background: isActive ? "#A8D8B0" : "transparent",
                  border: isActive ? "2px dashed #1E4D2B" : "2px solid transparent",
                  color: isActive ? "#1E4D2B" : "#7A5C44",
                  cursor: "pointer",
                  fontFamily: "'Caveat', cursive",
                  fontSize: "1.05rem",
                  fontWeight: isActive ? 700 : 400,
                  transition: "all 0.18s",
                  boxShadow: isActive ? "0 2px 8px rgba(30,77,43,0.2)" : "none",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Decorative badges */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {[
            { e: "🌸", bg: "#F9C4D0", rot: -8 },
            { e: "⭐", bg: "#F5E4A0", rot: 5 },
            { e: "🧵", bg: "#A8D8B0", rot: -12 },
          ].map((d, i) => (
            <div
              key={i}
              style={{
                width: "38px", height: "38px", borderRadius: "50%",
                background: d.bg,
                border: "2px dashed #8B6B4A",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.3rem",
                transform: `rotate(${d.rot}deg)`,
                boxShadow: "2px 2px 0 #C4975A",
              }}
            >
              {d.e}
            </div>
          ))}
        </div>
      </header>

      {/* ===== Screens ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* MARKER-MAKE-KIT-INVOKED */}
        {/* MARKER-MAKE-KIT-DISCOVERY-READ */}
        {screen === "draw" ? (
          <DrawMode onSaveDrawing={setDrawingDataUrl} />
        ) : (
          <PlayMode drawingDataUrl={drawingDataUrl} />
        )}
      </div>

      {/* ===== Footer ===== */}
      <footer
        style={{
          background: "#FFFBF2",
          borderTop: "2px dashed #C4975A",
          padding: "6px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          flexShrink: 0,
        }}
      >
        {["🌟 Draw your pet", "→", "🎵 Play its voice", "→", "🐾 Share the love!"].map((t, i) => (
          <span key={i} style={{ fontSize: "0.95rem", color: "#7A5C44", fontFamily: "'Caveat', cursive" }}>
            {t}
          </span>
        ))}
      </footer>
    </div>
  );
}
