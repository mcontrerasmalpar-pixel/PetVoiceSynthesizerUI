import { useState } from "react";
import type { AnimalType } from "../../lib/supabase";

const ANIMALS: { type: AnimalType; emoji: string; label: string }[] = [
  { type: "cat",     emoji: "🐱", label: "Gato"   },
  { type: "dog",     emoji: "🐶", label: "Perro"  },
  { type: "bird",    emoji: "🐦", label: "Pájaro" },
  { type: "frog",    emoji: "🐸", label: "Rana"   },
  { type: "rabbit",  emoji: "🐰", label: "Conejo" },
  { type: "hamster", emoji: "🐹", label: "Hámster"},
];

interface SavePetModalProps {
  drawingDataUrl: string;
  ownerName: string;
  onSave: (name: string, animal: AnimalType) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

export function SavePetModal({ drawingDataUrl, ownerName, onSave, onClose, saving }: SavePetModalProps) {
  const [name,   setName]   = useState("");
  const [animal, setAnimal] = useState<AnimalType>("cat");

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#FFFBF2",
        border: "4px solid #1A1A1A",
        borderRadius: "24px",
        padding: "28px 28px 24px",
        width: "min(420px, 92vw)",
        boxShadow: "8px 8px 0 #1A1A1A",
        display: "flex", flexDirection: "column", gap: "16px",
        fontFamily: "'Chewy', cursive",
      }}>
        <h2 style={{ margin: 0, fontSize: "1.6rem", color: "#1A1A1A" }}>Guarda tu mascota 🐾</h2>

        {/* Preview */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <img
            src={drawingDataUrl}
            style={{
              width: "120px", height: "120px",
              border: "4px solid #1A1A1A", borderRadius: "18px",
              objectFit: "cover", boxShadow: "4px 4px 0 #1A1A1A",
            }}
          />
        </div>

        {/* Pet name */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "1rem", color: "#1A1A1A" }}>Nombre de la mascota</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ej. Mochi, Luna, Coco..."
            maxLength={24}
            style={{
              padding: "10px 14px",
              border: "3px solid #1A1A1A", borderRadius: "12px",
              fontFamily: "'Chewy',cursive", fontSize: "1.1rem",
              outline: "none", background: "#FFF9EE",
            }}
          />
        </div>

        {/* Animal type */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ fontSize: "1rem", color: "#1A1A1A" }}>¿Qué animal es?</label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {ANIMALS.map(a => (
              <button
                key={a.type}
                onClick={() => setAnimal(a.type)}
                style={{
                  padding: "8px 14px", borderRadius: "50px",
                  background: animal === a.type ? "#FFE033" : "#F0EBD8",
                  border: animal === a.type ? "4px solid #1A1A1A" : "3px solid #1A1A1A",
                  cursor: "pointer", fontFamily: "'Chewy',cursive",
                  fontSize: "1rem", color: "#1A1A1A",
                  boxShadow: animal === a.type ? "2px 2px 0 #1A1A1A" : "3px 3px 0 #1A1A1A",
                  transform: animal === a.type ? "translate(1px,1px)" : "none",
                  transition: "all 0.1s",
                  display: "flex", alignItems: "center", gap: "5px",
                }}
              >
                <span>{a.emoji}</span><span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "10px 22px", borderRadius: "50px",
              background: "#F0EBD8", border: "3px solid #1A1A1A",
              cursor: "pointer", fontFamily: "'Chewy',cursive",
              fontSize: "1rem", color: "#1A1A1A",
              boxShadow: "3px 3px 0 #1A1A1A",
            }}
          >Cancelar</button>
          <button
            onClick={() => name.trim() && onSave(name.trim(), animal)}
            disabled={!name.trim() || saving}
            style={{
              padding: "10px 22px", borderRadius: "50px",
              background: name.trim() && !saving ? "#B8E04A" : "#CCC",
              border: "3px solid #1A1A1A",
              cursor: name.trim() && !saving ? "pointer" : "not-allowed",
              fontFamily: "'Chewy',cursive",
              fontSize: "1rem", color: "#1A1A1A",
              boxShadow: "3px 3px 0 #1A1A1A",
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            {saving ? "⏳ Guardando..." : "✅ Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
