import { useRef, useState, useCallback, useEffect } from "react";
import { useHandTracking } from "../../hooks/useHandTracking";

const CRAYON_COLORS = [
  { name: "Cherry",  color: "#FF6B8A" },
  { name: "Ocean",   color: "#5BAEFF" },
  { name: "Mint",    color: "#5FD49A" },
  { name: "Grape",   color: "#C06BDB" },
  { name: "Sun",     color: "#FFD06B" },
  { name: "Coral",   color: "#FF8C6B" },
  { name: "Teal",    color: "#5BD4D2" },
  { name: "Dark",    color: "#3A3A3A" },
];

const BRUSH_SIZES = [
  { label: "S", size: 6  },
  { label: "M", size: 14 },
  { label: "L", size: 24 },
];

const STATUS_LABELS: Record<string, string> = {
  idle:     "📷 Cámara apagada",
  loading:  "⏳ Iniciando...",
  active:   "✋ ¡Mano detectada!",
  no_hand:  "👀 Buscando mano...",
  error:    "❌ Sin permiso de cámara",
};

interface DrawModeProps {
  onSaveDrawing: (dataUrl: string) => void;
}

export function DrawMode({ onSaveDrawing }: DrawModeProps) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const lastPosRef  = useRef<{ x: number; y: number } | null>(null);

  const [color, setColor]         = useState(CRAYON_COLORS[0].color);
  const [brushSize, setBrushSize] = useState(1);
  const [camEnabled, setCamEnabled] = useState(false);

  // Mouse/touch drawing state
  const [isMouseDrawing, setIsMouseDrawing] = useState(false);
  const [lastMousePos, setLastMousePos]     = useState({ x: 0, y: 0 });

  // Hand tracking — only active when camEnabled
  const videoRefForHook = camEnabled ? videoRef : { current: null };
  const { fingerPos, isPinching, status } = useHandTracking(
    videoRefForHook as React.RefObject<HTMLVideoElement | null>
  );

  // ── Init canvas ──────────────────────────────────────────────────────────
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFBF2";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(100,100,100,0.12)";
    for (let y = 20; y < canvas.height; y += 20)
      for (let x = 20; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
  }, []);

  useEffect(() => { initCanvas(); }, [initCanvas]);

  // ── Draw stroke helper ────────────────────────────────────────────────────
  const drawStroke = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = color;
      ctx.lineWidth   = BRUSH_SIZES[brushSize].size;
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
      ctx.stroke();
    },
    [color, brushSize]
  );

  // ── MediaPipe: draw with finger ───────────────────────────────────────────
  useEffect(() => {
    if (!camEnabled || !fingerPos) {
      lastPosRef.current = null;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Map normalized coords to canvas pixels
    const cx = fingerPos.x * canvas.width;
    const cy = fingerPos.y * canvas.height;

    if (isPinching) {
      // Pinch = "pen up", save snapshot
      lastPosRef.current = null;
      onSaveDrawing(canvas.toDataURL());
      return;
    }

    if (lastPosRef.current) {
      drawStroke(lastPosRef.current, { x: cx, y: cy });
    } else {
      // First point: draw a dot
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, BRUSH_SIZES[brushSize].size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    lastPosRef.current = { x: cx, y: cy };
  }, [fingerPos, isPinching, camEnabled, drawStroke, color, brushSize, onSaveDrawing]);

  // ── Mouse / touch helpers ─────────────────────────────────────────────────
  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e)
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      };
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  };

  const startMouseDraw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (camEnabled) return; // camera mode takes over
      setIsMouseDrawing(true);
      const pos = getPos(e);
      setLastMousePos(pos);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, BRUSH_SIZES[brushSize].size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [camEnabled, color, brushSize]
  );

  const mouseDraw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!isMouseDrawing || camEnabled) return;
      const pos = getPos(e);
      drawStroke(lastMousePos, pos);
      setLastMousePos(pos);
    },
    [isMouseDrawing, camEnabled, drawStroke, lastMousePos]
  );

  const stopMouseDraw = useCallback(() => {
    setIsMouseDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) onSaveDrawing(canvas.toDataURL());
  }, [onSaveDrawing]);

  const clearCanvas = () => {
    initCanvas();
    onSaveDrawing(canvasRef.current?.toDataURL() ?? "");
  };

  // ── Finger cursor overlay position ───────────────────────────────────────
  const cursorStyle = (() => {
    if (!camEnabled || !fingerPos) return null;
    // We need to map to the canvas DOM element position
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      left: rect.left + fingerPos.x * rect.width,
      top:  rect.top  + fingerPos.y * rect.height,
    };
  })();

  return (
    <div className="flex-1 flex gap-0 overflow-hidden" style={{ fontFamily: "'Chewy', cursive", position: "relative" }}>

      {/* ── Left sidebar: tools ── */}
      <div style={{
        width: "72px", flexShrink: 0,
        background: "#FFE033",
        borderRight: "3px solid #1A1A1A",
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: "10px",
        padding: "14px 0",
        overflowY: "auto",
      }}>
        <span style={{ fontSize: "0.65rem", color: "#1A1A1A" }}>SIZE</span>
        {BRUSH_SIZES.map((b, i) => (
          <button key={b.label} onClick={() => setBrushSize(i)} style={{
            width: `${18 + i * 8}px`, height: `${18 + i * 8}px`,
            borderRadius: "50%",
            background: brushSize === i ? color : "#FFFBF2",
            border: "3px solid #1A1A1A", cursor: "pointer",
            boxShadow: brushSize === i ? "2px 2px 0 #1A1A1A" : "3px 3px 0 #1A1A1A",
            transform: brushSize === i ? "translate(1px,1px)" : "none",
            transition: "all 0.1s",
          }} />
        ))}
        <div style={{ width: "48px", height: "3px", background: "#1A1A1A", borderRadius: "2px" }} />
        <span style={{ fontSize: "0.65rem", color: "#1A1A1A" }}>COLOR</span>
        {CRAYON_COLORS.map((c) => (
          <button key={c.color} title={c.name} onClick={() => setColor(c.color)} style={{
            width: "34px", height: "34px", borderRadius: "50%",
            background: c.color,
            border: color === c.color ? "4px solid #1A1A1A" : "3px solid #1A1A1A",
            cursor: "pointer",
            boxShadow: color === c.color ? "2px 2px 0 #1A1A1A" : "3px 3px 0 #1A1A1A",
            transform: color === c.color ? "translate(1px,1px) scale(1.1)" : "none",
            transition: "all 0.1s",
          }} />
        ))}
      </div>

      {/* ── Center ── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: "10px", padding: "12px",
        background: "#5BC8F5",
      }}>
        {/* Status badge */}
        <div style={{
          background: status === "active" ? "#B8E04A" : status === "error" ? "#FF6B8A" : "#FFE033",
          border: "3px solid #1A1A1A", borderRadius: "50px",
          padding: "4px 18px", boxShadow: "3px 3px 0 #1A1A1A",
        }}>
          <span style={{ fontSize: "0.95rem", color: "#1A1A1A", fontFamily: "'Chewy',cursive" }}>
            {camEnabled ? STATUS_LABELS[status] : "🖱️ Modo ratón activo"}
          </span>
        </div>

        {/* Split view: camera + canvas */}
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>

          {/* Camera feed (shown only when cam enabled) */}
          {camEnabled && (
            <div style={{
              position: "relative",
              border: "4px solid #1A1A1A", borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "4px 4px 0 #1A1A1A",
              background: "#1A1A1A",
              flexShrink: 0,
            }}>
              <video
                ref={videoRef}
                width={220} height={200}
                style={{ display: "block", transform: "scaleX(-1)" }}
                playsInline
                muted
              />
              {/* Camera label */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "rgba(26,26,26,0.7)",
                padding: "4px 8px", textAlign: "center",
              }}>
                <span style={{ fontSize: "0.75rem", color: "#FFE033", fontFamily: "'Chewy',cursive" }}>
                  📷 tu mano aquí
                </span>
              </div>
              {/* Finger dot overlay */}
              {fingerPos && (
                <div style={{
                  position: "absolute",
                  left: `${(1 - fingerPos.x) * 220}px`,
                  top:  `${fingerPos.y * 200}px`,
                  width: "14px", height: "14px",
                  borderRadius: "50%",
                  background: isPinching ? "#FF6B8A" : color,
                  border: "2px solid white",
                  transform: "translate(-50%,-50%)",
                  pointerEvents: "none",
                  boxShadow: `0 0 8px ${color}`,
                }} />
              )}
            </div>
          )}

          {/* Drawing canvas */}
          <div style={{ position: "relative" }}>
            <div style={{
              background: "#1A1A1A", borderRadius: "12px",
              padding: "5px", boxShadow: "6px 6px 0 #1A1A1A",
            }}>
              <canvas
                ref={canvasRef}
                width={camEnabled ? 380 : 440}
                height={380}
                style={{
                  display: "block",
                  cursor: camEnabled ? "none" : "crosshair",
                  borderRadius: "8px",
                  touchAction: "none",
                }}
                onMouseDown={startMouseDraw}
                onMouseMove={mouseDraw}
                onMouseUp={stopMouseDraw}
                onMouseLeave={stopMouseDraw}
                onTouchStart={startMouseDraw}
                onTouchMove={mouseDraw}
                onTouchEnd={stopMouseDraw}
              />
            </div>

            {/* Finger cursor on canvas */}
            {camEnabled && fingerPos && cursorStyle && (
              <div style={{
                position: "fixed",
                left: `${cursorStyle.left}px`,
                top:  `${cursorStyle.top}px`,
                width: `${BRUSH_SIZES[brushSize].size + 8}px`,
                height: `${BRUSH_SIZES[brushSize].size + 8}px`,
                borderRadius: "50%",
                background: isPinching ? "transparent" : `${color}80`,
                border: `3px solid ${isPinching ? "#FF6B8A" : color}`,
                transform: "translate(-50%,-50%)",
                pointerEvents: "none",
                zIndex: 9999,
                transition: "border-color 0.1s, background 0.1s",
              }} />
            )}
          </div>
        </div>

        {/* Pinch hint */}
        {camEnabled && (
          <div style={{
            background: "#FFFBF2", border: "2px solid #1A1A1A",
            borderRadius: "50px", padding: "3px 14px",
          }}>
            <span style={{ fontSize: "0.75rem", color: "#1A1A1A", fontFamily: "'Chewy',cursive" }}>
              ✌️ dedo extendido = dibujar &nbsp;·&nbsp; 🤏 pellizco = levantar pluma
            </span>
          </div>
        )}
      </div>

      {/* ── Right sidebar: actions ── */}
      <div style={{
        width: "88px", flexShrink: 0,
        background: "#B8E04A",
        borderLeft: "3px solid #1A1A1A",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "14px",
        padding: "16px 0",
      }}>
        {/* Active color */}
        <div style={{
          width: "44px", height: "44px", borderRadius: "50%",
          background: color, border: "3px solid #1A1A1A",
          boxShadow: "3px 3px 0 #1A1A1A",
        }} />
        <span style={{ fontSize: "0.65rem", color: "#1A1A1A", fontFamily: "'Chewy',cursive", textAlign: "center" }}>color</span>

        <div style={{ width: "60px", height: "3px", background: "#1A1A1A" }} />

        {/* Reset */}
        <button onClick={clearCanvas} style={{
          width: "60px", height: "60px", borderRadius: "50%",
          background: "#FF6B8A", border: "3px solid #1A1A1A",
          cursor: "pointer", fontFamily: "'Chewy',cursive",
          fontSize: "0.7rem", color: "#1A1A1A",
          boxShadow: "3px 3px 0 #1A1A1A",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: "2px", transition: "all 0.1s",
        }}
          onMouseDown={e => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = "1px 1px 0 #1A1A1A"; }}
          onMouseUp={e =>   { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "3px 3px 0 #1A1A1A"; }}
        >
          <span style={{ fontSize: "1.2rem" }}>🗑️</span>
          <span>Reset</span>
        </button>

        {/* Camera toggle */}
        <button
          onClick={() => setCamEnabled(v => !v)}
          style={{
            width: "60px", height: "60px", borderRadius: "50%",
            background: camEnabled ? "#FFE033" : "#5BC8F5",
            border: camEnabled ? "4px solid #1A1A1A" : "3px solid #1A1A1A",
            cursor: "pointer", fontFamily: "'Chewy',cursive",
            fontSize: "0.7rem", color: "#1A1A1A",
            boxShadow: camEnabled ? "2px 2px 0 #1A1A1A" : "3px 3px 0 #1A1A1A",
            transform: camEnabled ? "translate(1px,1px)" : "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: "2px", transition: "all 0.1s",
          }}
          onMouseDown={e => { e.currentTarget.style.transform = "translate(2px,2px)"; }}
          onMouseUp={e =>   { e.currentTarget.style.transform = camEnabled ? "translate(1px,1px)" : ""; }}
        >
          <span style={{ fontSize: "1.2rem" }}>{camEnabled ? "📷" : "📷"}</span>
          <span>{camEnabled ? "Cam ON" : "Cam"}</span>
        </button>
      </div>
    </div>
  );
}
