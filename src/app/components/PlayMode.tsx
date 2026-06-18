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

let _ctx: AudioContext|null=null;
function getCtx(){if(!_ctx)_ctx=new AudioContext(); return _ctx;}

type InstrumentId="piano"|"guitar"|"marimba"|"flute"|"bells"|"synthpad";

function playNote(freq:number,vol:number,dur:number,inst:InstrumentId,startTime:number){
  const ctx=getCtx();
  const gain=ctx.createGain(); gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.001,startTime);
  switch(inst){
    case"piano":{
      const o=ctx.createOscillator();o.type="sine";o.frequency.value=freq;o.connect(gain);
      gain.gain.linearRampToValueAtTime(vol,startTime+0.01);
      gain.gain.exponentialRampToValueAtTime(0.001,startTime+dur);
      o.start(startTime);o.stop(startTime+dur);
      const o2=ctx.createOscillator();o2.type="triangle";o2.frequency.value=freq*2;
      const g2=ctx.createGain();g2.gain.value=0.1;o2.connect(g2);g2.connect(gain);o2.start(startTime);o2.stop(startTime+dur);
      break;
    }
    case"guitar":{
      const o=ctx.createOscillator();o.type="sawtooth";o.frequency.value=freq;
      const f=ctx.createBiquadFilter();f.type="lowpass";f.frequency.value=1800;
      o.connect(f);f.connect(gain);
      gain.gain.linearRampToValueAtTime(vol*0.9,startTime+0.005);
      gain.gain.exponentialRampToValueAtTime(0.001,startTime+dur*0.8);
      o.start(startTime);o.stop(startTime+dur);
      break;
    }
    case"marimba":{
      const o=ctx.createOscillator();o.type="sine";o.frequency.value=freq;o.connect(gain);
      gain.gain.linearRampToValueAtTime(vol,startTime+0.003);
      gain.gain.exponentialRampToValueAtTime(0.001,startTime+0.55);
      o.start(startTime);o.stop(startTime+0.6);
      break;
    }
    case"flute":{
      const o=ctx.createOscillator();o.type="sine";o.frequency.value=freq;
      const vib=ctx.createOscillator();vib.frequency.value=5.5;
      const vg=ctx.createGain();vg.gain.value=freq*0.012;
      vib.connect(vg);vg.connect(o.frequency);o.connect(gain);
      gain.gain.linearRampToValueAtTime(vol*0.7,startTime+0.06);
      gain.gain.setValueAtTime(vol*0.7,startTime+dur-0.1);
      gain.gain.exponentialRampToValueAtTime(0.001,startTime+dur);
      vib.start(startTime);vib.stop(startTime+dur);
      o.start(startTime);o.stop(startTime+dur);
      break;
    }
    case"bells":{
      [1,2.756,5.404].forEach((ratio,i)=>{
        const o=ctx.createOscillator();o.type="sine";o.frequency.value=freq*ratio;
        const g=ctx.createGain();g.gain.value=i===0?vol:vol*0.14;
        o.connect(g);g.connect(gain);o.start(startTime);o.stop(startTime+dur*1.5);
      });
      gain.gain.linearRampToValueAtTime(1,startTime+0.002);
      gain.gain.exponentialRampToValueAtTime(0.001,startTime+dur*1.5);
      break;
    }
    case"synthpad":{
      [1,1.005,0.5].forEach(ratio=>{
        const o=ctx.createOscillator();o.type="sawtooth";o.frequency.value=freq*ratio;
        const f=ctx.createBiquadFilter();f.type="lowpass";f.frequency.value=900;
        o.connect(f);f.connect(gain);o.start(startTime);o.stop(startTime+dur+0.3);
      });
      gain.gain.linearRampToValueAtTime(vol*0.5,startTime+0.12);
      gain.gain.setValueAtTime(vol*0.5,startTime+dur-0.1);
      gain.gain.exponentialRampToValueAtTime(0.001,startTime+dur+0.3);
      break;
    }
  }
}

const INSTRUMENTS:{id:InstrumentId;label:string;emoji:string;bg:string}[]=[
  {id:"piano",   label:"Piano",    emoji:"🎹",bg:"#FF6B8A"},
  {id:"guitar",  label:"Guitar",   emoji:"🎸",bg:"#FFE033"},
  {id:"marimba", label:"Marimba",  emoji:"🎵",bg:"#B8E04A"},
  {id:"flute",   label:"Flute",    emoji:"🪈",bg:"#5BC8F5"},
  {id:"bells",   label:"Bells",    emoji:"🔔",bg:"#FFE033"},
  {id:"synthpad",label:"Synth",    emoji:"🌟",bg:"#C06BDB"},
];

const NOTE_COLORS=["#FF6B8A","#FF8C42","#FFE033","#B8E04A","#5BC8F5","#5BAEFF","#C06BDB","#5FD49A"];

function MelodyGrid({notes,activeStep}:{notes:MelodyNote[];activeStep:number}){
  const ROWS=8;
  return(
    <div style={{display:"grid",gridTemplateColumns:`repeat(${notes.length},1fr)`,gridTemplateRows:`repeat(${ROWS},1fr)`,gap:"2px",width:"100%",height:"100%"}}>
      {Array.from({length:ROWS}).map((_,row)=>notes.map((note,col)=>{
        const noteRow=note.rest?-1:Math.round((1-(note.volume-0.25)/0.45)*(ROWS-1));
        const isActive=col===activeStep,hasNote=!note.rest&&noteRow===row;
        return(<div key={`${row}-${col}`} style={{
          borderRadius:"4px",
          background:isActive&&hasNote?NOTE_COLORS[row%NOTE_COLORS.length]:isActive?"rgba(255,255,255,0.22)":hasNote?`${NOTE_COLORS[row%NOTE_COLORS.length]}88`:"rgba(255,255,255,0.07)",
          border:hasNote?"2px solid #1A1A1A":"1px solid rgba(0,0,0,0.08)",
          transform:isActive&&hasNote?"scale(1.1)":"none",transition:"all 0.07s",
        }}/>);
      }))}
    </div>
  );
}

// ─── Pet Recorder ──────────────────────────────────────────────────────────────────
function PetRecorder({ drawingDataUrl }: { drawingDataUrl: string | null }) {
  const [recording,  setRecording]  = useState(false);
  const [audioURL,   setAudioURL]   = useState<string | null>(null);
  const [audioBlob,  setAudioBlob]  = useState<Blob | null>(null);
  const [remixing,   setRemixing]   = useState(false);
  const [remixURL,   setRemixURL]   = useState<string | null>(null);
  const mediaRecRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob); setAudioURL(URL.createObjectURL(blob));
        setRemixURL(null); stream.getTracks().forEach(t => t.stop());
      };
      mr.start(); mediaRecRef.current = mr;
      setRecording(true); setAudioURL(null); setRemixURL(null);
    } catch { alert("Microphone access denied."); }
  };

  const stopRecording = () => { mediaRecRef.current?.stop(); setRecording(false); };

  const remixWithMelody = async () => {
    if (!audioBlob || !drawingDataUrl) return;
    setRemixing(true);
    try {
      const actx     = new AudioContext();
      const arrayBuf = await audioBlob.arrayBuffer();
      const decoded  = await actx.decodeAudioData(arrayBuf);
      const src      = actx.createBufferSource();
      src.buffer = decoded; src.loop = true;
      const gain = actx.createGain(); gain.gain.value = 0.85;
      src.connect(gain).connect(actx.destination);
      src.start();
      const dest   = actx.createMediaStreamDestination();
      gain.connect(dest);
      const mr2    = new MediaRecorder(dest.stream);
      const chunks2: BlobPart[] = [];
      mr2.ondataavailable = e => chunks2.push(e.data);
      mr2.onstop = () => {
        setRemixURL(URL.createObjectURL(new Blob(chunks2, { type: "audio/webm" })));
        setRemixing(false);
      };
      mr2.start();
      setTimeout(() => { mr2.stop(); src.stop(); actx.close(); }, 6000);
    } catch (err) { console.error(err); setRemixing(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "0 14px 14px" }}>
      <div style={{ height: "2px", background: "rgba(0,0,0,0.15)", borderRadius: "2px" }} />

      {/* Record button */}
      <button
        onClick={recording ? stopRecording : startRecording}
        style={{ width: "100%", padding: "14px", borderRadius: "14px", background: recording ? "#FF6B8A" : "#FFFBF2", border: recording ? "4px solid #1A1A1A" : "3px solid #1A1A1A", cursor: "pointer", fontFamily: "'Chewy',cursive", fontSize: "1.1rem", color: "#1A1A1A", boxShadow: recording ? "2px 2px 0 #1A1A1A" : "4px 4px 0 #1A1A1A", transform: recording ? "translate(2px,2px)" : "none", transition: "all 0.1s", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
        <span>{recording ? "⏹" : "🔴"}</span>
        <span>{recording ? "Stop recording" : "Record your pet"}</span>
      </button>

      {/* Listen — appears after recording */}
      {audioURL && !recording && (
        <audio controls src={audioURL} style={{ width: "100%", borderRadius: "8px" }} />
      )}

      {/* Remix — appears after recording */}
      {audioURL && !recording && (
        <button
          onClick={remixWithMelody}
          disabled={remixing || !drawingDataUrl}
          style={{ width: "100%", padding: "14px", borderRadius: "14px", background: remixing ? "#DDD" : "#C06BDB", border: "3px solid #1A1A1A", cursor: remixing || !drawingDataUrl ? "not-allowed" : "pointer", fontFamily: "'Chewy',cursive", fontSize: "1.1rem", color: "#1A1A1A", boxShadow: remixing ? "none" : "4px 4px 0 #1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          <span>🎵</span>
          <span>{remixing ? "Mixing..." : "Remix with your drawing!"}</span>
        </button>
      )}

      {/* Download — appears after remix */}
      {remixURL && (
        <div style={{ background: "#B8E04A", border: "3px solid #1A1A1A", borderRadius: "14px", padding: "12px", boxShadow: "4px 4px 0 #1A1A1A", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "0.85rem", color: "#1A1A1A", fontFamily: "'Chewy',cursive" }}>🎉 Your pet + your drawing:</div>
          <audio controls src={remixURL} style={{ width: "100%", borderRadius: "8px" }} />
          <a href={remixURL} download="pet-remix.webm" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px", borderRadius: "50px", background: "#FFFBF2", border: "3px solid #1A1A1A", fontFamily: "'Chewy',cursive", fontSize: "0.9rem", color: "#1A1A1A", boxShadow: "3px 3px 0 #1A1A1A", textDecoration: "none" }}>
            <span>⬇️</span><span>Download remix</span>
          </a>
        </div>
      )}
    </div>
  );
}

interface PlayModeProps {
  drawingDataUrl:       string|null;
  onMelodyReady?:       (notes:MelodyNote[])=>void;
  onPlayingChange?:     (playing:boolean)=>void;
  externalPlayTrigger?: number;
  onSavePet?:           ()=>void;
  savedPet?:            {name:string}|null;
  onStopRef?:           React.MutableRefObject<(()=>void)|null>;
}

export function PlayMode({drawingDataUrl,onMelodyReady,onPlayingChange,externalPlayTrigger,onSavePet,savedPet,onStopRef}:PlayModeProps){
  const [melody,      setMelody]      = useState<MelodyNote[]>([]);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [activeStep,  setActiveStep]  = useState(-1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeInst,  setActiveInst]  = useState(0);
  const [tempo,       setTempo]       = useState(120);
  const [loop,        setLoop]        = useState(true);

  const stopRef    = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const instIdRef  = useRef<InstrumentId>(INSTRUMENTS[0].id);
  const tempoRef   = useRef(120);
  const loopRef    = useRef(true);
  const melodyRef  = useRef<MelodyNote[]>([]);

  useEffect(()=>{instIdRef.current=INSTRUMENTS[activeInst].id;},[activeInst]);
  useEffect(()=>{tempoRef.current=tempo;},[tempo]);
  useEffect(()=>{loopRef.current=loop;},[loop]);
  useEffect(()=>{melodyRef.current=melody;},[melody]);

  useEffect(()=>{
    if(!drawingDataUrl) return;
    setIsAnalyzing(true);
    generateMelody(drawingDataUrl).then(notes=>{
      setMelody(notes); melodyRef.current=notes;
      onMelodyReady?.(notes); setIsAnalyzing(false);
    });
  },[drawingDataUrl]);

  const stop = useCallback(()=>{
    stopRef.current=true;
    if(timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsPlaying(false); onPlayingChange?.(false); setActiveStep(-1);
  },[onPlayingChange]);

  useEffect(()=>{
    if(onStopRef) onStopRef.current=stop;
    return()=>{ if(onStopRef) onStopRef.current=null; };
  },[stop,onStopRef]);

  useEffect(()=>()=>{ stop(); },[]);

  const play = useCallback((notesOverride?:MelodyNote[])=>{
    const notes=notesOverride??melodyRef.current;
    if(!notes.length) return;
    const ctx=getCtx();
    if(ctx.state==="suspended") ctx.resume();
    stopRef.current=false;
    setIsPlaying(true); onPlayingChange?.(true);
    let step=0;
    function tick(){
      if(stopRef.current) return;
      const note=notes[step];
      const beatMs=(60/tempoRef.current)*1000;
      setActiveStep(step);
      if(!note.rest) playNote(note.freq,note.volume,note.duration*(120/tempoRef.current),instIdRef.current,getCtx().currentTime);
      step++;
      if(step>=notes.length){
        if(loopRef.current){step=0;timeoutRef.current=setTimeout(tick,beatMs*0.4);}
        else{setIsPlaying(false);onPlayingChange?.(false);setActiveStep(-1);}
        return;
      }
      timeoutRef.current=setTimeout(tick,beatMs*(note.rest?0.5:note.duration*(120/tempoRef.current)*1.05));
    }
    tick();
  },[onPlayingChange]);

  useEffect(()=>{
    if(melody.length&&!isPlaying){const t=setTimeout(()=>play(),350);return()=>clearTimeout(t);}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[melody]);

  useEffect(()=>{
    if(externalPlayTrigger&&externalPlayTrigger>0&&melodyRef.current.length){stop();setTimeout(()=>play(),100);}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[externalPlayTrigger]);

  const inst=INSTRUMENTS[activeInst];

  const handleInstChange=(i:number)=>{
    const wasPlaying=!stopRef.current&&isPlaying;
    stop(); setActiveInst(i); instIdRef.current=INSTRUMENTS[i].id;
    if(wasPlaying) setTimeout(()=>play(),80);
  };

  return(
    <div className="flex-1 flex flex-col overflow-hidden" style={{fontFamily:"'Chewy',cursive",background:"#5BC8F5"}}>
      <div style={{background:"#5BC8F5",borderBottom:"3px solid #1A1A1A",padding:"10px 16px",display:"flex",alignItems:"center",gap:"12px",flexShrink:0,flexWrap:"wrap"}}>
        <div style={{width:"60px",height:"60px",background:"#FFFBF2",border:"3px solid #1A1A1A",borderRadius:"14px",overflow:"hidden",flexShrink:0,boxShadow:"3px 3px 0 #1A1A1A",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {drawingDataUrl?<img src={drawingDataUrl} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:"1.6rem"}}>🎨</span>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"2px",flexShrink:0}}>
          <span style={{fontSize:"0.85rem",color:"#1A1A1A"}}>🎵 Generated melody</span>
          {isAnalyzing?<span style={{fontSize:"0.7rem",color:"#555"}}>⏳ Analyzing drawing...</span>:<span style={{fontSize:"0.7rem",color:"#555"}}>{melody.filter(n=>!n.rest).length} notes · scale detected</span>}
        </div>
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap",flex:1,justifyContent:"center"}}>
          {INSTRUMENTS.map((ins,i)=>{
            const active=activeInst===i;
            return(<button key={ins.id} onClick={()=>handleInstChange(i)} style={{padding:"6px 14px",borderRadius:"50px",background:active?ins.bg:"#FFFBF2",border:active?"4px solid #1A1A1A":"3px solid #1A1A1A",cursor:"pointer",fontFamily:"'Chewy',cursive",fontSize:"0.85rem",color:"#1A1A1A",boxShadow:active?"2px 2px 0 #1A1A1A":"3px 3px 0 #1A1A1A",transform:active?"translate(1px,1px)":"none",transition:"all 0.1s",display:"flex",alignItems:"center",gap:"4px"}}>
              <span>{ins.emoji}</span><span>{ins.label}</span></button>);
          })}
        </div>
      </div>

      <div style={{flex:1,padding:"14px",display:"flex",flexDirection:"column",gap:"10px",overflow:"hidden"}}>
        <div style={{flex:1,background:"rgba(0,0,0,0.15)",border:"3px solid #1A1A1A",borderRadius:"16px",padding:"12px",boxShadow:"4px 4px 0 #1A1A1A",overflow:"hidden"}}>
          {isAnalyzing?(
            <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"10px"}}>
              <span style={{fontSize:"2.5rem"}}>🔍</span>
              <span style={{fontSize:"1rem",color:"#FFFBF2",fontFamily:"'Chewy',cursive"}}>Analyzing your drawing...</span>
            </div>
          ):melody.length>0?(
            <MelodyGrid notes={melody} activeStep={activeStep}/>
          ):(
            <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{color:"#FFFBF2",fontFamily:"'Chewy',cursive"}}>Go to Draw first 🎨</span>
            </div>
          )}
        </div>
      </div>

      {/* Pet Recorder — below the melody grid */}
      <PetRecorder drawingDataUrl={drawingDataUrl} />

      <div style={{background:"#FFFBF2",borderTop:"3px solid #1A1A1A",padding:"10px 20px",display:"flex",alignItems:"center",gap:"14px",flexShrink:0,flexWrap:"wrap",boxShadow:"0 -2px 0 #1A1A1A"}}>
        <button onClick={isPlaying?stop:play} disabled={!melody.length||isAnalyzing} style={{width:"56px",height:"56px",borderRadius:"50%",background:isPlaying?"#FF6B8A":"#B8E04A",border:"3px solid #1A1A1A",cursor:melody.length?"pointer":"not-allowed",fontSize:"1.6rem",boxShadow:"4px 4px 0 #1A1A1A",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.1s"}}
          onMouseDown={e=>{e.currentTarget.style.transform="translate(2px,2px)";e.currentTarget.style.boxShadow="2px 2px 0 #1A1A1A";}}
          onMouseUp={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="4px 4px 0 #1A1A1A";}}>
          {isPlaying?"⏹":"▶️"}
        </button>
        <div style={{display:"flex",alignItems:"center",gap:"10px",flex:1,minWidth:"160px"}}>
          <span style={{fontSize:"0.9rem",color:"#1A1A1A",flexShrink:0}}>Tempo</span>
          <input type="range" min={60} max={200} step={5} value={tempo} onChange={e=>{stop();setTempo(Number(e.target.value));}} style={{flex:1,accentColor:inst.bg,cursor:"pointer"}}/>
          <span style={{background:inst.bg,border:"2px solid #1A1A1A",borderRadius:"50px",padding:"2px 12px",fontSize:"0.9rem",color:"#1A1A1A",minWidth:"50px",textAlign:"center",flexShrink:0}}>{tempo}</span>
        </div>
        <button onClick={()=>setLoop(l=>!l)} style={{padding:"8px 14px",borderRadius:"50px",background:loop?inst.bg:"#FFFBF2",border:loop?"4px solid #1A1A1A":"3px solid #1A1A1A",cursor:"pointer",fontFamily:"'Chewy',cursive",fontSize:"0.85rem",color:"#1A1A1A",boxShadow:loop?"2px 2px 0 #1A1A1A":"3px 3px 0 #1A1A1A",transform:loop?"translate(1px,1px)":"none",display:"flex",alignItems:"center",gap:"5px"}}>
          <span>🔁</span><span>Loop {loop?"ON":"OFF"}</span>
        </button>
        {onSavePet&&!savedPet&&melody.length>0&&(
          <button onClick={onSavePet} style={{padding:"10px 20px",borderRadius:"50px",background:"#FF8C42",border:"4px solid #1A1A1A",cursor:"pointer",fontFamily:"'Chewy',cursive",fontSize:"0.95rem",color:"#1A1A1A",boxShadow:"4px 4px 0 #1A1A1A",display:"flex",alignItems:"center",gap:"6px"}}
            onMouseDown={e=>{e.currentTarget.style.transform="translate(2px,2px)";e.currentTarget.style.boxShadow="2px 2px 0 #1A1A1A";}}
            onMouseUp={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="4px 4px 0 #1A1A1A";}}>
            <span>💾</span><span>Save pet</span></button>
        )}
        {savedPet&&(
          <div style={{padding:"8px 16px",borderRadius:"50px",background:"#B8E04A",border:"3px solid #1A1A1A",fontFamily:"'Chewy',cursive",fontSize:"0.9rem",color:"#1A1A1A",boxShadow:"3px 3px 0 #1A1A1A"}}>✅ {savedPet.name} saved</div>
        )}
      </div>
    </div>
  );
}
