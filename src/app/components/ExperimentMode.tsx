import { useState, useRef, useEffect } from "react";
import type { MelodyNote } from "./PlayMode";

interface GenreDef {
  id: string; label: string; emoji: string;
  color: string; textColor: string;
  oscType: OscillatorType;
  filterHz: number; reverbMix: number;
  durMult: number;
  gapMult: number;
  volMult: number;
  distortion: boolean;
  distAmount: number;
  pitchShift: number;
}

const GENRES: GenreDef[] = [
  { id:"rock",   label:"Rock",   emoji:"🎸", color:"#FF4444", textColor:"#FFF",
    oscType:"sawtooth", filterHz:3500, reverbMix:0.15,
    durMult:0.8,  gapMult:0.6,  volMult:1.1, distortion:true,  distAmount:150, pitchShift:0 },
  { id:"jazz",   label:"Jazz",   emoji:"🎷", color:"#FF8C42", textColor:"#FFF",
    oscType:"sine",     filterHz:2200, reverbMix:0.40,
    durMult:1.2,  gapMult:1.3,  volMult:0.8, distortion:false, distAmount:0,   pitchShift:-5 },
  { id:"metal",  label:"Metal",  emoji:"🤘", color:"#777",   textColor:"#FFF",
    oscType:"sawtooth", filterHz:5000, reverbMix:0.08,
    durMult:0.5,  gapMult:0.3,  volMult:1.2, distortion:true,  distAmount:400, pitchShift:-12 },
  { id:"pop",    label:"Pop",    emoji:"🎤", color:"#FF6BE8", textColor:"#FFF",
    oscType:"triangle", filterHz:4000, reverbMix:0.28,
    durMult:1.0,  gapMult:0.9,  volMult:0.9, distortion:false, distAmount:0,   pitchShift:0 },
  { id:"funk",   label:"Funk",   emoji:"🎺", color:"#1A1A2E", textColor:"#FFE033",
    oscType:"square",   filterHz:1800, reverbMix:0.22,
    durMult:0.6,  gapMult:0.8,  volMult:1.0, distortion:false, distAmount:0,   pitchShift:7 },
  { id:"ballad", label:"Ballad", emoji:"🎻", color:"#5BC8F5", textColor:"#1A1A1A",
    oscType:"sine",     filterHz:1400, reverbMix:0.60,
    durMult:1.8,  gapMult:1.5,  volMult:0.75,distortion:false, distAmount:0,   pitchShift:5 },
];

function semShift(freq: number, semitones: number) {
  return freq * Math.pow(2, semitones / 12);
}

async function renderBackingTrack(
  genre: GenreDef,
  melodyNotes: MelodyNote[],
  durationSec: number,
  sampleRate: number,
): Promise<AudioBuffer> {
  const length = Math.ceil(durationSec * sampleRate);
  const ctx = new OfflineAudioContext(2, length, sampleRate);

  const revLen = Math.ceil(sampleRate * 1.6);
  const revBuf = ctx.createBuffer(2, revLen, sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = revBuf.getChannelData(c);
    for (let i = 0; i < revLen; i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/revLen, 2.5);
  }
  const conv = ctx.createConvolver(); conv.buffer = revBuf;
  const revWet = ctx.createGain(); revWet.gain.value = genre.reverbMix;
  const revDry = ctx.createGain(); revDry.gain.value = 1 - genre.reverbMix;
  conv.connect(revWet); revWet.connect(ctx.destination);
  revDry.connect(ctx.destination);

  let dist: WaveShaperNode | null = null;
  if (genre.distortion && genre.distAmount > 0) {
    dist = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    const k = genre.distAmount;
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
    }
    dist.curve = curve;
    if (dist) dist.connect(revDry);
    if (dist) dist.connect(conv);
  }

  let t = 0;
  const notes = melodyNotes.filter(n => !n.rest);
  if (notes.length === 0) return ctx.startRendering();

  let ni = 0;
  while (t < durationSec + 0.1) {
    const note = notes[ni % notes.length];
    ni++;

    const freq = semShift(note.freq, genre.pitchShift);
    const dur  = Math.min(note.duration * genre.durMult, durationSec - t + 0.05);
    const gap  = note.duration * 0.15 * genre.gapMult;
    const vol  = Math.min(note.volume * genre.volMult, 1.0);

    if (freq < 30 || freq > 8000 || dur <= 0) { t += 0.1; continue; }

    const osc = ctx.createOscillator();
    osc.type = genre.oscType;
    osc.frequency.value = freq;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.1));
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = genre.filterHz;

    osc.connect(filt);
    if (dist) {
      filt.connect(dist);
    } else {
      filt.connect(g); g.connect(revDry); g.connect(conv);
    }
    if (dist) {
      const gd = ctx.createGain();
      gd.gain.setValueAtTime(0.001, t);
      gd.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.1));
      gd.gain.exponentialRampToValueAtTime(0.001, t + dur);
      dist.connect(gd); gd.connect(revDry); gd.connect(conv);
    }

    osc.start(t);
    osc.stop(Math.min(t + dur + 0.02, durationSec + 0.15));

    t += dur + gap;
  }

  return ctx.startRendering();
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sr    = buffer.sampleRate;
  const len   = buffer.length * numCh * 2;
  const ab    = new ArrayBuffer(44 + len);
  const v     = new DataView(ab);
  const ws    = (o: number, s: string) => { for (let i=0;i<s.length;i++) v.setUint8(o+i,s.charCodeAt(i)); };
  ws(0,"RIFF"); v.setUint32(4,36+len,true); ws(8,"WAVE"); ws(12,"fmt ");
  v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,numCh,true);
  v.setUint32(24,sr,true); v.setUint32(28,sr*numCh*2,true);
  v.setUint16(32,numCh*2,true); v.setUint16(34,16,true);
  ws(36,"data"); v.setUint32(40,len,true);
  let o=44;
  for (let i=0;i<buffer.length;i++)
    for (let c=0;c<numCh;c++) {
      const s=Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]));
      v.setInt16(o,s<0?s*32768:s*32767,true); o+=2;
    }
  return new Blob([ab],{type:"audio/wav"});
}

async function mixBuffers(mic: AudioBuffer, backing: AudioBuffer, sr: number): Promise<AudioBuffer> {
  const dur = Math.max(mic.duration, backing.duration);
  const off = new OfflineAudioContext(2, Math.ceil(dur*sr), sr);
  const ms = off.createBufferSource(); ms.buffer = mic; ms.connect(off.destination); ms.start(0);
  const bs = off.createBufferSource(); bs.buffer = backing;
  const bg = off.createGain(); bg.gain.value = 0.52;
  bs.connect(bg); bg.connect(off.destination); bs.start(0);
  return off.startRendering();
}

function getSupportedMimeType(): string {
  const types=["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/ogg","audio/mp4",""];
  for (const t of types)
    if (t==="" || (typeof MediaRecorder!=="undefined" && MediaRecorder.isTypeSupported(t))) return t;
  return "";
}

interface Props { melody: MelodyNote[]; }

export function ExperimentMode({ melody }: Props) {
  const [selectedGenre, setSelectedGenre] = useState<GenreDef>(GENRES[0]);
  const [recording,     setRecording]     = useState(false);
  const [mixing,        setMixing]        = useState(false);
  const [remixURL,      setRemixURL]      = useState<string|null>(null);
  const [recSeconds,    setRecSeconds]    = useState(0);
  const [error,         setError]         = useState<string|null>(null);

  const mediaRecRef   = useRef<MediaRecorder|null>(null);
  const chunksRef     = useRef<BlobPart[]>([]);
  const timerRef      = useRef<ReturnType<typeof setInterval>|null>(null);
  const streamRef     = useRef<MediaStream|null>(null);
  const liveCtxRef    = useRef<AudioContext|null>(null);
  const liveOscRef    = useRef<OscillatorNode[]>([]);
  const recDurRef     = useRef<number>(0);
  const micBlobRef    = useRef<Blob|null>(null);
  const genreAtRecRef = useRef<GenreDef>(GENRES[0]);

  const melodyNotes = melody.filter(n => !n.rest);
  const hasDrawing  = melodyNotes.length > 0;

  function startLivePreview(genre: GenreDef) {
    try {
      const ctx = new AudioContext();
      liveCtxRef.current = ctx;
      const notes = melodyNotes.filter(n => !n.rest);
      if (!notes.length) return;

      const revBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const rd = revBuf.getChannelData(0);
      for (let i=0;i<ctx.sampleRate;i++) rd[i]=(Math.random()*2-1)*Math.pow(1-i/ctx.sampleRate,2.5);
      const conv = ctx.createConvolver(); conv.buffer=revBuf;
      const rg = ctx.createGain(); rg.gain.value=genre.reverbMix;
      conv.connect(rg); rg.connect(ctx.destination);

      let t = ctx.currentTime;
      const oscs: OscillatorNode[] = [];
      let ni = 0;
      while (t - ctx.currentTime < 62) {
        const note = notes[ni % notes.length]; ni++;
        const freq = semShift(note.freq, genre.pitchShift);
        const dur  = note.duration * genre.durMult;
        const gap  = note.duration * 0.15 * genre.gapMult;
        if (freq < 30 || freq > 8000) { t += 0.1; continue; }

        const osc = ctx.createOscillator(); osc.type=genre.oscType; osc.frequency.value=freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001,t);
        g.gain.linearRampToValueAtTime(Math.min(note.volume*genre.volMult,0.9)*0.6, t+0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t+dur);
        const filt = ctx.createBiquadFilter(); filt.type="lowpass"; filt.frequency.value=genre.filterHz;
        osc.connect(filt); filt.connect(g); g.connect(ctx.destination); g.connect(conv);
        osc.start(t); osc.stop(t+dur+0.02);
        oscs.push(osc);
        t += dur + gap;
      }
      liveOscRef.current = oscs;
    } catch {}
  }

  const stopLivePreview = () => {
    liveOscRef.current.forEach(o => { try { o.stop(); } catch {} });
    liveOscRef.current = [];
    try { liveCtxRef.current?.close(); } catch {}
    liveCtxRef.current = null;
  };

  const startRecording = async () => {
    if (!hasDrawing) { setError("Draw something first so your remix has a melody!"); return; }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = getSupportedMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const fm = mr.mimeType || mimeType || "audio/webm";
        micBlobRef.current = new Blob(chunksRef.current, { type: fm });
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };
      mr.start(100);
      mediaRecRef.current = mr;
      genreAtRecRef.current = selectedGenre;
      recDurRef.current = 0;

      startLivePreview(selectedGenre);

      setRecording(true); setRemixURL(null); setRecSeconds(0);
      timerRef.current = setInterval(() => {
        setRecSeconds(s => { recDurRef.current = s+1; return s+1; });
      }, 1000);
    } catch { setError("Microphone access denied."); }
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopLivePreview();
    if (mediaRecRef.current?.state !== "inactive") mediaRecRef.current?.stop();
    setRecording(false);
    setTimeout(() => doOfflineMix(), 400);
  };

  const doOfflineMix = async () => {
    const micBlob = micBlobRef.current;
    if (!micBlob) return;
    setMixing(true); setError(null);
    try {
      const sr = 44100;
      const decCtx = new AudioContext({ sampleRate: sr });
      const micBuf = await decCtx.decodeAudioData(await micBlob.arrayBuffer());
      await decCtx.close();

      const backBuf = await renderBackingTrack(
        genreAtRecRef.current, melodyNotes, micBuf.duration, sr
      );
      const mixed = await mixBuffers(micBuf, backBuf, sr);
      setRemixURL(URL.createObjectURL(audioBufferToWav(mixed)));
    } catch (err) {
      console.error(err);
      setError("Mix failed — try again.");
    } finally { setMixing(false); }
  };

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    stopLivePreview();
  }, []);

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#B8E04A", fontFamily:"'Chewy',cursive" }}>

      {/* No drawing warning */}
      {!hasDrawing && (
        <div style={{ margin:"12px 16px 0", background:"#FFE033", border:"2px solid #1A1A1A", borderRadius:10, padding:"7px 12px", fontSize:"0.75rem", color:"#1A1A1A", textAlign:"center", boxShadow:"2px 2px 0 #1A1A1A" }}>
          ⚠️ Go to <strong>Draw</strong> first — your drawing becomes the melody of your remix!
        </div>
      )}

      {/* Genre pills */}
      <div style={{ flexShrink:0, padding:"12px 14px 0" }}>
        <div style={{ fontSize:"0.75rem", color:"#1A1A1A", marginBottom:6, textAlign:"center" }}>
          🎶 Your drawing remixed in this style:
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:7, justifyContent:"center" }}>
          {GENRES.map(g => {
            const active = selectedGenre.id === g.id;
            return (
              <button key={g.id}
                onPointerDown={e => { e.preventDefault(); if (!recording) setSelectedGenre(g); }}
                style={{
                  padding:"7px 14px", borderRadius:"50px",
                  background: active ? g.color : "#FFFBF2",
                  border:"3px solid #1A1A1A",
                  color: active ? g.textColor : "#1A1A1A",
                  fontFamily:"'Chewy',cursive", fontSize:"0.9rem",
                  boxShadow: active ? "3px 3px 0 #1A1A1A" : "2px 2px 0 #1A1A1A",
                  transform: active ? "translate(1px,1px)" : "none",
                  cursor: recording ? "default" : "pointer",
                  opacity: recording && !active ? 0.4 : 1,
                  display:"flex", alignItems:"center", gap:5,
                  WebkitTapHighlightColor:"transparent", touchAction:"manipulation",
                  transition:"transform 0.08s",
                }}>
                <span>{g.emoji}</span><span>{g.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info card */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 18px" }}>
        <div style={{
          background:"#FFFBF2", border:"3px solid #1A1A1A",
          borderRadius:16, padding:"12px 18px",
          boxShadow:"4px 4px 0 #1A1A1A", textAlign:"center", maxWidth:300,
        }}>
          <div style={{fontSize:"1.8rem",marginBottom:3}}>{selectedGenre.emoji}</div>
          <div style={{fontSize:"1rem",color:"#1A1A1A",marginBottom:4}}>{selectedGenre.label}</div>
          <div style={{fontSize:"0.72rem",color:"#555",lineHeight:1.5}}>
            {mixing
              ? "⏳ Mixing your drawing's melody with your voice..."
              : recording
              ? `🎵 Your drawing plays in ${selectedGenre.label} style! Tap Stop when done.`
              : hasDrawing
              ? `Your drawing's unique melody → remixed in ${selectedGenre.label} → mixed with your voice!`
              : "Draw something first, then come back to remix it!"
            }
          </div>
          {error && <div style={{marginTop:7,fontSize:"0.7rem",color:"#FF4444"}}>{error}</div>}
        </div>
      </div>

      {/* Controls */}
      <div style={{ flexShrink:0, padding:"10px 14px 14px", display:"flex", flexDirection:"column", gap:8, background:"#8DC827", borderTop:"3px solid #1A1A1A" }}>
        <button
          onPointerDown={e => { e.preventDefault(); if (mixing) return; recording ? stopRecording() : startRecording(); }}
          disabled={mixing}
          style={{
            width:"100%", padding:"13px", borderRadius:"50px",
            background: mixing ? "#CCC" : recording ? "#FF6B8A" : "#FFE033",
            border: recording ? "3px solid #FF0040" : "3px solid #1A1A1A",
            cursor: mixing ? "default" : "pointer",
            fontFamily:"'Chewy',cursive", fontSize:"1rem", color:"#1A1A1A",
            boxShadow: recording ? "0 0 16px #FF6B8A88" : "4px 4px 0 #1A1A1A",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            WebkitTapHighlightColor:"transparent", touchAction:"manipulation",
          }}>
          <span>{mixing ? "⏳" : recording ? "⏹" : "🔴"}</span>
          <span>{mixing ? "Mixing..." : recording ? `Stop (${recSeconds}s)` : `Record with ${selectedGenre.label}!`}</span>
        </button>

        {remixURL && (
          <div style={{ background:"#FFFBF2", border:"3px solid #1A1A1A", borderRadius:14, padding:"8px 12px", display:"flex", alignItems:"center", gap:8, boxShadow:"3px 3px 0 #1A1A1A" }}>
            <audio controls src={remixURL} style={{ flex:1, height:"32px" }} />
            <a href={remixURL} download={`remix-${selectedGenre.id}.wav`}
              style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 12px", borderRadius:"50px", background:"#B8E04A", border:"2px solid #1A1A1A", fontFamily:"'Chewy',cursive", fontSize:"0.85rem", color:"#1A1A1A", boxShadow:"2px 2px 0 #1A1A1A", textDecoration:"none", flexShrink:0 }}>
              ⬇️ Save
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
