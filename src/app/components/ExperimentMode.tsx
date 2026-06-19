import { useState, useRef, useEffect } from "react";
import type { MelodyNote } from "./PlayMode";

const ROOT = 261.63;

interface GenreDef {
  id: string; label: string; emoji: string;
  color: string; textColor: string;
  scale: number[]; oscType: OscillatorType;
  filterHz: number; reverbMix: number;
  noteDur: number; notePause: number;
  distortion: boolean;
}

const GENRES: GenreDef[] = [
  { id:"rock",   label:"Rock",   emoji:"🎸", color:"#FF4444", textColor:"#FFF",
    scale:[0,5,7,10,12,15], oscType:"sawtooth", filterHz:3500, reverbMix:0.15,
    noteDur:0.22, notePause:0.06, distortion:true },
  { id:"jazz",   label:"Jazz",   emoji:"🎷", color:"#FF8C42", textColor:"#FFF",
    scale:[0,3,5,7,10,14], oscType:"sine",     filterHz:2200, reverbMix:0.38,
    noteDur:0.38, notePause:0.12, distortion:false },
  { id:"metal",  label:"Metal",  emoji:"🤘", color:"#777",   textColor:"#FFF",
    scale:[0,1,5,6,7,10],  oscType:"sawtooth", filterHz:5000, reverbMix:0.08,
    noteDur:0.14, notePause:0.04, distortion:true },
  { id:"pop",    label:"Pop",    emoji:"🎤", color:"#FF6BE8", textColor:"#FFF",
    scale:[0,4,7,9,12,16], oscType:"triangle", filterHz:4000, reverbMix:0.25,
    noteDur:0.28, notePause:0.08, distortion:false },
  { id:"funk",   label:"Funk",   emoji:"🎺", color:"#1A1A2E", textColor:"#FFE033",
    scale:[0,3,5,7,10,12], oscType:"square",   filterHz:1800, reverbMix:0.20,
    noteDur:0.18, notePause:0.10, distortion:false },
  { id:"ballad", label:"Ballad", emoji:"🎻", color:"#5BC8F5", textColor:"#1A1A1A",
    scale:[0,4,7,11,14,17],oscType:"sine",     filterHz:1400, reverbMix:0.55,
    noteDur:0.55, notePause:0.18, distortion:false },
];

function semHz(semi: number, root: number) {
  return root * Math.pow(2, semi / 12);
}

// ─── Render backing track into an OfflineAudioContext buffer ───
async function renderBackingTrack(
  genre: GenreDef,
  melodyRoot: number,
  durationSec: number,
  sampleRate: number,
): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(durationSec * sampleRate), sampleRate);

  // Simple noise-impulse reverb
  const reverbLen = sampleRate * 1.5;
  const revBuf = ctx.createBuffer(2, reverbLen, sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = revBuf.getChannelData(c);
    for (let i = 0; i < reverbLen; i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/reverbLen, 2.5);
  }
  const conv = ctx.createConvolver(); conv.buffer = revBuf;
  const revWet = ctx.createGain(); revWet.gain.value = genre.reverbMix;
  const revDry = ctx.createGain(); revDry.gain.value = 1 - genre.reverbMix;
  conv.connect(revWet); revWet.connect(ctx.destination);

  // Distortion waveshaper
  let dist: WaveShaperNode | null = null;
  if (genre.distortion) {
    dist = ctx.createWaveShaper();
    const k = genre.id === "metal" ? 400 : 150;
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i*2)/256 - 1;
      curve[i] = ((Math.PI+k)*x)/(Math.PI+k*Math.abs(x));
    }
    dist.curve = curve;
  }

  const stepSec = genre.noteDur + genre.notePause;
  const totalSteps = Math.ceil(durationSec / stepSec) + 2;
  const scaleLen = genre.scale.length;

  for (let i = 0; i < totalSteps; i++) {
    const t = i * stepSec;
    if (t > durationSec + 0.2) break;

    // root note + harmony
    ([0, 2] as number[]).forEach(vi => {
      const semi = genre.scale[(i + vi) % scaleLen];
      const freq = semHz(semi, melodyRoot);
      if (freq < 30 || freq > 5000) return;

      const osc = ctx.createOscillator();
      osc.type = genre.oscType;
      osc.frequency.value = freq;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(vi === 0 ? 0.32 : 0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, Math.min(t + genre.noteDur, durationSec + 0.1));

      const filt = ctx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.value = genre.filterHz;

      osc.connect(filt);
      if (dist) {
        filt.connect(dist); dist.connect(g);
      } else {
        filt.connect(g);
      }
      g.connect(revDry); revDry.connect(ctx.destination);
      g.connect(conv);

      osc.start(t);
      osc.stop(Math.min(t + genre.noteDur + 0.05, durationSec + 0.2));
    });
  }

  return ctx.startRendering();
}

// ─── Encode AudioBuffer → WAV blob (works everywhere) ───
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate  = buffer.sampleRate;
  const length      = buffer.length * numChannels * 2;
  const arrayBuf    = new ArrayBuffer(44 + length);
  const view        = new DataView(arrayBuf);

  function writeStr(o: number, s: string) { for (let i=0;i<s.length;i++) view.setUint8(o+i, s.charCodeAt(i)); }
  writeStr(0,  "RIFF");
  view.setUint32(4,  36 + length, true);
  writeStr(8,  "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1,  true);              // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, length, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
      view.setInt16(offset, s < 0 ? s * 32768 : s * 32767, true);
      offset += 2;
    }
  }
  return new Blob([arrayBuf], { type: "audio/wav" });
}

// ─── Mix mic AudioBuffer + backing AudioBuffer ───
async function mixBuffers(
  micBuffer: AudioBuffer,
  backingBuffer: AudioBuffer,
  sampleRate: number,
): Promise<AudioBuffer> {
  const duration = Math.max(micBuffer.duration, backingBuffer.duration);
  const length = Math.ceil(duration * sampleRate);
  const offline = new OfflineAudioContext(2, length, sampleRate);

  const micSrc = offline.createBufferSource();
  micSrc.buffer = micBuffer;
  micSrc.connect(offline.destination);
  micSrc.start(0);

  const backSrc = offline.createBufferSource();
  backSrc.buffer = backingBuffer;
  // back slightly quieter so voice stands out
  const backGain = offline.createGain(); backGain.gain.value = 0.55;
  backSrc.connect(backGain); backGain.connect(offline.destination);
  backSrc.start(0);

  return offline.startRendering();
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
  const [petPhoto,      setPetPhoto]      = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<GenreDef>(GENRES[0]);
  const [recording,     setRecording]     = useState(false);
  const [mixing,        setMixing]        = useState(false);
  const [remixURL,      setRemixURL]      = useState<string | null>(null);
  const [recSeconds,    setRecSeconds]    = useState(0);
  const [error,         setError]         = useState<string | null>(null);

  const mediaRecRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<BlobPart[]>([]);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const liveOscRef   = useRef<OscillatorNode[]>([]);
  const recDurRef    = useRef<number>(0);
  const micBlobRef   = useRef<Blob | null>(null);
  const genreAtRecRef = useRef<GenreDef>(GENRES[0]);

  const melodyNotes  = melody.filter(n => !n.rest);
  const melodyRoot   = melodyNotes.length > 0 ? melodyNotes[0].freq : ROOT;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPetPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Live preview of backing track while recording (plays through speaker)
  function startLivePreview(genre: GenreDef) {
    try {
      const ctx = new AudioContext();
      const stepSec = genre.noteDur + genre.notePause;
      const preview = 60; // schedule 60s worth, stop on stopRecording
      const scaleLen = genre.scale.length;
      const rev = ctx.createConvolver();
      const revLen = ctx.sampleRate * 1.2;
      const revBuf = ctx.createBuffer(1, revLen, ctx.sampleRate);
      const d = revBuf.getChannelData(0);
      for (let i=0;i<revLen;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/revLen,2.5);
      rev.buffer = revBuf;
      const revG = ctx.createGain(); revG.gain.value = genre.reverbMix;
      rev.connect(revG); revG.connect(ctx.destination);

      const nodes: OscillatorNode[] = [];
      for (let i=0; i < Math.ceil(preview/stepSec); i++) {
        const t = ctx.currentTime + i*stepSec;
        const semi = genre.scale[i % scaleLen];
        const freq = semHz(semi, melodyRoot);
        if (freq < 30 || freq > 5000) continue;
        const osc = ctx.createOscillator();
        osc.type = genre.oscType;
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.28, t+0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t+genre.noteDur);
        const filt = ctx.createBiquadFilter(); filt.type="lowpass"; filt.frequency.value=genre.filterHz;
        osc.connect(filt); filt.connect(g); g.connect(ctx.destination); g.connect(rev);
        osc.start(t); osc.stop(t+genre.noteDur+0.05);
        nodes.push(osc);
      }
      liveOscRef.current = nodes;
    } catch {}
  }

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = getSupportedMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const finalMime = mr.mimeType || mimeType || "audio/webm";
        micBlobRef.current = new Blob(chunksRef.current, { type: finalMime });
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };
      mr.start(100);
      mediaRecRef.current = mr;
      genreAtRecRef.current = selectedGenre;

      startLivePreview(selectedGenre);

      setRecording(true); setRemixURL(null); setRecSeconds(0);
      timerRef.current = setInterval(() => {
        setRecSeconds(s => { recDurRef.current = s + 1; return s + 1; });
      }, 1000);
    } catch (err) {
      console.error(err);
      setError("Microphone access denied.");
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    liveOscRef.current.forEach(o => { try { o.stop(); } catch {} });
    liveOscRef.current = [];

    if (mediaRecRef.current?.state !== "inactive") mediaRecRef.current?.stop();
    setRecording(false);

    // Wait a tick for onstop to fire and micBlobRef to be set
    setTimeout(() => doOfflineMix(), 400);
  };

  const doOfflineMix = async () => {
    const micBlob = micBlobRef.current;
    if (!micBlob) return;
    setMixing(true);
    setError(null);
    try {
      const sampleRate = 44100;
      const duration = Math.max(recDurRef.current, 1);

      // Decode mic recording
      const micArrayBuf = await micBlob.arrayBuffer();
      const decodeCtx = new AudioContext({ sampleRate });
      const micBuffer = await decodeCtx.decodeAudioData(micArrayBuf);
      await decodeCtx.close();

      // Render backing track offline
      const backingBuffer = await renderBackingTrack(
        genreAtRecRef.current, melodyRoot, micBuffer.duration, sampleRate
      );

      // Mix them
      const mixed = await mixBuffers(micBuffer, backingBuffer, sampleRate);

      // Encode to WAV (universal)
      const wav = audioBufferToWav(mixed);
      setRemixURL(URL.createObjectURL(wav));
    } catch (err) {
      console.error(err);
      setError("Mix failed. Try again.");
    } finally {
      setMixing(false);
    }
  };

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    liveOscRef.current.forEach(o => { try { o.stop(); } catch {} });
  }, []);

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#B8E04A", fontFamily:"'Chewy',cursive" }}>

      {/* Pet photo */}
      <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", paddingTop:14, gap:5 }}>
        <label htmlFor="pet-upload-exp" style={{
          width:90, height:90, borderRadius:"50%",
          background: petPhoto ? "transparent" : "#8DC827",
          border:"4px solid #1A1A1A", boxShadow:"4px 4px 0 #1A1A1A",
          cursor:"pointer", overflow:"hidden",
          display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:2,
        }}>
          {petPhoto
            ? <img src={petPhoto} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <><span style={{ fontSize:"1.8rem" }}>📷</span><span style={{ fontSize:"0.58rem", color:"#1A1A1A", textAlign:"center" }}>Upload pet</span></>
          }
        </label>
        <input id="pet-upload-exp" type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display:"none" }} />
        <div style={{ fontSize:"0.72rem", color:"#1A1A1A", opacity:0.7 }}>
          {mixing ? "⏳ Mixing..." : recording ? `🔴 ${recSeconds}s` : "Your pet’s star 🌟"}
        </div>
      </div>

      {/* Genre pills */}
      <div style={{ flexShrink:0, padding:"12px 14px 0" }}>
        <div style={{ fontSize:"0.78rem", color:"#1A1A1A", marginBottom:7, textAlign:"center" }}>
          🎶 Pick a style — plays live while you record!
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
                  border:`3px solid #1A1A1A`,
                  color: active ? g.textColor : "#1A1A1A",
                  fontFamily:"'Chewy',cursive", fontSize:"0.92rem",
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
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 20px" }}>
        <div style={{
          background:"#FFFBF2", border:"3px solid #1A1A1A",
          borderRadius:16, padding:"14px 20px",
          boxShadow:"4px 4px 0 #1A1A1A", textAlign:"center", maxWidth:300,
        }}>
          <div style={{ fontSize:"2rem", marginBottom:4 }}>{selectedGenre.emoji}</div>
          <div style={{ fontSize:"1.05rem", color:"#1A1A1A", marginBottom:4 }}>{selectedGenre.label}</div>
          <div style={{ fontSize:"0.73rem", color:"#555", lineHeight:1.5 }}>
            {mixing
              ? "⏳ Mixing your voice with the backing track..."
              : recording
              ? `🎵 ${selectedGenre.label} playing live! Tap Stop when done.`
              : `Record your pet — we’ll mix it with a real ${selectedGenre.label} soundtrack!`
            }
          </div>
          {error && <div style={{ marginTop:8, fontSize:"0.72rem", color:"#FF4444" }}>{error}</div>}
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
            fontFamily:"'Chewy',cursive", fontSize:"1.05rem", color:"#1A1A1A",
            boxShadow: recording ? "0 0 16px #FF6B8A88" : "4px 4px 0 #1A1A1A",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            WebkitTapHighlightColor:"transparent", touchAction:"manipulation",
          }}>
          <span>{mixing ? "⏳" : recording ? "⏹" : "🔴"}</span>
          <span>{mixing ? "Mixing audio..." : recording ? `Stop (${recSeconds}s)` : `Record with ${selectedGenre.label}!`}</span>
        </button>

        {remixURL && (
          <div style={{ background:"#FFFBF2", border:"3px solid #1A1A1A", borderRadius:14, padding:"8px 12px", display:"flex", alignItems:"center", gap:8, boxShadow:"3px 3px 0 #1A1A1A" }}>
            <audio controls src={remixURL} style={{ flex:1, height:"32px" }} />
            <a href={remixURL} download={`pet-${selectedGenre.id}.wav`}
              style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 12px", borderRadius:"50px", background:"#B8E04A", border:"2px solid #1A1A1A", fontFamily:"'Chewy',cursive", fontSize:"0.85rem", color:"#1A1A1A", boxShadow:"2px 2px 0 #1A1A1A", textDecoration:"none", flexShrink:0 }}>
              ⬇️ Save
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
