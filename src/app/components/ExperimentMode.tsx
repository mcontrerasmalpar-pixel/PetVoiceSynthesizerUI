import { useState, useRef, useEffect } from "react";
import type { MelodyNote } from "./PlayMode";

let _expCtx: AudioContext | null = null;
function getCtx() {
  if (!_expCtx) _expCtx = new AudioContext();
  return _expCtx;
}

const ROOT = 261.63;

interface GenreDef {
  id: string;
  label: string;
  emoji: string;
  color: string;
  textColor: string;
  scale: number[];       // semitone intervals
  oscType: OscillatorType;
  filterHz: number;
  reverbMix: number;
  tempoMult: number;
  distortion: boolean;
  noteDur: number;       // seconds per note in backing track
  notePause: number;     // gap between notes
}

const GENRES: GenreDef[] = [
  { id:"rock",   label:"Rock",   emoji:"🎸", color:"#FF4444", textColor:"#FFF",
    scale:[0,5,7,10,12,15], oscType:"sawtooth", filterHz:3500, reverbMix:0.15,
    tempoMult:0.85, distortion:true,  noteDur:0.22, notePause:0.06 },
  { id:"jazz",   label:"Jazz",   emoji:"🎷", color:"#FF8C42", textColor:"#FFF",
    scale:[0,3,5,7,10,14], oscType:"sine",     filterHz:2200, reverbMix:0.38,
    tempoMult:1.1,  distortion:false, noteDur:0.38, notePause:0.12 },
  { id:"metal",  label:"Metal",  emoji:"🤘", color:"#888",   textColor:"#FFF",
    scale:[0,1,5,6,7,10],  oscType:"sawtooth", filterHz:5000, reverbMix:0.08,
    tempoMult:0.6,  distortion:true,  noteDur:0.14, notePause:0.04 },
  { id:"pop",    label:"Pop",    emoji:"🎤", color:"#FF6BE8", textColor:"#FFF",
    scale:[0,4,7,9,12,16], oscType:"triangle", filterHz:4000, reverbMix:0.25,
    tempoMult:1.0,  distortion:false, noteDur:0.28, notePause:0.08 },
  { id:"funk",   label:"Funk",   emoji:"🎺", color:"#1A1A2E", textColor:"#FFE033",
    scale:[0,3,5,7,10,12], oscType:"square",   filterHz:1800, reverbMix:0.20,
    tempoMult:0.75, distortion:false, noteDur:0.18, notePause:0.10 },
  { id:"ballad", label:"Ballad", emoji:"🎻", color:"#5BC8F5", textColor:"#1A1A1A",
    scale:[0,4,7,11,14,17],oscType:"sine",     filterHz:1400, reverbMix:0.55,
    tempoMult:1.5,  distortion:false, noteDur:0.55, notePause:0.18 },
];

function semHz(semi: number, root: number) {
  return root * Math.pow(2, semi / 12);
}

function createReverb(ctx: AudioContext, mix: number) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain(); dry.gain.value = 1 - mix;
  const wet = ctx.createGain(); wet.gain.value = mix;
  const len = ctx.sampleRate * 1.8;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len, 2.5);
  }
  const conv = ctx.createConvolver(); conv.buffer = buf;
  input.connect(dry); dry.connect(output);
  input.connect(conv); conv.connect(wet); wet.connect(output);
  return { input, output };
}

function makeDistortion(ctx: AudioContext, amount: number) {
  const ws = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i*2)/256 - 1;
    curve[i] = ((Math.PI + amount)*x)/(Math.PI + amount*Math.abs(x));
  }
  ws.curve = curve;
  return ws;
}

// Schedule a full backing track for `durationSec` seconds using genre settings
// Returns an array of oscillators/nodes so we can stop them early if needed
function scheduleBackingTrack(
  ctx: AudioContext,
  genre: GenreDef,
  melodyRoot: number,
  durationSec: number,
): OscillatorNode[] {
  const oscillators: OscillatorNode[] = [];
  const rev = createReverb(ctx, genre.reverbMix);
  rev.output.connect(ctx.destination);

  const stepSec = genre.noteDur + genre.notePause;
  const totalSteps = Math.ceil(durationSec / stepSec);
  const scaleLen = genre.scale.length;
  const now = ctx.currentTime;

  for (let i = 0; i < totalSteps; i++) {
    const t = now + i * stepSec;
    if (t - now > durationSec + 0.1) break;

    // play 1-2 simultaneous notes (root + harmony)
    const voices = [0, 2]; // scale degree indices
    voices.forEach(vi => {
      const semi = genre.scale[(i + vi) % scaleLen];
      const freq = semHz(semi, melodyRoot);
      if (freq < 40 || freq > 5000) return;

      const osc = ctx.createOscillator();
      osc.type = genre.oscType;
      osc.frequency.value = freq;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(vi === 0 ? 0.35 : 0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + genre.noteDur);

      const filt = ctx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.value = genre.filterHz;

      osc.connect(filt);
      if (genre.distortion) {
        const dist = makeDistortion(ctx, genre.id === "metal" ? 400 : 150);
        filt.connect(dist); dist.connect(g);
      } else {
        filt.connect(g);
      }
      g.connect(rev.input);

      osc.start(t);
      osc.stop(t + genre.noteDur + 0.05);
      oscillators.push(osc);
    });
  }
  return oscillators;
}

function getSupportedMimeType(): string {
  const types = ["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/ogg","audio/mp4",""];
  for (const t of types) {
    if (t === "" || (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t))) return t;
  }
  return "";
}

interface Props { melody: MelodyNote[]; }

export function ExperimentMode({ melody }: Props) {
  const [petPhoto,    setPetPhoto]    = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<GenreDef>(GENRES[0]);
  const [recording,   setRecording]   = useState(false);
  const [recorded,    setRecorded]    = useState(false);
  const [remixURL,    setRemixURL]    = useState<string | null>(null);
  const [remixExt,    setRemixExt]    = useState("webm");
  const [recSeconds,  setRecSeconds]  = useState(0);

  const mediaRecRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<BlobPart[]>([]);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const oscNodesRef  = useRef<OscillatorNode[]>([]);
  const recStartRef  = useRef<number>(0);

  const melodyNotes  = melody.filter(n => !n.rest);
  const melodyRoot   = melodyNotes.length > 0 ? melodyNotes[0].freq : ROOT;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPetPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      const ctx = getCtx();
      if (ctx.state === "suspended") await ctx.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const finalMime = mr.mimeType || mimeType || "audio/webm";
        const ext = finalMime.includes("ogg") ? "ogg" : finalMime.includes("mp4") ? "m4a" : "webm";
        setRemixExt(ext);
        setRemixURL(URL.createObjectURL(new Blob(chunksRef.current, { type: finalMime })));
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };
      mr.start(100);
      mediaRecRef.current = mr;
      recStartRef.current = Date.now();

      // Start backing track immediately — we don't know duration yet,
      // schedule a generous 60s and we'll stop nodes on stopRecording
      oscNodesRef.current = scheduleBackingTrack(ctx, selectedGenre, melodyRoot, 60);

      setRecording(true); setRecorded(false); setRemixURL(null); setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch { alert("Microphone access denied."); }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Stop all scheduled backing track nodes immediately
    oscNodesRef.current.forEach(o => { try { o.stop(); } catch {} });
    oscNodesRef.current = [];

    if (mediaRecRef.current?.state !== "inactive") mediaRecRef.current?.stop();
    setRecording(false); setRecorded(true);
  };

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    oscNodesRef.current.forEach(o => { try { o.stop(); } catch {} });
  }, []);

  return (
    <div style={{
      flex:1, display:"flex", flexDirection:"column", overflow:"hidden",
      background:"#B8E04A",   // ← Tomodachi green!
      fontFamily:"'Chewy',cursive",
    }}>

      {/* Pet photo — top center */}
      <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", paddingTop:14, gap:6 }}>
        <label htmlFor="pet-upload-exp" style={{
          width:100, height:100, borderRadius:"50%",
          background: petPhoto ? "transparent" : "#8DC827",
          border:"4px solid #1A1A1A",
          boxShadow:"4px 4px 0 #1A1A1A",
          cursor:"pointer", overflow:"hidden",
          display:"flex", alignItems:"center", justifyContent:"center",
          flexDirection:"column", gap:2,
        }}>
          {petPhoto
            ? <img src={petPhoto} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : (<>
                <span style={{ fontSize:"2rem" }}>📷</span>
                <span style={{ fontSize:"0.6rem", color:"#1A1A1A", textAlign:"center", lineHeight:1.2 }}>Upload pet</span>
              </>)
          }
        </label>
        <input id="pet-upload-exp" type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display:"none" }} />
        <div style={{ fontSize:"0.75rem", color:"#1A1A1A", opacity:0.7 }}>
          {recording ? `🔴 Recording... ${recSeconds}s` : recorded ? "✅ Done!" : "Your pet’s star 🌟"}
        </div>
      </div>

      {/* Genre pills */}
      <div style={{ flexShrink:0, padding:"14px 16px 0" }}>
        <div style={{ fontSize:"0.8rem", color:"#1A1A1A", marginBottom:8, textAlign:"center" }}>
          🎶 Choose a style — it plays while you record!
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" }}>
          {GENRES.map(g => {
            const active = selectedGenre.id === g.id;
            return (
              <button
                key={g.id}
                onPointerDown={e => { e.preventDefault(); if (!recording) setSelectedGenre(g); }}
                style={{
                  padding:"8px 16px",
                  borderRadius:"50px",
                  background: active ? g.color : "#FFFBF2",
                  border: active ? `3px solid #1A1A1A` : "3px solid #1A1A1A",
                  color: active ? g.textColor : "#1A1A1A",
                  fontFamily:"'Chewy',cursive", fontSize:"0.95rem",
                  boxShadow: active ? "3px 3px 0 #1A1A1A" : "2px 2px 0 #1A1A1A",
                  transform: active ? "translate(1px,1px)" : "none",
                  cursor: recording ? "default" : "pointer",
                  opacity: recording && !active ? 0.5 : 1,
                  display:"flex", alignItems:"center", gap:5,
                  WebkitTapHighlightColor:"transparent",
                  touchAction:"manipulation",
                  transition:"transform 0.08s, box-shadow 0.08s",
                }}>
                <span>{g.emoji}</span>
                <span>{g.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info card */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 20px" }}>
        <div style={{
          background:"#FFFBF2", border:"3px solid #1A1A1A",
          borderRadius:16, padding:"14px 20px",
          boxShadow:"4px 4px 0 #1A1A1A",
          textAlign:"center", maxWidth:320,
        }}>
          <div style={{ fontSize:"2rem", marginBottom:4 }}>{selectedGenre.emoji}</div>
          <div style={{ fontSize:"1.1rem", color:"#1A1A1A", marginBottom:4 }}>{selectedGenre.label}</div>
          <div style={{ fontSize:"0.75rem", color:"#555", lineHeight:1.5 }}>
            {recording
              ? `🔺 Playing ${selectedGenre.label} backing track... tap Stop when done!`
              : `Press Record — your pet’s voice will mix with a live ${selectedGenre.label} soundtrack!`
            }
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{
        flexShrink:0, padding:"10px 16px 14px",
        display:"flex", flexDirection:"column", gap:8,
        background:"#8DC827", borderTop:"3px solid #1A1A1A",
      }}>
        <button
          onPointerDown={e => { e.preventDefault(); recording ? stopRecording() : startRecording(); }}
          style={{
            width:"100%", padding:"13px", borderRadius:"50px",
            background: recording ? "#FF6B8A" : "#FFE033",
            border: recording ? "3px solid #FF0040" : "3px solid #1A1A1A",
            cursor:"pointer", fontFamily:"'Chewy',cursive", fontSize:"1.05rem", color:"#1A1A1A",
            boxShadow: recording ? "0 0 16px #FF6B8A88" : "4px 4px 0 #1A1A1A",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            WebkitTapHighlightColor:"transparent", touchAction:"manipulation",
          }}>
          <span>{recording ? "⏹" : "🔴"}</span>
          <span>{recording ? `Stop (${recSeconds}s)` : `Record with ${selectedGenre.label}!`}</span>
        </button>

        {remixURL && (
          <div style={{
            background:"#FFFBF2", border:"3px solid #1A1A1A",
            borderRadius:14, padding:"8px 12px",
            display:"flex", alignItems:"center", gap:8,
            boxShadow:"3px 3px 0 #1A1A1A",
          }}>
            <audio controls src={remixURL} style={{ flex:1, height:"32px" }} />
            <a
              href={remixURL} download={`pet-${selectedGenre.id}.${remixExt}`}
              style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 12px", borderRadius:"50px", background:"#B8E04A", border:"2px solid #1A1A1A", fontFamily:"'Chewy',cursive", fontSize:"0.85rem", color:"#1A1A1A", boxShadow:"2px 2px 0 #1A1A1A", textDecoration:"none", flexShrink:0 }}>
              ⬇️ Save
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
