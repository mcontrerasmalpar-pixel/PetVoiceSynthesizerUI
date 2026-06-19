import { useState, useCallback, useRef } from "react";
import { DrawMode }        from "./components/DrawMode";
import { PlayMode }        from "./components/PlayMode";
import { ExperimentMode } from "./components/ExperimentMode";
import { PetProfile }     from "./components/PetProfile";
import { SavePetModal }   from "./components/SavePetModal";
import { LoginScreen }    from "./components/LoginScreen";
import { uploadDrawing, savePet, type AnimalType, type Pet } from "../lib/supabase";
import type { MelodyNote } from "./components/PlayMode";

type Screen = "draw" | "play" | "experiment" | "profile";

export default function App() {
  const [loggedIn,       setLoggedIn]       = useState(false);
  const [ownerName,      setOwnerName]      = useState("Tú");
  const [screen,         setScreen]         = useState<Screen>("draw");
  const [drawingDataUrl, setDrawingDataUrl] = useState<string | null>(null);
  const [showSaveModal,  setShowSaveModal]  = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [savedPet,       setSavedPet]       = useState<Pet | null>(null);
  const [melody,         setMelody]         = useState<MelodyNote[]>([]);
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [playTrigger,    setPlayTrigger]    = useState(0);

  const stopMelodyRef = useRef<(() => void) | null>(null);

  const handleLogin = (name: string) => {
    setOwnerName(name || "Tú");
    setLoggedIn(true);
  };

  const handleSaveDrawing = useCallback((url: string) => {
    setDrawingDataUrl(url);
  }, []);

  const handleSavePet = async (name: string, animal: AnimalType) => {
    setSaving(true);
    try {
      const drawingUrl = drawingDataUrl ? await uploadDrawing(drawingDataUrl, name) : null;
      const pet = await savePet({
        name, animal_type: animal, owner_name: ownerName,
        drawing_url: drawingUrl, melody_json: melody,
      });
      if (pet) { setSavedPet(pet); setShowSaveModal(false); setScreen("profile"); }
    } finally { setSaving(false); }
  };

  const goTo = (s: Screen) => {
    stopMelodyRef.current?.();
    setScreen(s);
  };

  if (!loggedIn) return <LoginScreen onLogin={handleLogin} />;

  const TABS: { id: Screen; label: string; locked?: boolean }[] = [
    { id: "draw",       label: "🎨 Draw" },
    { id: "play",       label: "🎵 Listen" },
    { id: "experiment", label: "🎛️ Remix" },
    { id: "profile",    label: "🐾 Profile", locked: !savedPet },
  ];

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      overflow: "hidden", background: "#5BC8F5",
      fontFamily: "'Chewy', cursive",
    }}>
      {showSaveModal && drawingDataUrl && (
        <SavePetModal
          drawingDataUrl={drawingDataUrl} ownerName={ownerName}
          onSave={handleSavePet} onClose={() => setShowSaveModal(false)} saving={saving}
        />
      )}

      <header style={{
        flexShrink: 0, background: "#FFE033",
        borderBottom: "3px solid #1A1A1A", boxShadow: "0 3px 0 #1A1A1A",
        padding: "6px 12px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: "8px", zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:"6px", flexShrink:0 }}>
          <div style={{
            width:"34px", height:"34px", borderRadius:"50%",
            background:"#FF8C42", border:"3px solid #1A1A1A",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"1.1rem", boxShadow:"2px 2px 0 #1A1A1A",
          }}>🎨</div>
          <div>
            <div style={{ fontSize:"1rem", color:"#1A1A1A", fontFamily:"'Chewy'", lineHeight:1 }}>Doodio</div>
            <div style={{ fontSize:"0.58rem", color:"#5A3A00", fontFamily:"'Chewy'", lineHeight:1 }}>Hi, {ownerName} 👋</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => !t.locked && goTo(t.id)} style={{
              padding:"5px 10px", borderRadius:"50px",
              background: screen===t.id ? "#FF8C42" : t.locked ? "#E8E0C8" : "#FFFBF2",
              border: screen===t.id ? "3px solid #1A1A1A" : "2px solid #1A1A1A",
              color: t.locked ? "#AAA" : "#1A1A1A",
              cursor: t.locked ? "not-allowed" : "pointer",
              fontFamily:"'Chewy'", fontSize:"0.78rem",
              boxShadow: "2px 2px 0 #1A1A1A",
              transform: screen===t.id ? "translate(1px,1px)" : "none",
              whiteSpace: "nowrap",
            }}>{t.label}{t.locked ? " 🔒" : ""}</button>
          ))}
        </div>

        {/* Save button */}
        <button onClick={() => drawingDataUrl && setShowSaveModal(true)} style={{
          display:"flex", alignItems:"center", gap:"6px",
          background: savedPet ? "#B8E04A" : "#FFFBF2",
          border:"3px solid #1A1A1A", borderRadius:"50px",
          padding:"4px 12px", boxShadow:"3px 3px 0 #1A1A1A",
          cursor: drawingDataUrl ? "pointer" : "default",
          fontFamily:"'Chewy'", flexShrink:0,
        }}>
          {drawingDataUrl
            ? <img src={drawingDataUrl} style={{ width:"22px",height:"22px",borderRadius:"4px",border:"2px solid #1A1A1A",objectFit:"cover" }} />
            : <span style={{ fontSize:"0.95rem" }}>🎵</span>}
          <span style={{ fontSize:"0.8rem", color:"#1A1A1A" }}>
            {savedPet ? `${savedPet.name} ✅` : "Save"}
          </span>
        </button>
      </header>

      <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        {screen === "draw" && (
          <DrawMode
            onSaveDrawing={handleSaveDrawing}
            onGoToListen={() => goTo("play")}
            hasDrawing={!!drawingDataUrl}
          />
        )}
        {screen === "play" && (
          <PlayMode
            drawingDataUrl={drawingDataUrl}
            onMelodyReady={setMelody}
            onPlayingChange={setIsPlaying}
            externalPlayTrigger={playTrigger}
            onSavePet={() => setShowSaveModal(true)}
            savedPet={savedPet}
            onStopRef={stopMelodyRef}
          />
        )}
        {screen === "experiment" && (
          <ExperimentMode melody={melody} />
        )}
        {screen === "profile" && (
          <PetProfile
            currentPet={savedPet} melody={melody}
            onPlayMelody={() => { goTo("play"); setPlayTrigger(p => p+1); }}
            isPlaying={isPlaying}
          />
        )}
      </div>

      {/* Footer steps */}
      <div style={{
        flexShrink:0, height:"28px",
        background:"#B8E04A", borderTop:"3px solid #1A1A1A",
        display:"flex", alignItems:"center", justifyContent:"center", gap:"10px",
      }}>
        {["1 · Draw 🎨","→","2 · Listen 🎵","→","3 · Remix 🎛️","→","4 · Save 💾"].map((t,i) => (
          <span key={i} style={{ fontSize:"0.72rem",color:"#1A1A1A",fontFamily:"'Chewy'",opacity:i%2===1?0.4:1 }}>{t}</span>
        ))}
      </div>
    </div>
  );
}
