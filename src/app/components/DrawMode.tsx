import { useRef, useState, useCallback, useEffect } from "react";

const CRAYON_COLORS = [
  { name: "Cherry", color: "#FF6B8A" },
  { name: "Ocean", color: "#5BAEFF" },
  { name: "Mint", color: "#5FD49A" },
  { name: "Grape", color: "#C06BDB" },
  { name: "Sun", color: "#FFD06B" },
  { name: "Coral", color: "#FF8C6B" },
  { name: "Sky", color: "#5BD4D2" },
  { name: "Cocoa", color: "#6B4226" },
];

interface DrawModeProps {
  onSaveDrawing: (dataUrl: string) => void;
}

export function DrawMode({ onSaveDrawing }: DrawModeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [color, setColor] = useState(CRAYON_COLORS[0].color);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FDF6E8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // linen weave texture
    for (let y = 0; y < canvas.height; y += 4) {
      for (let x = 0; x < canvas.width; x += 4) {
        const v = Math.random() * 0.045;
        ctx.fillStyle = `rgba(139,107,74,${v})`;
        ctx.fillRect(x, y, 2, 1);
        ctx.fillStyle = `rgba(139,107,74,${v * 0.6})`;
        ctx.fillRect(x + 2, y + 2, 2, 1);
      }
    }
  }, []);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    setLastPos(pos);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }, [color]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 0.65;
    ctx.shadowBlur = 6;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    setLastPos(pos);
  }, [isDrawing, lastPos, color]);

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) onSaveDrawing(canvas.toDataURL());
  }, [onSaveDrawing]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#FDF6E8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y += 4) {
      for (let x = 0; x < canvas.width; x += 4) {
        const v = Math.random() * 0.045;
        ctx.fillStyle = `rgba(139,107,74,${v})`;
        ctx.fillRect(x, y, 2, 1);
        ctx.fillStyle = `rgba(139,107,74,${v * 0.6})`;
        ctx.fillRect(x + 2, y + 2, 2, 1);
      }
    }
    onSaveDrawing(canvas.toDataURL());
  };

  return (
    <div
      className="flex-1 flex gap-6 p-5 overflow-hidden"
      style={{ fontFamily: "'Caveat', cursive" }}
    >
      {/* ── Left: Polaroid ── */}
      <div className="flex flex-col items-center justify-center gap-4" style={{ width: "38%" }}>
        {/* kawaii label */}
        <div
          style={{
            background: "linear-gradient(135deg, #F9C4D0, #C8F0E0)",
            borderRadius: "50px",
            padding: "6px 20px",
            border: "2px dashed #8B6B4A",
            boxShadow: "3px 3px 0 #C4975A",
          }}
        >
          <span style={{ fontSize: "1.4rem", color: "#3D2B1F", fontWeight: 700 }}>
            🐾 Referencia ✨
          </span>
        </div>

        {/* Polaroid */}
        <div
          style={{
            background: "#FFFDF6",
            padding: "14px 14px 58px 14px",
            boxShadow: "5px 8px 24px rgba(61,43,31,0.28), 0 2px 6px rgba(61,43,31,0.1)",
            transform: "rotate(-3.5deg)",
            border: "1.5px solid #E8DCC8",
            maxWidth: "300px",
            width: "100%",
            position: "relative",
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop&auto=format"
            alt="Cute cat"
            style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block", borderRadius: "2px" }}
          />
          <p
            style={{
              textAlign: "center",
              marginTop: "10px",
              color: "#7A5C44",
              fontSize: "1.7rem",
              fontFamily: "'Caveat', cursive",
              fontWeight: 700,
            }}
          >
            Mochi ♡
          </p>
          {/* tape strips */}
          <div style={{ position: "absolute", top: "-10px", left: "18px", width: "44px", height: "20px", background: "rgba(168,216,176,0.55)", transform: "rotate(-8deg)", borderRadius: "2px" }} />
          <div style={{ position: "absolute", top: "-10px", right: "22px", width: "44px", height: "20px", background: "rgba(245,228,160,0.55)", transform: "rotate(6deg)", borderRadius: "2px" }} />
        </div>

        {/* Colour palette */}
        <div
          style={{
            background: "#FFFBF2",
            borderRadius: "20px",
            padding: "14px 18px",
            border: "2px dashed #8B6B4A",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            boxShadow: "3px 3px 0 #C4975A",
          }}
        >
          <span style={{ fontSize: "1.2rem", color: "#7A5C44", fontWeight: 600 }}>
            🖍️ Elige tu crayón
          </span>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
            {CRAYON_COLORS.map((c) => (
              <button
                key={c.color}
                title={c.name}
                onClick={() => setColor(c.color)}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: c.color,
                  border: color === c.color ? "3.5px solid #3D2B1F" : "2.5px dashed rgba(61,43,31,0.25)",
                  cursor: "pointer",
                  transform: color === c.color ? "scale(1.22)" : "scale(1)",
                  transition: "transform 0.14s",
                  boxShadow: color === c.color ? `0 0 0 2px white, 0 0 0 4px ${c.color}` : "0 2px 4px rgba(0,0,0,0.15)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Canvas ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 relative">
        <div
          style={{
            background: "linear-gradient(135deg, #F5E4A0, #F2AABB)",
            borderRadius: "50px",
            padding: "6px 20px",
            border: "2px dashed #8B6B4A",
            boxShadow: "3px 3px 0 #C4975A",
          }}
        >
          <span style={{ fontSize: "1.4rem", color: "#3D2B1F", fontWeight: 700 }}>
            🎨 ¡Dibuja a tu mascota! 🎵
          </span>
        </div>

        {/* Stretched canvas with wooden frame */}
        <div
          style={{
            padding: "18px",
            background: "linear-gradient(135deg, #A0622A, #7A4520, #A0622A, #8B5020)",
            borderRadius: "6px",
            boxShadow: "0 8px 28px rgba(61,43,31,0.35), inset 0 0 12px rgba(0,0,0,0.4)",
            position: "relative",
          }}
        >
          {/* corner pegs */}
          {[
            { top: "8px", left: "8px" }, { top: "8px", right: "8px" },
            { bottom: "8px", left: "8px" }, { bottom: "8px", right: "8px" },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "radial-gradient(circle at 35% 35%, #D4A040, #8B5020)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
                ...s,
              }}
            />
          ))}
          <canvas
            ref={canvasRef}
            width={430}
            height={430}
            style={{
              display: "block",
              cursor: "crosshair",
              borderRadius: "2px",
              touchAction: "none",
              boxShadow: "inset 0 0 8px rgba(0,0,0,0.15)",
            }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
        </div>

        {/* Toolbar: only crayon indicator + clear */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            background: "#FFFBF2",
            borderRadius: "50px",
            padding: "10px 22px",
            border: "2.5px dashed #8B6B4A",
            boxShadow: "4px 4px 0 #C4975A",
          }}
        >
          {/* Current color swatch */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.4rem" }}>🖍️</span>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: color,
                border: "2.5px dashed #8B6B4A",
                boxShadow: `0 0 0 2px white, 0 0 8px ${color}80`,
              }}
            />
            <span style={{ fontSize: "1.1rem", color: "#7A5C44" }}>Crayón</span>
          </div>

          <div style={{ width: "1px", height: "36px", background: "#C4975A" }} />

          <button
            onClick={clearCanvas}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 18px",
              borderRadius: "50px",
              background: "#F2AABB",
              border: "2px dashed #5A1A2E",
              cursor: "pointer",
              fontFamily: "'Caveat', cursive",
              fontSize: "1.1rem",
              color: "#5A1A2E",
              fontWeight: 700,
              boxShadow: "3px 3px 0 #C47080",
              transition: "transform 0.1s",
            }}
            onMouseDown={e => (e.currentTarget.style.transform = "translate(2px,2px)")}
            onMouseUp={e => (e.currentTarget.style.transform = "")}
          >
            ✨ Limpiar
          </button>
        </div>

        {/* floating sparkles */}
        {[
          { s: "1.8rem", t: "22px", r: "18px", rot: "18deg", op: 0.7, e: "⭐" },
          { s: "1.3rem", b: "88px", r: "22px", rot: "-10deg", op: 0.65, e: "🌸" },
          { s: "1.5rem", b: "95px", l: "14px", rot: "8deg", op: 0.7, e: "💫" },
          { s: "1.2rem", t: "28px", l: "16px", rot: "-15deg", op: 0.6, e: "✨" },
        ].map((d, i) => (
          <span key={i} style={{
            position: "absolute",
            fontSize: d.s,
            top: d.t,
            bottom: (d as any).b,
            right: (d as any).r,
            left: (d as any).l,
            transform: `rotate(${d.rot})`,
            opacity: d.op,
            pointerEvents: "none",
          }}>{d.e}</span>
        ))}
      </div>
    </div>
  );
}
