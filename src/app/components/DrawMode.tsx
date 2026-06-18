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
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const videoRef       = useRef<HTMLVideoElement>(null);
  const lastPosRef     = useRef<{ x: number; y: number } | null>(null);
  const isDrawingRef   = useRef(false);
  const lastPosStateRef = useRef({ x: 0, y: 0 });

  const [color, setColor]           = useState(CRAYON_COLORS[0].color);
  const [brushSize, setBrushSize]   = useState(1);
  const [camEnabled, setCamEnabled] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 300, h: 300 });

  const videoRefForHook = camEnabled ? videoRef : { current: null };
  const { fingerPos, isPinching, status } = useHandTracking(
    videoRefForHook as React.RefObject<HTMLVideoElement | null>
  );

  // ── Measure container and set canvas size ────────────────────────────────
  useEffect(() => {
    const measure = () => {
      const c = containerRef.current;
      if (!c) return;
      const w = c.clientWidth  - 16;
      const h = c.clientHeight - 80; // leave room for status badge
      setCanvasSize({ w: Math.max(w, 100), h: Math.max(h, 100) });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

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

  useEffect(() => { initCanvas(); }, [initCanvas, canvasSize]);

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

  // ── MediaPipe drawing ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!camEnabled || !fingerPos) { lastPosRef.current = null; return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = fingerPos.x * canvas.width;
    const cy = fingerPos.y * canvas.height;
    if (isPinching) {
      lastPosRef.current = null;
      onSaveDrawing(canvas.toDataURL());
      return;
    }
    if (lastPosRef.current) {
      drawStroke(lastPosRef.current, { x: cx, y: cy });
    } else {
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

  // ── Get canvas coords from mouse or touch ─────────────────────────────────
  const getPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top)  * scaleY,
    };
  }, []);

  // ── Attach native (non-passive) touch listeners directly ─────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (camEnabled) return;
      isDrawingRef.current = true;
      const t = e.touches[0];
      const pos = getPos(t.clientX, t.clientY);
      lastPosStateRef.current = pos;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, BRUSH_SIZES[brushSize].size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current || camEnabled) return;
      const t = e.touches[0];
      const pos = getPos(t.clientX, t.clientY);
      drawStroke(lastPosStateRef.current, pos);
      lastPosStateRef.current = pos;
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      isDrawingRef.current = false;
      onSaveDrawing(canvas.toDataURL());
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove",  onTouchMove,  { passive: false });
    canvas.addEventListener("touchend",   onTouchEnd,   { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove",  onTouchMove);
      canvas.removeEventListener("touchend",   onTouchEnd);
    };
  }, [camEnabled, color, brushSize, drawStroke, getPos, onSaveDrawing]);

  // ── Mouse handlers ────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (camEnabled) return;
    isDrawingRef.current = true;
    const pos = getPos(e.clientX, e.clientY);
    lastPosStateRef.current = pos;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, BRUSH_SIZES[brushSize].size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [camEnabled, color, brushSize, getPos]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || camEnabled) return;
    const pos = getPos(e.clientX, e.clientY);
    drawStroke(lastPosStateRef.current, pos);
    lastPosStateRef.current = pos;
  }, [camEnabled, drawStroke, getPos]);

  const onMouseUp = useCallback(() => {
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) onSaveDrawing(canvas.toDataURL());
  }, [onSaveDrawing]);

  const clearCanvas = () => {
    initCanvas();
    onSaveDrawing(canvasRef.current?.toDataURL() ?? "");
  };

  const cursorStyle = (() => {
    if (!camEnabled || !fingerPos) return null;
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

      {/* ── Left sidebar ── */}
      <div style={{
        width: "64px", flexShrink: 0,
        background: "#FFE033",
        borderRight: "3px solid #1A1A1A",
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: "8px",
        padding: "10px 0",
        overflowY: "auto",
      }}>
        <span style={{ fontSize: "0.6rem", color: "#1A1A1A" }}>SIZE</span>
        {BRUSH_SIZES.map((b, i) => (
          <button key={b.label} onClick={() => setBrushSize(i)} style={{
            width: `${16 + i * 8}px`, height: `${16 + i * 8}px`,
            borderRadius: "50%",
            background: brushSize === i ? color : "#FFFBF2",
            border: "3px solid #1A1A1A", cursor: "pointer",
            boxShadow: brushSize === i ? "2px 2px 0 #1A1A1A" : "3px 3px 0 #1A1A1A",
            transform: brushSize === i ? "translate(1px,1px)" : "none",
          }} />
        ))}
        <div style={{ width: "44px", height: "3px", background: "#1A1A1A", borderRadius: "2px" }} />
        <span style={{ fontSize: "0.6rem", color: "#1A1A1A" }}>COLOR</span>
        {CRAYON_COLORS.map((c) => (
          <button key={c.color} title={c.name} onClick={() => setColor(c.color)} style={{
            width: "32px", height: "32px", borderRadius: "50%",
            background: c.color,
            border: color === c.color ? "4px solid #1A1A1A" : "3px solid #1A1A1A",
            cursor: "pointer",
            boxShadow: color === c.color ? "2px 2px 0 #1A1A1A" : "3px 3px 0 #1A1A1A",
            transform: color === c.color ? "translate(1px,1px) scale(1.1)" : "none",
          }} />
        ))}
      </div>

      {/* ── Canvas area ── */}
      <div
        ref={containerRef}
        style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "flex-start",
          gap: "8px", padding: "8px",
          background: "#5BC8F5",
          overflow: "hidden",
        }}
      >
        {/* Status badge */}
        <div style={{
          background: status === "active" ? "#B8E04A" : status === "error" ? "#FF6B8A" : "#FFE033",
          border: "3px solid #1A1A1A", borderRadius: "50px",
          padding: "3px 14px", boxShadow: "3px 3px 0 #1A1A1A",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: "0.85rem", color: "#1A1A1A", fontFamily: "'Chewy',cursive" }}>
            {camEnabled ? STATUS_LABELS[status] : "🖱️ Modo ratón activo"}
          </span>
        </div>

        {/* Canvas */}
        <div style={{
          background: "#1A1A1A", borderRadius: "12px",
          padding: "4px", boxShadow: "6px 6px 0 #1A1A1A",
          flexShrink: 0,
        }}>
          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            style={{
              display: "block",
              cursor: camEnabled ? "none" : "crosshair",
              borderRadius: "8px",
              touchAction: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          />
        </div>

        {camEnabled && (
          <video
            ref={videoRef}
            width={180} height={135}
            style={{ display: "none" }}
            playsInline muted
          />
        )}

        {cursorStyle && (
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
          }} />
        )}
      </div>

      {/* ── Right sidebar ── */}
      <div style={{
        width: "72px", flexShrink: 0,
        background: "#B8E04A",
        borderLeft: "3px solid #1A1A1A",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "12px",
        padding: "12px 0",
      }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "50%",
          background: color, border: "3px solid #1A1A1A",
          boxShadow: "3px 3px 0 #1A1A1A",
        }} />
        <span style={{ fontSize: "0.6rem", color: "#1A1A1A", fontFamily: "'Chewy',cursive" }}>color</span>

        <div style={{ width: "52px", height: "3px", background: "#1A1A1A" }} />

        <button onClick={clearCanvas} style={{
          width: "52px", height: "52px", borderRadius: "50%",
          background: "#FF6B8A", border: "3px solid #1A1A1A",
          cursor: "pointer", fontFamily: "'Chewy',cursive",
          fontSize: "0.65rem", color: "#1A1A1A",
          boxShadow: "3px 3px 0 #1A1A1A",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: "2px",
        }}>
          <span style={{ fontSize: "1.1rem" }}>🗑️</span>
          <span>Reset</span>
        </button>

        <button
          onClick={() => setCamEnabled(v => !v)}
          style={{
            width: "52px", height: "52px", borderRadius: "50%",
            background: camEnabled ? "#FFE033" : "#5BC8F5",
            border: camEnabled ? "4px solid #1A1A1A" : "3px solid #1A1A1A",
            cursor: "pointer", fontFamily: "'Chewy',cursive",
            fontSize: "0.65rem", color: "#1A1A1A",
            boxShadow: camEnabled ? "2px 2px 0 #1A1A1A" : "3px 3px 0 #1A1A1A",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: "2px",
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>📷</span>
          <span>{camEnabled ? "Cam ON" : "Cam"}</span>
        </button>
      </div>
    </div>
  );
}
