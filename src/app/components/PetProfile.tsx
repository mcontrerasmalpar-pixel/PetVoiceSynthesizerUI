import { useState, useEffect } from "react";
import { fetchPets, type Pet, type AnimalType } from "../../lib/supabase";
import type { MelodyNote } from "./PlayMode";

const ANIMAL_EMOJI: Record<AnimalType, string> = {
  cat:     "🐱",
  dog:     "🐶",
  bird:    "🐦",
  frog:    "🐸",
  rabbit:  "🐰",
  hamster: "🐹",
};

const CARD_COLORS = [
  "#FF6B8A", "#FFE033", "#B8E04A", "#5BC8F5", "#C06BDB", "#FF8C42",
];

interface PetProfileProps {
  /** current user's just-saved pet (may be null if not saved yet) */
  currentPet: Pet | null;
  /** melody notes for the current pet */
  melody: MelodyNote[];
  onPlayMelody: () => void;
  isPlaying: boolean;
}

export function PetProfile({ currentPet, melody, onPlayMelody, isPlaying }: PetProfileProps) {
  const [allPets, setAllPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPets().then(pets => {
      setAllPets(pets);
      setLoading(false);
    });
  }, [currentPet]);

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      overflow: "hidden", fontFamily: "'Chewy', cursive",
      background: "#5BC8F5",
    }}>

      {/* ── Hero: current pet ── */}
      {currentPet && (
        <div style={{
          background: "#FFE033",
          borderBottom: "3px solid #1A1A1A",
          padding: "16px 24px",
          display: "flex", alignItems: "center", gap: "20px",
          flexShrink: 0,
          boxShadow: "0 3px 0 #1A1A1A",
        }}>
          {/* Drawing */}
          <div style={{
            width: "100px", height: "100px",
            border: "4px solid #1A1A1A", borderRadius: "20px",
            overflow: "hidden", flexShrink: 0,
            boxShadow: "5px 5px 0 #1A1A1A",
            background: "#FFFBF2",
          }}>
            {currentPet.drawing_url
              ? <img src={currentPet.drawing_url} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", fontSize:"3rem" }}>
                  {ANIMAL_EMOJI[currentPet.animal_type]}
                </div>
            }
          </div>

          {/* Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "2rem" }}>{ANIMAL_EMOJI[currentPet.animal_type]}</span>
              <span style={{ fontSize: "1.8rem", color: "#1A1A1A" }}>{currentPet.name}</span>
            </div>
            <span style={{ fontSize: "0.9rem", color: "#5A3A00" }}>de {currentPet.owner_name}</span>
            <span style={{ fontSize: "0.8rem", color: "#888" }}>
              {melody.filter(n => !n.rest).length} notas · perfil guardado ✅
            </span>
          </div>

          {/* Play button */}
          <div style={{ marginLeft: "auto" }}>
            <button
              onClick={onPlayMelody}
              style={{
                width: "70px", height: "70px", borderRadius: "50%",
                background: isPlaying ? "#FF6B8A" : "#B8E04A",
                border: "4px solid #1A1A1A",
                fontSize: "2rem", cursor: "pointer",
                boxShadow: "4px 4px 0 #1A1A1A",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.1s",
              }}
              onMouseDown={e => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = "2px 2px 0 #1A1A1A"; }}
              onMouseUp={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "4px 4px 0 #1A1A1A"; }}
            >
              {isPlaying ? "⏹" : "▶️"}
            </button>
          </div>
        </div>
      )}

      {/* ── Gallery: all pets ── */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "16px 20px",
      }}>
        <h2 style={{
          fontSize: "1.2rem", color: "#1A1A1A",
          margin: "0 0 12px", fontFamily: "'Chewy',cursive",
        }}>🐾 Mascotas guardadas</h2>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#FFFBF2", fontSize: "1.1rem" }}>
            ⏳ Cargando mascotas...
          </div>
        ) : allPets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#FFFBF2", fontSize: "1rem" }}>
            Sé el primero en guardar tu mascota 🎨
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "12px",
          }}>
            {allPets.map((pet, i) => (
              <div key={pet.id} style={{
                background: CARD_COLORS[i % CARD_COLORS.length],
                border: "3px solid #1A1A1A",
                borderRadius: "20px",
                padding: "12px",
                boxShadow: "4px 4px 0 #1A1A1A",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
                cursor: "default",
              }}>
                {/* Drawing or emoji */}
                <div style={{
                  width: "80px", height: "80px",
                  border: "3px solid #1A1A1A", borderRadius: "14px",
                  overflow: "hidden", background: "#FFFBF2",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {pet.drawing_url
                    ? <img src={pet.drawing_url} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : <span style={{ fontSize: "2.5rem" }}>{ANIMAL_EMOJI[pet.animal_type] ?? "🐾"}</span>
                  }
                </div>

                <span style={{ fontSize: "1.1rem", color: "#1A1A1A", textAlign: "center" }}>
                  {ANIMAL_EMOJI[pet.animal_type] ?? "🐾"} {pet.name}
                </span>
                <span style={{ fontSize: "0.7rem", color: "#1A1A1A", opacity: 0.7 }}>
                  {pet.owner_name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
