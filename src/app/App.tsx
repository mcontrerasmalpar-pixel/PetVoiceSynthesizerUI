import { useState, useCallback } from "react";
import { DrawMode } from "./components/DrawMode";
import { PlayMode } from "./components/PlayMode";
import { PetProfile } from "./components/PetProfile";
import { SavePetModal } from "./components/SavePetModal";
import { LoginScreen } from "./components/LoginScreen";
import { uploadDrawing, savePet, type AnimalType, type Pet } from "../lib/supabase";
import type { MelodyNote } from "./components/PlayMode";

type Screen = "draw" | "play" | "profile";

export default function App() {
  const [screen,         setScreen]         = useState<Screen>("draw");
  const [drawingDataUrl, setDrawingDataUrl] = useState<string | null>(null);
  const [loggedIn,       setLoggedIn]       = useState(false);
  const [petName,        setPetName]        = useState("Mochi");

  // Supabase state
  const [showSaveModal,  setShowSaveModal]  = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [savedPet,       setSavedPet]       = useState<Pet | null>(null);
  const [melody,         setMelody]         = useState<MelodyNote[]>([]);
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [playTrigger,    setPlayTrigger]    = useState(0);

  if (!loggedIn) {
    return (
      <LoginScreen
        onLogin={(name) => {
          setPetName(name);
          setLoggedIn(true);
        }}
      />
    );
  }

  const TABS: { id: Screen; label: string; locked?: boolean }[] = [
    { id: "draw",    label: "🎨 Dibujar" },
    { id: "play",    label: "🎵 Escuchar", locked: !drawingDataUrl },
    { id: "profile", label: "🐾 Perfil",   locked: !savedPet },
  ];

  const handleSaveDrawing = useCallback((url: string) => {
    setDrawingDataUrl(url);
    if (url) setScreen("play");
  }, []);

  const handleSavePet = async (name: string, animal: AnimalType) => {
    setSaving(true);
    try {
      const drawingUrl = drawingDataUrl
        ? await uploadDrawing(drawingDataUrl, name)
        : null;
      const pet = await savePet({
        name,
        animal_type:  animal,
        owner_name:   petName,
        drawing_url:  drawingUrl,
        melody_json:  melody,
      });
      if (pet) {
        setSavedPet(pet);
        setShowSaveModal(false);
        setScreen("profile");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="size-full flex flex-col overflow-hidden"
      style={{
        background: "#5BC8F5",
        fontFamily: "'Chewy', 'Caveat', cursive",
        position: "relative",
      }}
    >
      {/* Save modal */}
      {showSaveModal && drawingDataUrl && (
        <SavePetModal
          drawingDataUrl={drawingDataUrl}
          ownerName={petName}
          onSave={handleSavePet}
          onClose={() => setShowSaveModal(false)}
          saving={saving}
        />
      )}

      {/* Floating doodles */}
      {[
        { e: "🎵", top: "8%",  left: "4%",  size: "1.6rem", rot: "15deg",  op: 0.3 },
        { e: "🐾", top: "14%", left: "92%", size: "1.4rem", rot: "-10deg", op: 0.25 },
        { e: "✦",  top: "5%",  left: "55%", size: "1.2rem", rot: "20deg",  op: 0.2 },
        { e: "⭐", top: "80%", left: "6%",  size: "1.1rem", rot: "8deg",   op: 0.25 },
      ].map((d, i) => (
        <span key={i} style={{
          position: "fixed", fontSize: d.size, top: d.top, left: d.left,
          transform: `rotate(${d.rot})`, opacity: d.op,
          pointerEvents: "none", zIndex: 0,
        }}>{d.e}</span>
      ))}

      {/* ── Header ── */}
      <header style={{
        background: "#FFE033",
        borderBottom: "3px solid #1A1A1A",
        padding: "8px 20px",
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0, position: "relative", zIndex: 10,
        boxShadow: "0 3px 0 #1A1A1A",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "42px", height: "42px", borderRadius: "50%",
            background: "#FF8C42", border: "3px solid #1A1A1A",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.4rem", boxShadow: "2px 2px 0 #1A1A1A",
          }}>🐾</div>
          <div>
            <h1 style={{
              fontSize: "1.4rem", margin: 0, color: "#1A1A1A",
              fontFamily: "'Chewy', cursive", lineHeight: 1.1,
            }}>Pet Melody</h1>
            <p style={{
              fontSize: "0.75rem", margin: 0, color: "#5A3A00",
              fontFamily: "'Chewy', cursive",
            }}>dibuja · escucha · guarda 🎵</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "6px" }}>
          {TABS.map((t) => {
            const isActive = screen === t.id;
            return (
              <button
                key={t.id}
                onClick={() => !t.locked && setScreen(t.id)}
                style={{
                  padding: "8px 20px", borderRadius: "50px",
                  background: isActive ? "#FF8C42" : t.locked ? "#E8E0C8" : "#FFFBF2",
                  border: isActive ? "4px solid #1A1A1A" : "3px solid #1A1A1A",
                  color: t.locked ? "#AAA" : "#1A1A1A",
                  cursor: t.locked ? "not-allowed" : "pointer",
                  fontFamily: "'Chewy', cursive", fontSize: "1rem",
                  boxShadow: isActive ? "2px 2px 0 #1A1A1A" : "3px 3px 0 #1A1A1A",
                  transform: isActive ? "translate(1px,1px)" : "none",
                  transition: "all 0.1s",
                }}
              >
                {t.label}{t.locked ? " 🔒" : ""}
              </button>
            );
          })}
        </div>

        {/* Pet chip — click to open save modal */}
        <button
          onClick={() => drawingDataUrl && setShowSaveModal(true)}
          title={drawingDataUrl ? "Guardar mascota" : "Dibuja primero"}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            background: savedPet ? "#B8E04A" : "#FFFBF2",
            border: "3px solid #1A1A1A",
            borderRadius: "50px", padding: "5px 14px",
            boxShadow: "3px 3px 0 #1A1A1A",
            cursor: drawingDataUrl ? "pointer" : "default",
            fontFamily: "'Chewy', cursive",
            transition: "all 0.1s",
          }}
          onMouseDown={e => { if (drawingDataUrl) { e.currentTarget.style.transform = "translate(1px,1px)"; e.currentTarget.style.boxShadow = "2px 2px 0 #1A1A1A"; }}}
          onMouseUp={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "3px 3px 0 #1A1A1A"; }}
        >
          {drawingDataUrl
            ? <img src={drawingDataUrl} style={{ width:"28px", height:"28px", borderRadius:"6px", border:"2px solid #1A1A1A", objectFit:"cover" }} />
            : <span style={{ fontSize: "1.2rem" }}>🐱</span>
          }
          <span style={{ fontSize: "0.95rem", color: "#1A1A1A" }}>
            {savedPet ? `${savedPet.name} ✅` : petName}
          </span>
        </button>
      </header>

      {/* ── Screens ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ position: "relative", zIndex: 1 }}>
        {screen === "draw" && (
          <DrawMode onSaveDrawing={handleSaveDrawing} />
        )}
        {screen === "play" && (
          <PlayMode
            drawingDataUrl={drawingDataUrl}
            onMelodyReady={setMelody}
            onPlayingChange={setIsPlaying}
            externalPlayTrigger={playTrigger}
            onSavePet={() => setShowSaveModal(true)}
            savedPet={savedPet}
          />
        )}
        {screen === "profile" && (
          <PetProfile
            currentPet={savedPet}
            melody={melody}
            onPlayMelody={() => { setScreen("play"); setPlayTrigger(p => p + 1); }}
            isPlaying={isPlaying}
          />
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        height: "36px", flexShrink: 0,
        background: "#B8E04A", borderTop: "3px solid #1A1A1A",
        display: "flex", alignItems: "center", justifyContent: "center", gap: "16px",
      }}>
        {["1 · Dibuja 🎨", "→", "2 · Escucha 🎵", "→", "3 · Guarda 🐾"].map((t, i) => (
          <span key={i} style={{
            fontSize: "0.85rem", color: "#1A1A1A",
            fontFamily: "'Chewy', cursive",
            opacity: i % 2 === 1 ? 0.4 : 1,
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
}
