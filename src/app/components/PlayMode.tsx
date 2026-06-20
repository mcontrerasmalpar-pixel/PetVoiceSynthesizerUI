import { useState, useEffect, useRef, useCallback } from "react";

export interface MelodyNote {
  freq: number; duration: number; volume: number; rest: boolean;
}

const SCALES: Record<string, number[]> = {
  major:      [0,2,4,5,7,9,11,12],
  minor:      [0,2,3,5,7,8,10,12],
  pentatonic: [0,2,4,7,9,12,14,16],
  blues:      [0,3,5,6,7,10,12,15],
  dorian:     [0,2,3,5,7,9,10,12],
};
const ROOTS: Record<string,number> = { C:261.63,D:293.66,E:329.63,F:349.23,G:392.00,A:440.00,B:493.88 };
const ROOT_NAMES = Object.keys(ROOTS);

export function generateMelody(dataUrl: string): Promise<MelodyNote[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const COLS=16,ROWS=8,W=COLS*8,H=ROWS*8;
      const cv=document.createElement("canvas"); cv.width=W; cv.height=H;
      const ctx=cv.getContext("2d")!; ctx.drawImage(img,0,0,W,H);
      const {data}=ctx.getImageData(0,0,W,H);
      let hueSum=0,inkCount=0,totalBrightness=0;
      for(let i=0;i<data.length;i+=4){
        const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
        if(a<10) continue;
        const br=(r*0.299+g*0.587+b*0.114)/255;
        if(br>0.92&&r>235&&g>228) continue;
        inkCount++; totalBrightness+=br;
        const rn=r/255,gn=g/255,bn=b/255;
        const max=Math.max(rn,gn,bn),min=Math.min(rn,gn,bn);
        if(max!==min){
          const d=max-min; let h=0;
          if(max===rn) h=((gn-bn)/d+(gn<bn?6:0))/6;
          else if(max===gn) h=((bn-rn)/d+2)/6;
          else h=((rn-gn)/d+4)/6;
          hueSum+=h*360;
        }
      }
      if(inkCount<20){
        const scale=SCALES.major,root=ROOTS.C;
        resolve([...scale.map(s=>({freq:root*Math.pow(2,s/12),duration:0.35,volume:0.45,rest:false})),...scale.slice(0,4).reverse().map(s=>({freq:root*Math.pow(2,s/12),duration:0.35,volume:0.38,rest:false}))]);
        return;
      }
      const avgHue=hueSum/inkCount,avgBright=totalBrightness/inkCount;
      const rootName=ROOT_NAMES[Math.floor((avgHue/360)*ROOT_NAMES.length)%ROOT_NAMES.length];
      const rootHz=ROOTS[rootName];
      const scaleName=avgBright>0.65?"major":avgBright>0.45?"pentatonic":avgBright>0.3?"dorian":avgBright>0.18?"minor":"blues";
      const scale=SCALES[scaleName];
      const raw:(MelodyNote|null)[]=[];
      let activeCount=0;
      for(let col=0;col<COLS;col++){
        const x0=Math.floor((col/COLS)*W),x1=Math.floor(((col+1)/COLS)*W);
        let colInk=0,rowWeightSum=0,volSum=0;
        for(let row=0;row<ROWS;row++){
          const y0=Math.floor((row/ROWS)*H),y1=Math.floor(((row+1)/ROWS)*H);
          let cellInk=0;
          for(let px=x0;px<x1;px++) for(let py=y0;py<y1;py++){
            const idx=(py*W+px)*4;
            const r=data[idx],g=data[idx+1],b=data[idx+2],a=data[idx+3];
            if(a<10) continue;
            const br=(r*0.299+g*0.587+b*0.114)/255;
            if(br>0.92&&r>235&&g>228) continue;
            cellInk++; volSum+=1-br;
          }
          if(cellInk>0){colInk+=cellInk;rowWeightSum+=(ROWS-1-row)*cellInk;}
        }
        if(colInk===0){raw.push(null);}
        else{
          activeCount++;
          const avgRow=rowWeightSum/colInk;
          const noteIdx=Math.round((avgRow/(ROWS-1))*(scale.length-1));
          const semitones=scale[Math.min(noteIdx,scale.length-1)];
          const freq=rootHz*Math.pow(2,semitones/12);
          const volume=Math.min(0.7,0.3+(volSum/colInk)*0.7);
          const density=colInk/((x1-x0)*H);
          raw.push({freq,duration:density>0.35?0.5:0.32,volume,rest:false});
        }
      }
      if(activeCount<8){
        let scaleIdx=0;
        for(let i=0;i<raw.length;i++){
          if(!raw[i]){
            const s=scale[scaleIdx%scale.length];
            raw[i]={freq:rootHz*Math.pow(2,s/12),duration:0.3,volume:0.32,rest:false};
            scaleIdx++; activeCount++;
            if(activeCount>=8) break;
          }
        }
      }
      resolve(raw.map(n=>n??{freq:0,duration:0.25,volume:0,rest:true}));
    };
    img.src=dataUrl;
  });
}

let _ctx: AudioContext | null = null;
let _masterBus: GainNode | null = null;

function getCtx() {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}
function getOutputNode(): AudioNode {
  return _masterBus ?? getCtx().destination;
}

type InstrumentId = "piano"|"guitar"|"marimba"|"flute"|"bells"|"synthpad";

// --- Genre remix types & data ---
interface GenreDef {
  id: string; label: string; emoji: string;
  color: string; textColor: string;
  oscType: OscillatorType;
  filterHz: number; reverbMix: number;
  durMult: number; gapMult: number; volMult: number;
  distortion: boolean; distAmount: number; pitchShift: number;
}

const GENRES: GenreDef[] = [
  { id:"none",   label:"Original", emoji:"🎨", color:"#FFFBF2", textColor:"#1A1A1A",
    oscType:"sine",     filterHz:4000, reverbMix:0.20,
    durMult:1.0,  gapMult:1.0,  volMult:1.0,  distortion:false, distAmount:0,   pitchShift:0 },
  { id:"jazz",   label:"Jazz",    emoji:"🎷", color:"#FF8C42", textColor:"#FFF",
    oscType:"sine",     filterHz:2200, reverbMix:0.40,
    durMult:1.2,  gapMult:1.3,  volMult:0.8,  distortion:false, distAmount:0,   pitchShift:-5 },
  { id:"rock",   label:"Rock",    emoji:"🎸", color:"#FF4444", textColor:"#FFF",
    oscType:"sawtooth", filterHz:3500, reverbMix:0.15,
    durMult:0.8,  gapMult:0.6,  volMult:1.1,  distortion:true,  distAmount:150, pitchShift:0 },
  { id:"ballad", label:"Ballad",  emoji:"🎻", color:"#5BC8F5", textColor:"#1A1A1A",
    oscType:"sine",     filterHz:1400, reverbMix:0.60,
    durMult:1.8,  gapMult:1.5,  volMult:0.75, distortion:false, distAmount:0,   pitchShift:5 },
  { id:"pop",    label:"Pop",     emoji:"🎤", color:"#FF6BE8", textColor:"#FFF",
    oscType:"triangle", filterHz:4000, reverbMix:0.28,
    durMult:1.0,  gapMult:0.9,  volMult:0.9,  distortion:false, distAmount:0,   pitchShift:0 },
  { id:"funk",   label:"Funk",    emoji:"🎺", color:"#1A1A2E", textColor:"#FFE033",
    oscType:"square",   filterHz:1800, reverbMix:0.22,
    durMult:0.6,  gapMult:0.8,  volMult:1.0,  distortion:false, distAmount:0,   pitchShift:7 },
  { id:"metal",  label:"Metal",   emoji:"🤘", color:"#777",   textColor:"#FFF",
    oscType:"sawtooth", filterHz:5000, reverbMix:0.08,
    durMult:0.5,  gapMult:0.3,  volMult:1.2,  distortion:true,  distAmount:400, pitchShift:-12 },
];

function semShift(freq: number, semitones: number) {
  return freq * Math.pow(2, semitones / 12);
}

function playNote(freq: number, vol: number, dur: number, inst: InstrumentId, startTime: number, genre?: GenreDef) {
  const ctx = getCtx();
  const out = getOutputNode();

  // Apply genre pitch shift
  const finalFreq = genre && genre.id !== "none" ? semShift(freq, genre.pitchShift) : freq;
  const finalDur  = genre && genre.id !== "none" ? dur * genre.durMult : dur;
  const finalVol  = genre && genre.id !== "none" ? Math.min(vol * genre.volMult, 1.0) : vol;
  const oscType: OscillatorType = genre && genre.id !== "none" ? genre.oscType : "sine";

  // Reverb setup
  const revMix = genre ? genre.reverbMix : 0.2;
  const revLen = Math.ceil(ctx.sampleRate * 1.2);
  const revBuf = ctx.createBuffer(1, revLen, ctx.sampleRate);
  const rd = revBuf.getChannelData(0);
  for (let i = 0; i < revLen; i++) rd[i] = (Math.random()*2-1)*Math.pow(1-i/revLen,2.5);
  const conv = ctx.createConvolver(); conv.buffer = revBuf;
  const revWet = ctx.createGain(); revWet.gain.value = revMix;
  const revDry = ctx.createGain(); revDry.gain.value = 1 - revMix;
  conv.connect(revWet); revWet.connect(out);
  revDry.connect(out);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, startTime);

  // Distortion for rock/metal
  if (genre?.distortion && genre.distAmount > 0) {
    const dist = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    const k = genre.distAmount;
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
    }
    dist.curve = curve;
    const filt = ctx.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = genre.filterHz;
    const osc = ctx.createOscillator(); osc.type = oscType; osc.frequency.value = finalFreq;
    osc.connect(filt); filt.connect(dist); dist.connect(gain);
    gain.gain.linearRampToValueAtTime(finalVol, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + finalDur);
    gain.connect(revDry); gain.connect(conv);
    osc.start(startTime); osc.stop(startTime + finalDur + 0.05);
    return;
  }

  switch (inst) {
    case "piano": {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = finalFreq; o.connect(gain);
      gain.gain.linearRampToValueAtTime(finalVol, startTime+0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime+finalDur);
      o.start(startTime); o.stop(startTime+finalDur);
      const o2 = ctx.createOscillator(); o2.type = "triangle"; o2.frequency.value = finalFreq*2;
      const g2 = ctx.createGain(); g2.gain.value = 0.1; o2.connect(g2); g2.connect(gain);
      o2.start(startTime); o2.stop(startTime+finalDur);
      break;
    }
    case "guitar": {
      const o = ctx.createOscillator(); o.type = oscType !== "sine" ? oscType : "sawtooth"; o.frequency.value = finalFreq;
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = genre?.filterHz ?? 1800;
      o.connect(f); f.connect(gain);
      gain.gain.linearRampToValueAtTime(finalVol*0.9, startTime+0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime+finalDur*0.8);
      o.start(startTime); o.stop(startTime+finalDur);
      break;
    }
    case "marimba": {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = finalFreq; o.connect(gain);
      gain.gain.linearRampToValueAtTime(finalVol, startTime+0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime+0.55);
      o.start(startTime); o.stop(startTime+0.6);
      break;
    }
    case "flute": {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = finalFreq;
      const vib = ctx.createOscillator(); vib.frequency.value = 5.5;
      const vg = ctx.createGain(); vg.gain.value = finalFreq*0.012;
      vib.connect(vg); vg.connect(o.frequency); o.connect(gain);
      gain.gain.linearRampToValueAtTime(finalVol*0.7, startTime+0.06);
      gain.gain.setValueAtTime(finalVol*0.7, startTime+finalDur-0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime+finalDur);
      vib.start(startTime); vib.stop(startTime+finalDur);
      o.start(startTime); o.stop(startTime+finalDur);
      break;
    }
    case "bells": {
      [1,2.756,5.404].forEach((ratio,i) => {
        const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = finalFreq*ratio;
        const g = ctx.createGain(); g.gain.value = i===0 ? finalVol : finalVol*0.14;
        o.connect(g); g.connect(gain); o.start(startTime); o.stop(startTime+finalDur*1.5);
      });
      gain.gain.linearRampToValueAtTime(1, startTime+0.002);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime+finalDur*1.5);
      break;
    }
    case "synthpad": {
      [1,1.005,0.5].forEach(ratio => {
        const o = ctx.createOscillator(); o.type = oscType !== "sine" ? oscType : "sawtooth"; o.frequency.value = finalFreq*ratio;
        const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = genre?.filterHz ?? 900;
        o.connect(f); f.connect(gain); o.start(startTime); o.stop(startTime+finalDur+0.3);
      });
      gain.gain.linearRampToValueAtTime(finalVol*0.5, startTime+0.12);
      gain.gain.setValueAtTime(finalVol*0.5, startTime+finalDur-0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime+finalDur+0.3);
      break;
    }
  }
  gain.connect(revDry); gain.connect(conv);
}

const INSTRUMENTS: {id:InstrumentId;label:string;emoji:string;bg:string}[] = [
  {id:"piano",    label:"Piano",   emoji:"🎹", bg:"#FF6B8A"},
  {id:"guitar",   label:"Guitar",  emoji:"🎸", bg:"#FFE033"},
  {id:"marimba",  label:"Marimba", emoji:"🎵", bg:"#B8E04A"},
  {id:"flute",    label:"Flute",   emoji:"🪈", bg:"#5BC8F5"},
  {id:"bells",    label:"Bells",   emoji:"🔔", bg:"#FFE033"},
  {id:"synthpad", label:"Synth",   emoji:"🌟", bg:"#C06BDB"},
];

const NOTE_COLORS = ["#FF6B8A","#FF8C42","#FFE033","#B8E04A","#5BC8F5","#5BAEFF","#C06BDB","#5FD49A"];

function MelodyGrid({notes,activeStep}:{notes:MelodyNote[];activeStep:number}) {
  const ROWS = 8;
  return (
    <div style={{display:"grid",gridTemplateColumns:`repeat(${notes.length},1fr)`,gridTemplateRows:`repeat(${ROWS},1fr)`,gap:"2px",width:"100%",height:"100%"}}>
      {Array.from({length:ROWS}).map((_,row) => notes.map((note,col) => {
        const noteRow = note.rest ? -1 : Math.round((1-(note.volume-0.25)/0.45)*(ROWS-1));
        const isActive = col===activeStep, hasNote = !note.rest && noteRow===row;
        return (<div key={`${row}-${col}`} style={{
          borderRadius:"4px",
          background: isActive&&hasNote ? NOTE_COLORS[row%NOTE_COLORS.length] : isActive ? "rgba(255,255,255,0.22)" : hasNote ? `${NOTE_COLORS[row%NOTE_COLORS.length]}88` : "rgba(255,255,255,0.07)",
          border: hasNote ? "2px solid #1A1A1A" : "1px solid rgba(0,0,0,0.08)",
          transform: isActive&&hasNote ? "scale(1.1)" : "none", transition:"all 0.07s",
        }}/>);
      }))}
    </div>
  );
}

// Doodle Recorder
function DoodleRecorder({ melody, instId, tempo, activeGenre }: {
  melody: MelodyNote[];
  instId: InstrumentId;
  tempo: number;
  activeGenre: GenreDef;
}) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [remixing,  setRemixing]  = useState(false);
  const [remixURL,  setRemixURL]  = useState<string | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      const ctx = getCtx();
      if (ctx.state === "suspended") await ctx.resume();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob); setRemixURL(null);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(); mediaRecRef.current = mr;
      setRecording(true); setAudioBlob(null); setRemixURL(null);
    } catch { alert("Microphone access denied."); }
  };

  const stopRecording = () => { mediaRecRef.current?.stop(); setRecording(false); };

  const remixWithMelody = async () => {
    if (!audioBlob || !melody.length) return;
    setRemixing(true);
    try {
      const ctx = getCtx();
      if (ctx.state === "suspended") await ctx.resume();
      const masterBus = ctx.createGain();
      masterBus.gain.value = 1.0;
      masterBus.connect(ctx.destination);
      _masterBus = masterBus;
      const dest = ctx.createMediaStreamDestination();
      masterBus.connect(dest);
      const mr = new MediaRecorder(dest.stream);
      const chunks: BlobPart[] = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      const beatMs = (60 / tempo) * 1000;
      let t = ctx.currentTime + 0.05;
      const loopNotes = [...melody, ...melody, ...melody];
      for (const note of loopNotes) {
        if (!note.rest) playNote(note.freq, note.volume, note.duration*(120/tempo), instId, t, activeGenre);
        t += (beatMs/1000) * (note.rest ? 0.5 : note.duration*(120/tempo)*1.05);
      }
      const melodyDuration = (t - ctx.currentTime) * 1000 + 300;
      const arrayBuf = await audioBlob.arrayBuffer();
      const decoded  = await ctx.decodeAudioData(arrayBuf);
      const voiceSrc = ctx.createBufferSource();
      voiceSrc.buffer = decoded; voiceSrc.loop = true;
      const voiceGain = ctx.createGain(); voiceGain.gain.value = 0.75;
      voiceSrc.connect(voiceGain); voiceGain.connect(masterBus);
      voiceSrc.start();
      mr.start();
      setTimeout(() => {
        mr.stop(); voiceSrc.stop();
        _masterBus = null; masterBus.disconnect();
        mr.onstop = () => {
          setRemixURL(URL.createObjectURL(new Blob(chunks, { type: "audio/webm" })));
          setRemixing(false);
        };
      }, melodyDuration);
    } catch (err) { console.error(err); _masterBus = null; setRemixing(false); }
  };

  return (
    <div style={{ padding:"0 14px 10px", display:"flex", flexDirection:"column", gap:"6px" }}>
      <div style={{ height:"2px", background:"rgba(0,0,0,0.12)", borderRadius:"2px", marginBottom:"2px" }} />
      <div style={{ display:"flex", gap:"8px" }}>
        <button
          onClick={recording ? stopRecording : startRecording}
          style={{ flex:1, padding:"8px 12px", borderRadius:"50px", background: recording ? "#FF6B8A" : "#FFFBF2", border: recording ? "3px solid #1A1A1A" : "2px solid #1A1A1A", cursor:"pointer", fontFamily:"'Chewy',cursive", fontSize:"0.9rem", color:"#1A1A1A", boxShadow: recording ? "2px 2px 0 #1A1A1A" : "3px 3px 0 #1A1A1A", transform: recording ? "translate(1px,1px)" : "none", transition:"all 0.1s", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
          <span style={{ fontSize:"0.75rem" }}>{recording ? "⏹" : "🔴"}</span>
          <span>{recording ? "Stop" : "Record your voice"}</span>
        </button>
        {audioBlob && !recording && (
          <button
            onClick={remixWithMelody}
            disabled={remixing || !melody.length}
            style={{ flex:1, padding:"8px 12px", borderRadius:"50px", background: remixing ? "#DDD" : "#C06BDB", border:"2px solid #1A1A1A", cursor: remixing || !melody.length ? "not-allowed" : "pointer", fontFamily:"'Chewy',cursive", fontSize:"0.9rem", color:"#1A1A1A", boxShadow: remixing ? "none" : "3px 3px 0 #1A1A1A", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
            <span style={{ fontSize:"0.75rem" }}>🎵</span>
            <span>{remixing ? "Mixing..." : "Remix with drawing"}</span>
          </button>
        )}
      </div>
      {remixURL && (
        <div style={{ background:"#B8E04A", border:"2px solid #1A1A1A", borderRadius:"12px", padding:"8px 12px", boxShadow:"3px 3px 0 #1A1A1A", display:"flex", alignItems:"center", gap:"8px" }}>
          <audio controls src={remixURL} style={{ flex:1, height:"28px" }} />
          <a href={remixURL} download="doodle-remix.webm" style={{ display:"flex", alignItems:"center", gap:"4px", padding:"6px 10px", borderRadius:"50px", background:"#FFFBF2", border:"2px solid #1A1A1A", fontFamily:"'Chewy',cursive", fontSize:"0.8rem", color:"#1A1A1A", boxShadow:"2px 2px 0 #1A1A1A", textDecoration:"none", flexShrink:0 }}>
            <span>⬇️</span><span>Save</span>
          </a>
        </div>
      )}
    </div>
  );
}

// PlayMode
interface PlayModeProps {
  drawingDataUrl:       string | null;
  onMelodyReady?:       (notes: MelodyNote[]) => void;
  onPlayingChange?:     (playing: boolean) => void;
  externalPlayTrigger?: number;
  onSavePet?:           () => void;
  savedPet?:            {name: string} | null;
  onStopRef?:           React.MutableRefObject<(() => void) | null>;
}

export function PlayMode({drawingDataUrl,onMelodyReady,onPlayingChange,externalPlayTrigger,onSavePet,savedPet,onStopRef}: PlayModeProps) {
  const [melody,      setMelody]      = useState<MelodyNote[]>([]);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [activeStep,  setActiveStep]  = useState(-1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeInst,  setActiveInst]  = useState(0);
  const [tempo,       setTempo]       = useState(120);
  const [loop,        setLoop]        = useState(true);
  const [activeGenre, setActiveGenre] = useState<GenreDef>(GENRES[0]);

  const stopRef    = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instIdRef  = useRef<InstrumentId>(INSTRUMENTS[0].id);
  const tempoRef   = useRef(120);
  const loopRef    = useRef(true);
  const melodyRef  = useRef<MelodyNote[]>([]);
  const genreRef   = useRef<GenreDef>(GENRES[0]);

  useEffect(() => { instIdRef.current = INSTRUMENTS[activeInst].id; }, [activeInst]);
  useEffect(() => { tempoRef.current = tempo; }, [tempo]);
  useEffect(() => { loopRef.current = loop; }, [loop]);
  useEffect(() => { melodyRef.current = melody; }, [melody]);
  useEffect(() => { genreRef.current = activeGenre; }, [activeGenre]);

  useEffect(() => {
    if (!drawingDataUrl) return;
    setIsAnalyzing(true);
    generateMelody(drawingDataUrl).then(notes => {
      setMelody(notes); melodyRef.current = notes;
      onMelodyReady?.(notes); setIsAnalyzing(false);
    });
  }, [drawingDataUrl]);

  const stop = useCallback(() => {
    stopRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsPlaying(false); onPlayingChange?.(false); setActiveStep(-1);
  }, [onPlayingChange]);

  useEffect(() => {
    if (onStopRef) onStopRef.current = stop;
    return () => { if (onStopRef) onStopRef.current = null; };
  }, [stop, onStopRef]);

  useEffect(() => () => { stop(); }, []);

  const play = useCallback((notesOverride?: MelodyNote[]) => {
    const notes = notesOverride ?? melodyRef.current;
    if (!notes.length) return;
    const ctx = getCtx();
    stopRef.current = false;
    setIsPlaying(true); onPlayingChange?.(true);
    let step = 0;
    function tick() {
      if (stopRef.current) return;
      const note = notes[step];
      const beatMs = (60 / tempoRef.current) * 1000;
      setActiveStep(step);
      if (!note.rest) playNote(note.freq, note.volume, note.duration*(120/tempoRef.current), instIdRef.current, ctx.currentTime, genreRef.current);
      step++;
      if (step >= notes.length) {
        if (loopRef.current) { step=0; timeoutRef.current=setTimeout(tick, beatMs*0.4); }
        else { setIsPlaying(false); onPlayingChange?.(false); setActiveStep(-1); }
        return;
      }
      timeoutRef.current = setTimeout(tick, beatMs*(note.rest ? 0.5 : note.duration*(120/tempoRef.current)*1.05));
    }
    tick();
  }, [onPlayingChange]);

  useEffect(() => {
    if (melody.length && !isPlaying) { const t=setTimeout(()=>play(),350); return ()=>clearTimeout(t); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [melody]);

  useEffect(() => {
    if (externalPlayTrigger && externalPlayTrigger>0 && melodyRef.current.length) { stop(); setTimeout(()=>play(),100); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPlayTrigger]);

  const inst = INSTRUMENTS[activeInst];

  const handleInstChange = (i: number) => {
    const wasPlaying = !stopRef.current && isPlaying;
    stop(); setActiveInst(i); instIdRef.current = INSTRUMENTS[i].id;
    if (wasPlaying) setTimeout(()=>play(), 80);
  };

  const handleGenreChange = (g: GenreDef) => {
    const wasPlaying = !stopRef.current && isPlaying;
    stop(); setActiveGenre(g); genreRef.current = g;
    if (wasPlaying) setTimeout(()=>play(), 80);
  };

  const handlePlayClick = () => {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume().then(() => isPlaying ? stop() : play());
    else isPlaying ? stop() : play();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{fontFamily:"'Chewy',cursive", background:"#5BC8F5"}}>
      {/* Top bar — instruments */}
      <div style={{background:"#5BC8F5", borderBottom:"3px solid #1A1A1A", padding:"10px 16px", display:"flex", alignItems:"center", gap:"12px", flexShrink:0, flexWrap:"wrap"}}>
        <div style={{width:"60px", height:"60px", background:"#FFFBF2", border:"3px solid #1A1A1A", borderRadius:"14px", overflow:"hidden", flexShrink:0, boxShadow:"3px 3px 0 #1A1A1A", display:"flex", alignItems:"center", justifyContent:"center"}}>
          {drawingDataUrl ? <img src={drawingDataUrl} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:"1.6rem"}}>🎨</span>}
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:"2px", flexShrink:0}}>
          <span style={{fontSize:"0.85rem", color:"#1A1A1A"}}>🎵 Generated melody</span>
          {isAnalyzing
            ? <span style={{fontSize:"0.7rem", color:"#555"}}>⏳ Analyzing drawing...</span>
            : <span style={{fontSize:"0.7rem", color:"#555"}}>{melody.filter(n=>!n.rest).length} notes · {activeGenre.id !== "none" ? activeGenre.label + " style" : "original scale"}</span>}
        </div>
        <div style={{display:"flex", gap:"6px", flexWrap:"wrap", flex:1, justifyContent:"center"}}>
          {INSTRUMENTS.map((ins,i) => {
            const active = activeInst===i;
            return (
              <button key={ins.id} onClick={()=>handleInstChange(i)} style={{padding:"6px 14px", borderRadius:"50px", background: active ? ins.bg : "#FFFBF2", border: active ? "4px solid #1A1A1A" : "3px solid #1A1A1A", cursor:"pointer", fontFamily:"'Chewy',cursive", fontSize:"0.85rem", color:"#1A1A1A", boxShadow: active ? "2px 2px 0 #1A1A1A" : "3px 3px 0 #1A1A1A", transform: active ? "translate(1px,1px)" : "none", transition:"all 0.1s", display:"flex", alignItems:"center", gap:"4px"}}>
                <span>{ins.emoji}</span><span>{ins.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Genre remix pills */}
      <div style={{background:"#4AB8E8", borderBottom:"3px solid #1A1A1A", padding:"8px 14px", flexShrink:0}}>
        <div style={{fontSize:"0.72rem", color:"#1A1A1A", marginBottom:5, textAlign:"center", opacity:0.8}}>🎶 Remix your drawing in a genre</div>
        <div style={{display:"flex", gap:"6px", flexWrap:"wrap", justifyContent:"center"}}>
          {GENRES.map(g => {
            const active = activeGenre.id === g.id;
            return (
              <button key={g.id}
                onClick={() => handleGenreChange(g)}
                style={{
                  padding:"5px 12px", borderRadius:"50px",
                  background: active ? g.color : "#FFFBF2",
                  border: active ? "3px solid #1A1A1A" : "2px solid #1A1A1A",
                  color: active ? g.textColor : "#1A1A1A",
                  fontFamily:"'Chewy',cursive", fontSize:"0.82rem",
                  boxShadow: active ? "2px 2px 0 #1A1A1A" : "2px 2px 0 rgba(0,0,0,0.2)",
                  transform: active ? "translate(1px,1px)" : "none",
                  cursor:"pointer", transition:"all 0.1s",
                  display:"flex", alignItems:"center", gap:4,
                  WebkitTapHighlightColor:"transparent",
                }}>
                <span>{g.emoji}</span><span>{g.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Melody grid */}
      <div style={{flex:1, padding:"14px", display:"flex", flexDirection:"column", gap:"10px", overflow:"hidden"}}>
        <div style={{flex:1, background:"rgba(0,0,0,0.15)", border:"3px solid #1A1A1A", borderRadius:"16px", padding:"12px", boxShadow:"4px 4px 0 #1A1A1A", overflow:"hidden"}}>
          {isAnalyzing ? (
            <div style={{height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"10px"}}>
              <span style={{fontSize:"2.5rem"}}>🔍</span>
              <span style={{fontSize:"1rem", color:"#FFFBF2", fontFamily:"'Chewy',cursive"}}>Analyzing your drawing...</span>
            </div>
          ) : melody.length>0 ? (
            <MelodyGrid notes={melody} activeStep={activeStep}/>
          ) : (
            <div style={{height:"100%", display:"flex", alignItems:"center", justifyContent:"center"}}>
              <span style={{color:"#FFFBF2", fontFamily:"'Chewy',cursive"}}>Go to Draw first 🎨</span>
            </div>
          )}
        </div>
      </div>

      {/* Doodle recorder */}
      <DoodleRecorder melody={melody} instId={INSTRUMENTS[activeInst].id} tempo={tempo} activeGenre={activeGenre} />

      {/* Footer */}
      <div style={{background:"#FFFBF2", borderTop:"3px solid #1A1A1A", padding:"10px 20px", display:"flex", alignItems:"center", gap:"14px", flexShrink:0, flexWrap:"wrap", boxShadow:"0 -2px 0 #1A1A1A"}}>
        <button
          onClick={handlePlayClick}
          disabled={!melody.length || isAnalyzing}
          style={{width:"56px", height:"56px", borderRadius:"50%", background: isPlaying ? "#FF6B8A" : "#B8E04A", border:"3px solid #1A1A1A", cursor: melody.length ? "pointer" : "not-allowed", fontSize:"1.6rem", boxShadow:"4px 4px 0 #1A1A1A", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.1s"}}
          onMouseDown={e=>{e.currentTarget.style.transform="translate(2px,2px)";e.currentTarget.style.boxShadow="2px 2px 0 #1A1A1A";}}
          onMouseUp={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="4px 4px 0 #1A1A1A";}}>
          {isPlaying ? "⏹" : "▶️"}
        </button>
        <div style={{display:"flex", alignItems:"center", gap:"10px", flex:1, minWidth:"160px"}}>
          <span style={{fontSize:"0.9rem", color:"#1A1A1A", flexShrink:0}}>Tempo</span>
          <input type="range" min={60} max={200} step={5} value={tempo}
            onChange={e => { stop(); setTempo(Number(e.target.value)); }}
            style={{flex:1, accentColor:activeGenre.id !== "none" ? activeGenre.color : inst.bg, cursor:"pointer"}}/>
          <span style={{background: activeGenre.id !== "none" ? activeGenre.color : inst.bg, border:"2px solid #1A1A1A", borderRadius:"50px", padding:"2px 12px", fontSize:"0.9rem", color: activeGenre.id !== "none" ? activeGenre.textColor : "#1A1A1A", minWidth:"50px", textAlign:"center", flexShrink:0}}>{tempo}</span>
        </div>
        <button onClick={()=>setLoop(l=>!l)} style={{padding:"8px 14px", borderRadius:"50px", background: loop ? (activeGenre.id !== "none" ? activeGenre.color : inst.bg) : "#FFFBF2", border: loop ? "4px solid #1A1A1A" : "3px solid #1A1A1A", cursor:"pointer", fontFamily:"'Chewy',cursive", fontSize:"0.85rem", color: loop && activeGenre.id !== "none" ? activeGenre.textColor : "#1A1A1A", boxShadow: loop ? "2px 2px 0 #1A1A1A" : "3px 3px 0 #1A1A1A", transform: loop ? "translate(1px,1px)" : "none", display:"flex", alignItems:"center", gap:"5px"}}>
          <span>🔁</span><span>Loop {loop ? "ON" : "OFF"}</span>
        </button>
        {onSavePet && !savedPet && melody.length>0 && (
          <button onClick={onSavePet} style={{padding:"10px 20px", borderRadius:"50px", background:"#FF8C42", border:"4px solid #1A1A1A", cursor:"pointer", fontFamily:"'Chewy',cursive", fontSize:"0.95rem", color:"#1A1A1A", boxShadow:"4px 4px 0 #1A1A1A", display:"flex", alignItems:"center", gap:"6px"}}
            onMouseDown={e=>{e.currentTarget.style.transform="translate(2px,2px)";e.currentTarget.style.boxShadow="2px 2px 0 #1A1A1A";}}
            onMouseUp={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="4px 4px 0 #1A1A1A";}}>
            <span>💾</span><span>Save doodle</span>
          </button>
        )}
        {savedPet && (
          <div style={{padding:"8px 16px", borderRadius:"50px", background:"#B8E04A", border:"3px solid #1A1A1A", fontFamily:"'Chewy',cursive", fontSize:"0.9rem", color:"#1A1A1A", boxShadow:"3px 3px 0 #1A1A1A"}}>✅ {savedPet.name} saved</div>
        )}
      </div>
    </div>
  );
}
