import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Eraser, Save, Play, PawPrint, Music2 } from "lucide-react";

type Screen = "login" | "draw" | "play";
type Instrument = "piano" | "guitar" | "trumpet" | "sax" | "violin" | "drums" | "accordion" | "marimba";

const instruments: { id: Instrument; name: string; icon: string; color: string }[] = [
  { id: "piano", name: "Piano", icon: "🎹", color: "#FFE431" },
  { id: "guitar", name: "Guitarra", icon: "🎸", color: "#FFFFFF" },
  { id: "trumpet", name: "Trompeta", icon: "🎺", color: "#FFFFFF" },
  { id: "sax", name: "Saxofón", icon: "🎷", color: "#FFFFFF" },
  { id: "violin", name: "Violín", icon: "🎻", color: "#FFFFFF" },
  { id: "drums", name: "Batería", icon: "🥁", color: "#FFFFFF" },
  { id: "accordion", name: "Acordeón", icon: "🪗", color: "#FFFFFF" },
  { id: "marimba", name: "Marimba", icon: "🎵", color: "#FFFFFF" },
];

const crayons = ["#0097B2", "#FF5FA2", "#FFE431", "#FF8C2A", "#94D82D", "#8E5BE8"];
const notes = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25];
let audio: AudioContext | null = null;

function ctx() {
  audio = audio || new AudioContext();
  return audio;
}

function tone(freq: number, type: OscillatorType = "sine", duration = 0.42) {
  const c = ctx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(c.destination);
  g.gain.setValueAtTime(0.001, c.currentTime);
  g.gain.linearRampToValueAtTime(0.25, c.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  o.start();
  o.stop(c.currentTime + duration);
}

function Outlined({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`[text-shadow:3px_0_#111,-3px_0_#111,0_3px_#111,0_-3px_#111,2px_2px_#111,-2px_2px_#111,2px_-2px_#111,-2px_-2px_#111] ${className}`}>{children}</span>;
}

function SkyDecor() {
  return <div className="pointer-events-none absolute inset-0 overflow-hidden font-display text-4xl font-black">
    {["♪","♫","★","🐾","✦","♪","☁","♫","🐾","★"].map((d, i) => (
      <span key={i} className="absolute animate-[bounce_3s_ease-in-out_infinite]" style={{ left: `${6 + (i * 13) % 88}%`, top: `${5 + (i * 19) % 78}%`, color: ["#ff5fa2", "#ffe431", "#2c8be8", "#94d82d"][i % 4], animationDelay: `${i * .2}s` }}>{d}</span>
    ))}
  </div>;
}

function Login({ go }: { go: (s: Screen) => void }) {
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#43C7F4] p-6 font-ui">
    <SkyDecor />
    <div className="absolute bottom-0 left-0 right-0 h-[26vh] rounded-t-[55%] border-t-[6px] border-black bg-[#9BE34B]" />
    <div className="absolute bottom-0 left-[12%] h-[18vh] w-[70vw] rounded-t-[65%] border-t-[5px] border-black bg-[#BDF35B]" />
    <section className="relative z-10 w-full max-w-[560px] rounded-[38%_44%_34%_42%/28%_30%_32%_34%] border-[7px] border-black bg-[#FFE431] px-10 py-12 text-center">
      <div className="mb-2 flex justify-center gap-4 text-6xl"><span>🐶</span><span>🐱</span></div>
      <h1 className="font-display text-6xl leading-none md:text-7xl"><Outlined className="text-[#FF5FA2]">Pet</Outlined> <Outlined className="text-[#28A8FF]">Voice</Outlined><br/><Outlined className="text-[#8DDC28]">Synthesizer</Outlined></h1>
      <div className="mx-auto mt-8 grid max-w-[410px] gap-4">
        <input className="rounded-2xl border-[5px] border-black bg-white px-6 py-4 font-pixel text-2xl outline-none" placeholder="username" />
        <input className="rounded-2xl border-[5px] border-black bg-white px-6 py-4 font-pixel text-2xl outline-none" placeholder="password" type="password" />
        <button onClick={() => go("draw")} className="mt-2 rounded-[2rem] border-[6px] border-black bg-[#FF941F] px-8 py-4 font-pixel text-3xl text-[#4A2500] active:translate-y-1">Let's Go! 🐾</button>
      </div>
      <button onClick={() => go("draw")} className="mt-8 font-pixel text-xl text-[#087D86]">first time? draw your pet →</button>
    </section>
  </main>;
}

function PetPreview({ drawing }: { drawing: string | null }) {
  return <div className="grid place-items-center rounded-[2rem] border-[6px] border-black bg-white p-4 shadow-[12px_12px_0_#0780C8]">
    {drawing ? <img src={drawing} alt="Tu dibujo de mascota" className="h-44 w-44 object-contain" /> : <div className="text-9xl">🐱</div>}
  </div>;
}

function DrawMode({ go, save }: { go: (s: Screen) => void; save: (d: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(crayons[0]);
  const [down, setDown] = useState(false);
  const clear = () => { const c = ref.current, x = c?.getContext("2d"); if (!c || !x) return; x.fillStyle = "#FFFDFC"; x.fillRect(0,0,c.width,c.height); save(c.toDataURL()); };
  useEffect(clear, []);
  const pos = (e: React.PointerEvent) => { const c = ref.current!, r = c.getBoundingClientRect(); return { x: (e.clientX-r.left)*c.width/r.width, y: (e.clientY-r.top)*c.height/r.height }; };
  const draw = (e: React.PointerEvent) => { if (!down) return; const c=ref.current!, x=c.getContext("2d")!, p=pos(e); x.lineWidth=12; x.lineCap="round"; x.strokeStyle=color; x.globalAlpha=.85; x.lineTo(p.x,p.y); x.stroke(); save(c.toDataURL()); };
  return <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#45C9F5] font-ui"><SkyDecor />
    <Header title="Draw Mode" icon="🎨" left={() => go("login")} />
    <div className="relative z-10 grid flex-1 grid-cols-[130px_1fr] gap-5 p-5">
      <aside className="rounded-[3rem] border-[6px] border-black bg-[#FFE431] p-4"><div className="mb-4 grid gap-3">{[8,18,28].map(s=><button key={s} className="h-14 rounded-2xl border-[5px] border-black bg-white"><span className="mx-auto block rounded-full bg-black" style={{width:s,height:s}}/></button>)}</div><div className="grid grid-cols-2 gap-3 border-y-4 border-dotted border-black py-4">{crayons.map(c=><button key={c} onClick={()=>setColor(c)} className="aspect-square rounded-full border-[5px] border-black" style={{background:c, transform: color===c ? "scale(1.12)" : undefined}} />)}</div><button onClick={clear} className="mt-5 grid h-24 w-full place-items-center rounded-2xl border-[5px] border-black bg-white"><Eraser size={44}/></button></aside>
      <section className="rounded-[2rem] border-[6px] border-black bg-white p-5 shadow-[14px_14px_0_#0780C8]"><p className="mb-2 font-pixel text-xl text-gray-500">dibuja tu mascota aquí ✦</p><canvas ref={ref} width={1000} height={580} onPointerDown={(e)=>{setDown(true); const x=ref.current!.getContext("2d")!, p=pos(e); x.beginPath(); x.moveTo(p.x,p.y)}} onPointerMove={draw} onPointerUp={()=>setDown(false)} onPointerLeave={()=>setDown(false)} className="h-[calc(100%-2rem)] w-full touch-none rounded-xl bg-[radial-gradient(#ddd_2px,transparent_2px)] [background-size:28px_28px]" /></section>
    </div>
    <footer className="relative z-10 flex items-center justify-center gap-28 border-t-[6px] border-black bg-[#A9E63E] p-5"><button onClick={clear} className="rounded-2xl border-[5px] border-black bg-white px-10 py-3 font-display text-3xl">Reset</button><button onClick={()=>go("play")} className="rounded-[2rem] border-[6px] border-black bg-[#FF7F22] px-16 py-3 font-display text-5xl text-white [text-shadow:3px_3px_#111]">¡Listo! ♫</button><button className="rounded-2xl border-[5px] border-black bg-[#19C7C5] px-10 py-3"><Camera size={42}/></button></footer>
  </main>;
}

function Header({ title, icon, left }: { title: string; icon: string; left: () => void }) {
  return <header className="relative z-10 flex items-center justify-between border-b-[6px] border-black bg-[#FFE431] px-6 py-4"><button onClick={left} className="grid size-20 place-items-center rounded-3xl border-[6px] border-black bg-[#FF7F22]"><ArrowLeft size={46}/></button><h2 className="font-display text-7xl"><Outlined className="text-[#FF65A3]">{title.split(" ")[0]}</Outlined> <Outlined className="text-[#28A8FF]">{title.split(" ")[1]}</Outlined> <span>{icon}</span></h2><div className="grid size-20 place-items-center rounded-3xl border-[6px] border-black bg-white"><PawPrint size={42}/></div></header>;
}

function PlayMode({ go, drawing }: { go: (s: Screen) => void; drawing: string | null }) {
  const [active, setActive] = useState<Instrument>("piano");
  const wave = { piano: "Piano keys", guitar: "Chord pads", trumpet: "Valve notes", sax: "Brassy keys", violin: "String bows", drums: "Drum kit", accordion: "Bellows", marimba: "Wood bars" }[active];
  return <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#45C9F5] font-ui"><SkyDecor /><Header title="Play Mode" icon="🎵" left={()=>go("draw")} />
    <section className="relative z-10 flex flex-1 flex-col items-center gap-4 p-5"><PetPreview drawing={drawing}/><h3 className="font-display text-5xl text-[#3B1D0C]">tu mascota 🐾</h3>
      <div className="grid w-full max-w-5xl grid-cols-4 gap-4">{instruments.map(i=><button key={i.id} onClick={()=>setActive(i.id)} className="rounded-[35%] border-[6px] border-black p-3 font-display text-2xl active:translate-y-1" style={{background: active===i.id ? "#FFE431" : i.color, boxShadow: active===i.id ? "0 0 0 8px #FF7F22 inset, 8px 8px 0 #0780C8" : "8px 8px 0 #0780C8"}}><div className="text-5xl">{i.icon}</div>{i.name}</button>)}</div>
      <div className="w-full max-w-5xl rounded-3xl border-[6px] border-black bg-[#C9F044] p-6"><p className="mb-4 font-pixel text-lg text-[#13758A]">{wave}</p><div className="flex items-end justify-center gap-3">{notes.map((n,k)=><button key={n} onClick={()=> active==="drums" ? tone(80+k*30,"square",.12) : tone(n, active==="trumpet"||active==="sax" ? "sawtooth" : active==="guitar" ? "triangle" : "sine")} className="rounded-2xl border-[5px] border-black bg-white px-5 font-display text-2xl active:translate-y-2" style={{height: `${70 + (k%4)*22}px`, background: k%2 ? "#FF7F22" : "#0097B2", color: "white"}}>{k+1}</button>)}</div></div>
      <div className="flex gap-10"><button onClick={()=>tone(392,"sine",.6)} className="rounded-[2rem] border-[6px] border-black bg-[#FF7F22] px-12 py-4 font-display text-5xl text-white [text-shadow:3px_3px_#111]"><Play className="mr-3 inline" size={46} fill="white"/>Play</button><button className="rounded-[2rem] border-[6px] border-black bg-white px-12 py-4 font-display text-5xl"><Save className="mr-3 inline" size={44}/>Guardar</button></div>
    </section>
  </main>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [drawing, setDrawing] = useState<string | null>(null);
  if (screen === "login") return <Login go={setScreen} />;
  if (screen === "draw") return <DrawMode go={setScreen} save={setDrawing} />;
  return <PlayMode go={setScreen} drawing={drawing} />;
}
