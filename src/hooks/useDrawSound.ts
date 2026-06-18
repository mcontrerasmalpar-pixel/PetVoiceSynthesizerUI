/**
 * useDrawSound — Tonehack-style engine
 *
 * Analyses a canvas dataUrl and generates a unique synthesized sound
 * based on the visual properties of the drawing:
 *
 *  • Dominant hue       → base frequency (pitch)
 *  • Average brightness → oscillator type (bright=sine, dark=sawtooth)
 *  • Ink coverage %     → duration & volume
 *  • Vertical centroid  → filter cutoff (high drawing = bright sound)
 *  • Edge complexity    → vibrato amount
 *  • Color spread       → harmonics count
 *
 * The result: every pet drawing literally SOUNDS different.
 */
import { useRef, useState, useCallback } from "react";

export interface DrawSoundProfile {
  baseFreq:   number;   // Hz
  oscType:    OscillatorType;
  duration:   number;   // seconds
  volume:     number;   // 0–1
  filterFreq: number;   // Hz
  vibrato:    number;   // Hz depth
  harmonics:  number;   // 1–4 extra harmonics
  echo:       boolean;
  label:      string;   // human-readable description
}

function hexToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    default: h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s, l];
}

export function analyzeCanvas(dataUrl: string): Promise<DrawSoundProfile> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const W = 80, H = 80; // downsample for speed
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, W, H);
      const { data } = ctx.getImageData(0, 0, W, H);

      let totalR = 0, totalG = 0, totalB = 0;
      let totalBrightness = 0;
      let inkPixels = 0;
      let verticalSum = 0;
      let hueSum = 0, satSum = 0;
      const total = W * H;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        if (a < 10) continue;
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

        // Background is ~#FFFBF2 (near white) — skip near-white pixels
        if (brightness > 0.95 && r > 240 && g > 240 && b > 220) continue;

        inkPixels++;
        totalR += r; totalG += g; totalB += b;
        totalBrightness += brightness;

        const [h, s] = hexToHsl(r, g, b);
        hueSum += h; satSum += s;

        const row = Math.floor((i / 4) / W);
        verticalSum += row;
      }

      if (inkPixels < 10) {
        // Empty canvas: return a soft default
        resolve({
          baseFreq: 440, oscType: "sine", duration: 2, volume: 0.4,
          filterFreq: 2000, vibrato: 2, harmonics: 1, echo: false,
          label: "Silencio...",
        });
        return;
      }

      const coverage  = inkPixels / total;                      // 0–1
      const avgHue    = hueSum / inkPixels;                     // 0–360°
      const avgBright = totalBrightness / inkPixels;            // 0–1
      const avgSat    = satSum / inkPixels;                     // 0–1
      const vertCent  = verticalSum / inkPixels / H;            // 0=top,1=bottom

      // ─ Map hue to musical frequency (C2–C6 range, 65–1046 Hz)
      // Hue wheel: red(0°)=low, green(120°)=mid, blue(240°)=high, back to red
      const baseFreq = 65 * Math.pow(2, (avgHue / 360) * 4); // 4 octaves

      // ─ Brightness → waveform character
      let oscType: OscillatorType;
      if (avgBright > 0.7)      oscType = "sine";
      else if (avgBright > 0.4) oscType = "triangle";
      else if (avgBright > 0.2) oscType = "sawtooth";
      else                      oscType = "square";

      // ─ Coverage → duration (more ink = longer note)
      const duration = 1 + coverage * 6; // 1–7 seconds

      // ─ Saturation → volume
      const volume = 0.2 + avgSat * 0.6;

      // ─ Vertical centroid → filter (drawing at top = bright/open, bottom = muffled)
      const filterFreq = 400 + (1 - vertCent) * 8000;

      // ─ Color spread → vibrato
      const uniqueR = totalR / inkPixels, uniqueG = totalG / inkPixels;
      const colorSpread = Math.abs(uniqueR - uniqueG) / 128;
      const vibrato = colorSpread * 12;

      // ─ Saturation spread → harmonics
      const harmonics = Math.min(4, Math.ceil(avgSat * 4));

      // ─ Echo if drawing is sparse (< 5% coverage)
      const echo = coverage < 0.05;

      // ─ Human label
      const hueLabel =
        avgHue < 30  ? "Rojo fuego" :
        avgHue < 60  ? "Naranja" :
        avgHue < 90  ? "Amarillo" :
        avgHue < 150 ? "Verde" :
        avgHue < 210 ? "Cian" :
        avgHue < 270 ? "Azul" :
        avgHue < 330 ? "Violeta" : "Rosa";

      const noteLabel =
        baseFreq < 130  ? "nota grave profunda" :
        baseFreq < 260  ? "nota media" :
        baseFreq < 520  ? "nota aguda" : "nota muy aguda";

      const label = `${hueLabel} • ${noteLabel} • ${Math.round(coverage * 100)}% tinta`;

      resolve({ baseFreq, oscType, duration, volume, filterFreq, vibrato, harmonics, echo, label });
    };
    img.src = dataUrl;
  });
}

export function useDrawSound() {
  const [profile,   setProfile]   = useState<DrawSoundProfile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<(AudioNode & { stop?: () => void })[]>([]);

  function getCtx() {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  }

  /** Analyze the drawing and compute a sound profile */
  const analyze = useCallback(async (dataUrl: string) => {
    setIsAnalyzing(true);
    const p = await analyzeCanvas(dataUrl);
    setProfile(p);
    setIsAnalyzing(false);
    return p;
  }, []);

  /** Play the current profile (or analyze + play if dataUrl provided) */
  const play = useCallback(async (dataUrl?: string) => {
    let p = profile;
    if (dataUrl) p = await analyzeCanvas(dataUrl);
    if (!p) return;

    stopAll();
    const ctx = getCtx();
    if (ctx.state === "suspended") await ctx.resume();
    setIsPlaying(true);

    const now  = ctx.currentTime;
    const dur  = p.duration;
    const dest = ctx.destination;
    const nodes: any[] = [];

    // Master gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(p.volume, now + 0.08);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    // Filter
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(p.filterFreq, now);
    filter.Q.value = 1.2;

    // Oscillators (fundamental + harmonics)
    for (let h = 0; h < p.harmonics; h++) {
      const osc = ctx.createOscillator();
      osc.type = h === 0 ? p.oscType : "sine";
      osc.frequency.setValueAtTime(p.baseFreq * (h + 1), now);

      // Vibrato
      if (p.vibrato > 0) {
        const vibLfo  = ctx.createOscillator();
        const vibGain = ctx.createGain();
        vibLfo.frequency.value = 5;
        vibGain.gain.value     = p.vibrato;
        vibLfo.connect(vibGain);
        vibGain.connect(osc.frequency);
        vibLfo.start(now); vibLfo.stop(now + dur);
        nodes.push(vibLfo);
      }

      const hGain = ctx.createGain();
      hGain.gain.value = h === 0 ? 1 : 0.3 / h;
      osc.connect(hGain);
      hGain.connect(filter);
      osc.start(now); osc.stop(now + dur);
      nodes.push(osc);
    }

    // Echo chain
    if (p.echo) {
      const delay    = ctx.createDelay(1);
      const fbGain   = ctx.createGain();
      delay.delayTime.value = 0.3;
      fbGain.gain.value     = 0.4;
      filter.connect(delay);
      delay.connect(fbGain);
      fbGain.connect(delay);
      delay.connect(masterGain);
    } else {
      filter.connect(masterGain);
    }
    masterGain.connect(dest);

    nodes.push(filter, masterGain);
    nodesRef.current = nodes;

    setTimeout(() => setIsPlaying(false), (dur + 0.2) * 1000);
  }, [profile]);

  function stopAll() {
    nodesRef.current.forEach(n => { try { (n as any).stop?.(); } catch {} });
    nodesRef.current = [];
    setIsPlaying(false);
  }

  return { profile, analyze, play, stopAll, isPlaying, isAnalyzing };
}
