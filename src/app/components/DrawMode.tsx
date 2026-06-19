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
  idle:    "📷 Camera off",
  loading: "⏳ Starting...",
  active:  "✋ Hand detected!",
  no_hand: "👀 Looking for hand...",
  error:   "❌ No camera permission",
};

interface DrawModeProps {
  onSaveDrawing: (dataUrl: string) => void;
  onGoToListen:  () => void;
  hasDrawing:    boolean;
}

export function DrawMode({ onSaveDrawing, onGoToListen, hasDrawing }: DrawModeProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const wrapRef      = useRef<HTMLDivElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const lastPosRef   = useRef<{ x: number; y: number } | null>(null);
  const isDrawingRef = useRef(false);
  const lastTouchPos = useRef({ x: 0, y: 0 });

  const [color,      setColor]      = useState(CRAYON_COLORS[0].color);
  const [brushSize,  setBrushSize]  = useState(1);
  const [camEnabled, setCamEnabled] = useState(false);
  const [canvasWH,   setCanvasWH]   = useState({ w: 300, h: 300 });

  const colorRef   = useRef(color);
  const brushRef   = useRef(brushSize);
  const camRef     = useRef(camEnabled);
  const saveRef    = useRef(onSaveDrawing);
  useEffect(() => { colorRef.current  = color; },         [color]);
  useEffect(() => { brushRef.current  = brushSize; },     [brushSize]);
  useEffect(() => { camRef.current    = camEnabled; },    [camEnabled]);
  useEffect(() => { saveRef.current   = onSaveDrawing; }, [onSaveDrawing]);

  const videoRefForHook = camEnabled ? videoRef : { current: null };
  const { fingerPos, isPinching, status } = useHandTracking(
    videoRefForHook as React.RefObject<HTMLVideoElement | null>
  );

  useEffect(() => {
    const measure = () => {
      const el = wrapRef.current;
      if (!el) return;
      // Reserve ~60px for the bottom button bar
      const maxH = Math.max(el.clientHeight - 60, 80);
      const maxW = Math.max(el.clientWidth - 16, 80);
      // Keep canvas square using the smaller dimension, capped at maxH
      const side = Math.min(maxW, maxH);
      setCanvasWH({ w: side, h: side });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const initCanvas = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#FFFBF2";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "rgba(100,100,100,0.12)";
    for (let y = 20; y < c.height; y += 20)
      for (let x = 20; x < c.width; x += 20) {
        ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
      }
  }, []);
  useEffect(() => { initCanvas(); }, [initCanvas, canvasWH]);

  const drawStroke = useCallback((
    from: { x: number; y: number },
    to:   { x: number; y: number },
    col:  string,
    sz:   number
  ) => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = col; ctx.lineWidth = sz;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke();
  }, []);

  useEffect(() => {
    if (!camEnabled || !fingerPos) { lastPosRef.current = null; return; }
    const c = canvasRef.current; if (!c) return;
    const cx = fingerPos.x * c.width, cy = fingerPos.y * c.height;
    if (isPinching) { lastPosRef.current = null; saveRef.current(c.toDataURL()); return; }
    if (lastPosRef.current) {
      drawStroke(lastPosRef.current, { x: cx, y: cy }, color, BRUSH_SIZES[brushSize].size);
    } else {
      const ctx = c.getContext("2d");
      if (ctx) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, BRUSH_SIZES[brushSize].size / 2, 0, Math.PI * 2); ctx.fill(); }
    }
    lastPosRef.current = { x: cx, y: cy };
  }, [fingerPos, isPinching, camEnabled, drawStroke, color, brushSize]);

  const getPos = useCallback((clientX: number, clientY: number) => {
    const c = canvasRef.current; if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return {
      x: (clientX - r.left) * (c.width  / r.width),
      y: (clientY - r.top)  * (c.height / r.height),
    };
  }, []);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const onTS = (e: TouchEvent) => {
      e.preventDefault();
      if (camRef.current) return;
      isDrawingRef.current = true;
      const t = e.touches[0];
      const pos = getPos(t.clientX, t.clientY);
      lastTouchPos.current = pos;
      const ctx = c.getContext("2d");
      if (ctx) { ctx.fillStyle = colorRef.current; ctx.beginPath(); ctx.arc(pos.x, pos.y, BRUSH_SIZES[brushRef.current].size / 2, 0, Math.PI * 2); ctx.fill(); }
    };
    const onTM = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current || camRef.current) return;
      const t = e.touches[0];
      const pos = getPos(t.clientX, t.clientY);
      drawStroke(lastTouchPos.current, pos, colorRef.current, BRUSH_SIZES[brushRef.current].size);
      lastTouchPos.current = pos;
    };
    const onTE = (e: TouchEvent) => {
      e.preventDefault();
      isDrawingRef.current = false;
      saveRef.current(c.toDataURL());
    };
    c.addEventListener("touchstart", onTS, { passive: false });
    c.addEventListener("touchmove",  onTM, { passive: false });
    c.addEventListener("touchend",   onTE, { passive: false });
    return () => {
      c.removeEventListener("touchstart", onTS);
      c.removeEventListener("touchmove",  onTM);
      c.removeEventListener("touchend",   onTE);
    };
  }, [drawStroke, getPos]);

  const onMD = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (camEnabled) return;
    isDrawingRef.current = true;
    const pos = getPos(e.clientX, e.clientY);
    lastTouchPos.current = pos;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(pos.x, pos.y, BRUSH_SIZES[brushSize].size / 2, 0, Math.PI * 2); ctx.fill(); }
  };
  const onMM = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || camEnabled) return;
    const pos = getPos(e.clientX, e.clientY);
    drawStroke(lastTouchPos.current, pos, color, BRUSH_SIZES[brushSize].size);
    lastTouchPos.current = pos;
  };
  const onMU = () => {
    isDrawingRef.current = false;
    const c = canvasRef.current;
    if (c) saveRef.current(c.toDataURL());
  };

  const clearCanvas = () => {
    initCanvas();
    const c = canvasRef.current;
    if (c) saveRef.current(c.toDataURL());
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", fontFamily: "'Chewy',cursive" }}>

      {/* Left sidebar */}
      <div style={{
        width: "64px", flexShrink: 0,
        background: "#FFE033", borderRight: "3px solid #1A1A1A",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "8px", padding: "10px 0", overflowY: "auto",
      }}>
        <span style={{ fontSize: "0.6rem", color: "#1A1A1A" }}>SIZE</span>
        {BRUSH_SIZES.map((b, i) => (
          <button key={b.label} onClick={() => setBrushSize(i)} style={{
            width: `${16 + i * 8}px`, height: `${16 + i * 8}px`, borderRadius: "50%",
            background: brushSize === i ? color : "#FFFBF2",
            border: "3px solid #1A1A1A", cursor: "pointer",
            boxShadow: brushSize === i ? "2px 2px 0 #1A1A1A" : "3px 3px 0 #1A1A1A",
            transform: brushSize === i ? "translate(1px,1px)" : "none",
          }} />
        ))}
        <div style={{ width: "44px", height: "3px", background: "#1A1A1A", borderRadius: "2px" }} />
        <span style={{ fontSize: "0.6rem", color: "#1A1A1A" }}>COLOR</span>
        {CRAYON_COLORS.map(c => (
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

      {/* Canvas area */}
      <div ref={wrapRef} style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#5BC8F5", overflow: "hidden", padding: "8px",
        gap: "8px",
      }}>
        {/* Canvas wrapper */}
        <div style={{
          position: "relative",
          background: "#1A1A1A", borderRadius: "12px",
          padding: "4px", boxShadow: "6px 6px 0 #1A1A1A",
          lineHeight: 0,
          flexShrink: 1,
        }}>
          <canvas
            ref={canvasRef}
            width={canvasWH.w}
            height={canvasWH.h}
            style={{
              display: "block", borderRadius: "8px",
              cursor: camEnabled ? "none" : "crosshair",
              touchAction: "none", userSelect: "none",
              maxWidth: "100%",
            }}
            onMouseDown={onMD}
            onMouseMove={onMM}
            onMouseUp={onMU}
            onMouseLeave={onMU}
          />

          {camEnabled && (
            <div style={{
              position: "absolute", bottom: "10px", right: "10px",
              zIndex: 10, borderRadius: "10px",
              border: "3px solid #1A1A1A", boxShadow: "3px 3px 0 #1A1A1A",
              overflow: "hidden", lineHeight: 0, width: "160px", background: "#000",
            }}>
              <video
                ref={videoRef}
                width={160} height={120}
                style={{ display: "block", transform: "scaleX(-1)", width: "160px", height: "120px", objectFit: "cover" }}
                playsInline muted
              />
              <div style={{
                position: "absolute", bottom: "4px", left: "4px",
                background: status === "active" ? "#B8E04A" : status === "error" ? "#FF6B8A" : "#FFE033",
                border: "2px solid #1A1A1A", borderRadius: "50px", padding: "1px 8px",
              }}>
                <span style={{ fontSize: "0.65rem", color: "#1A1A1A", fontFamily: "'Chewy'" }}>
                  {STATUS_LABELS[status]}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar — always visible */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0, flexWrap: "wrap", justifyContent: "center" }}>
          {!camEnabled && (
            <div style={{
              background: "#FFE033", border: "3px solid #1A1A1A",
              borderRadius: "50px", padding: "4px 14px", boxShadow: "3px 3px 0 #1A1A1A",
            }}>
              <span style={{ fontSize: "0.78rem", color: "#1A1A1A", fontFamily: "'Chewy'" }}>
                🖥️ Mouse mode
              </span>
            </div>
          )}
          {hasDrawing && (
            <button onClick={onGoToListen} style={{
              padding: "4px 16px", borderRadius: "50px",
              background: "#B8E04A", border: "3px solid #1A1A1A",
              cursor: "pointer", fontFamily: "'Chewy'", fontSize: "0.82rem",
              color: "#1A1A1A", boxShadow: "3px 3px 0 #1A1A1A", flexShrink: 0,
            }}>
              🎵 Listen!
            </button>
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <div style={{
        width: "72px", flexShrink: 0,
        background: "#B8E04A", borderLeft: "3px solid #1A1A1A",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "12px", padding: "12px 0",
      }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "50%",
          background: color, border: "3px solid #1A1A1A", boxShadow: "3px 3px 0 #1A1A1A",
        }} />
        <span style={{ fontSize: "0.6rem", color: "#1A1A1A", fontFamily: "'Chewy'" }}>color</span>
        <div style={{ width: "52px", height: "3px", background: "#1A1A1A" }} />

        <button onClick={clearCanvas} style={{
          width: "52px", height: "52px", borderRadius: "50%",
          background: "#FF6B8A", border: "3px solid #1A1A1A", cursor: "pointer",
          fontFamily: "'Chewy'", fontSize: "0.65rem", color: "#1A1A1A",
          boxShadow: "3px 3px 0 #1A1A1A",
          display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "2px",
        }}>
          <span style={{ fontSize: "1.1rem" }}>🗑️</span><span>Reset</span>
        </button>

        <button onClick={() => setCamEnabled(v => !v)} style={{
          width: "52px", height: "52px", borderRadius: "50%",
          background: camEnabled ? "#FFE033" : "#5BC8F5",
          border: camEnabled ? "4px solid #1A1A1A" : "3px solid #1A1A1A",
          cursor: "pointer", fontFamily: "'Chewy'", fontSize: "0.65rem", color: "#1A1A1A",
          boxShadow: camEnabled ? "2px 2px 0 #1A1A1A" : "3px 3px 0 #1A1A1A",
          transform: camEnabled ? "translate(1px,1px)" : "none",
          display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "2px",
        }}>
          <span style={{ fontSize: "1.1rem" }}>📷</span>
          <span>{camEnabled ? "Cam ON" : "Cam"}</span>
        </button>
      </div>
    </div>
  );
}
