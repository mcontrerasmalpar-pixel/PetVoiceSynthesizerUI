import { useEffect, useState, useRef, useCallback } from "react";
import { fetchDailyDoodlesByDay, type DailyDoodle } from "../../lib/supabase";

interface DailyGalleryProps {
  day: string;
  prompt: string;
  myDoodleId?: string | null;
  onClose: () => void;
}

// Tiny melody player using Web Audio — plays melody_json notes directly
function useMelodyPlayer() {
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const play = useCallback((melodyJson: unknown) => {
    // Stop previous
    stopRef.current?.();

    if (!melodyJson || !Array.isArray(melodyJson) || melodyJson.length === 0) return;

    try {
      if (!ctxRef.current || ctxRef.current.state === "closed") {
        ctxRef.current = new AudioContext();
      }
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const notes = melodyJson as { frequency: number; duration: number; startTime: number; volume?: number }[];
      const now = ctx.currentTime;
      const sources: OscillatorNode[] = [];

      notes.slice(0, 20).forEach(note => {
        if (!note.frequency || note.frequency <= 0) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = note.frequency;
        const vol = Math.min(note.volume ?? 0.18, 0.25);
        gain.gain.setValueAtTime(0, now + note.startTime);
        gain.gain.linearRampToValueAtTime(vol, now + note.startTime + 0.02);
        gain.gain.linearRampToValueAtTime(0, now + note.startTime + note.duration);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + note.startTime);
        osc.stop(now + note.startTime + note.duration + 0.05);
        sources.push(osc);
      });

      stopRef.current = () => {
        sources.forEach(s => { try { s.stop(); } catch {} });
        stopRef.current = null;
      };
    } catch (e) {
      console.warn("melody play failed", e);
    }
  }, []);

  const stop = useCallback(() => {
    stopRef.current?.();
  }, []);

  return { play, stop };
}

// Single doodle card in the grid
function DoodleCard({
  doodle, isMe, isPlaying, onPlay, onShare,
}: {
  doodle: DailyDoodle;
  isMe: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onShare: () => void;
}) {
  return (
    <div style={{
      background: isMe ? "#B8E04A" : "#FFFBF2",
      border: `3px solid ${isMe ? "#1A1A1A" : "#1A1A1A"}`,
      borderRadius: 16,
      boxShadow: isMe ? "4px 4px 0 #1A1A1A" : "3px 3px 0 #1A1A1A",
      overflow: "hidden",
      display: "flex", flexDirection: "column",
      position: "relative",
    }}>
      {/* Me badge */}
      {isMe && (
        <div style={{
          position: "absolute", top: 6, left: 6, zIndex: 2,
          background: "#FF8C42", border: "2px solid #1A1A1A",
          borderRadius: 50, padding: "1px 8px",
          fontSize: "0.6rem", color: "#1A1A1A", fontFamily: "'Chewy',cursive",
        }}>You ⭐</div>
      )}

      {/* Drawing */}
      <div style={{ position: "relative", aspectRatio: "1", background: "#EEE8D5", overflow: "hidden" }}>
        {doodle.drawing_url ? (
          <img
            src={doodle.drawing_url}
            alt={doodle.owner_name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>🎨</div>
        )}
        {/* Play overlay button */}
        <button
          onClick={onPlay}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            background: isPlaying ? "rgba(255,140,66,0.35)" : "rgba(0,0,0,0)",
            border: "none", cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
            transition: "background 0.15s", touchAction: "manipulation",
          }}
          onMouseEnter={e => { if (!isPlaying) e.currentTarget.style.background = "rgba(0,0,0,0.12)"; }}
          onMouseLeave={e => { if (!isPlaying) e.currentTarget.style.background = "rgba(0,0,0,0)"; }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: isPlaying ? "#FF8C42" : "rgba(255,255,255,0.9)",
            border: "2px solid #1A1A1A",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1rem", boxShadow: "2px 2px 0 #1A1A1A",
            transform: isPlaying ? "scale(1.1)" : "scale(1)",
            transition: "all 0.15s",
          }}>
            {isPlaying ? "⏸" : "▶️"}
          </div>
        </button>
      </div>

      {/* Footer */}
      <div style={{ padding: "6px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
        <div style={{ fontSize: "0.7rem", color: "#1A1A1A", fontFamily: "'Chewy',cursive", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {doodle.owner_name}
        </div>
        {isMe && (
          <button
            onClick={onShare}
            style={{ flexShrink: 0, padding: "2px 8px", borderRadius: 50, background: "#5BC8F5", border: "2px solid #1A1A1A", cursor: "pointer", fontFamily: "'Chewy',cursive", fontSize: "0.6rem", color: "#1A1A1A", boxShadow: "2px 2px 0 #1A1A1A", touchAction: "manipulation" }}>
            🔗 Share
          </button>
        )}
      </div>
    </div>
  );
}

export function DailyGallery({ day, prompt, myDoodleId, onClose }: DailyGalleryProps) {
  const [doodles, setDoodles]     = useState<DailyDoodle[]>([]);
  const [loading, setLoading]     = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [copied, setCopied]       = useState(false);
  const { play, stop }            = useMelodyPlayer();

  useEffect(() => {
    fetchDailyDoodlesByDay(day).then(data => {
      // Put "me" first
      const sorted = myDoodleId
        ? [...data.filter(d => d.id === myDoodleId), ...data.filter(d => d.id !== myDoodleId)]
        : data;
      setDoodles(sorted);
      setLoading(false);
    });
  }, [day, myDoodleId]);

  const handlePlay = (doodle: DailyDoodle) => {
    if (playingId === doodle.id) {
      stop();
      setPlayingId(null);
    } else {
      play(doodle.melody_json);
      setPlayingId(doodle.id);
    }
  };

  const handleShare = (doodle: DailyDoodle) => {
    const url = `${window.location.origin}?doodle=${doodle.id}`;
    if (navigator.share) {
      navigator.share({ title: "My Doodio!", text: `"${prompt}" — listen to my drawing 🎵`, url });
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#5BC8F5", fontFamily: "'Chewy',cursive" }}>

      {/* Header */}
      <div style={{ flexShrink: 0, background: "#FF8C42", borderBottom: "3px solid #1A1A1A", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontSize: "1rem", color: "#1A1A1A" }}>🖼️ Today's Gallery</div>
          <div style={{ fontSize: "0.68rem", color: "#1A1A1A", opacity: 0.75, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            &ldquo;{prompt}&rdquo;
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!loading && (
            <div style={{ background: "#FFE033", border: "2px solid #1A1A1A", borderRadius: 50, padding: "3px 10px", fontSize: "0.75rem", color: "#1A1A1A", boxShadow: "2px 2px 0 #1A1A1A" }}>
              {doodles.length} {doodles.length === 1 ? "doodle" : "doodles"}
            </div>
          )}
          <button
            onClick={() => { stop(); onClose(); }}
            style={{ padding: "5px 14px", borderRadius: 50, background: "#FFFBF2", border: "2px solid #1A1A1A", cursor: "pointer", fontFamily: "'Chewy',cursive", fontSize: "0.8rem", color: "#1A1A1A", boxShadow: "2px 2px 0 #1A1A1A", touchAction: "manipulation" }}>
            ← Back
          </button>
        </div>
      </div>

      {/* Copied toast */}
      {copied && (
        <div style={{ position: "fixed", bottom: 40, left: "50%", transform: "translateX(-50%)", background: "#1A1A1A", color: "#FFF", borderRadius: 50, padding: "8px 20px", fontSize: "0.85rem", fontFamily: "'Chewy',cursive", zIndex: 100, boxShadow: "3px 3px 0 #555" }}>
          📋 Link copied!
        </div>
      )}

      {/* Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
            <span style={{ fontSize: "2rem" }}>⏳</span>
            <span style={{ fontSize: "1rem", color: "#1A1A1A" }}>Loading today's doodles...</span>
          </div>
        ) : doodles.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, padding: 24 }}>
            <span style={{ fontSize: "3rem" }}>🎨</span>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.1rem", color: "#1A1A1A", marginBottom: 8 }}>Be the first today!</div>
              <div style={{ fontSize: "0.8rem", color: "#1A1A1A", opacity: 0.7 }}>No doodles yet for this prompt.<br/>Submit yours and start the gallery.</div>
            </div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 12,
          }}>
            {doodles.map(d => (
              <DoodleCard
                key={d.id}
                doodle={d}
                isMe={d.id === myDoodleId}
                isPlaying={playingId === d.id}
                onPlay={() => handlePlay(d)}
                onShare={() => handleShare(d)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {!loading && doodles.length > 0 && (
        <div style={{ flexShrink: 0, background: "#FFE033", borderTop: "3px solid #1A1A1A", padding: "8px", textAlign: "center", fontSize: "0.7rem", color: "#1A1A1A", opacity: 0.8 }}>
          ▶️ Tap any doodle to hear its melody
        </div>
      )}
    </div>
  );
}
