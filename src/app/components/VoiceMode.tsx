import { useState, useEffect } from "react";
import {
  usePetVoice,
  PRESET_META,
  PetVoicePreset,
} from "../../hooks/usePetVoice";
import { useDrawSound } from "../../hooks/useDrawSound";
import type { DrawSoundProfile } from "../../hooks/useDrawSound";

const PRESETS_LIST: PetVoicePreset[] = [
  "cat", "dog", "bird", "frog", "robot", "ghost", "baby", "giant",
];

const QUICK_PHRASES = [
  "¡Hola! Soy tu mascota favorita",
  "¡Quiero comida ahora mismo!",
  "Juguemos juntos por favor",
  "Estoy muy feliz hoy",
  "¡Miau! ¿Me das un abrazo?",
  "Zzzz... tengo mucho sueño",
];

// Visual bar for DrawSound profile
function SoundBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem" }}>
      <span style={{ width: "72px", color: "#1A1A1A", fontFamily: "'Chewy',cursive", flexShrink: 0 }}>{label}</span>
      <div style={{
        flex: 1, height: "10px", background: "#E8E0C8",
        border: "2px solid #1A1A1A", borderRadius: "50px", overflow: "hidden",
      }}>
        <div style={{
          width: `${Math.min((value / max) * 100, 100)}%`,
          height: "100%", background: color,
          borderRadius: "50px", transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

function WaveformIcon({ type }: { type: OscillatorType }) {
  const shapes: Record<OscillatorType, string> = {
    sine:     "∿",
    triangle: "⋿",
    sawtooth: "⧈",
    square:   "⊞",
    custom:   "★",
  };
  return <span style={{ fontSize: "1.4rem" }}>{shapes[type] ?? "∿"}</span>;
}

export function VoiceMode({ drawingDataUrl }: { drawingDataUrl: string | null }) {
  const {
    config, updateConfig, applyPreset,
    speak, stopSpeaking, isSpeaking,
    startListening, stopListening, isListening,
    transcript, setTranscript,
    error,
  } = usePetVoice();

  const { profile, analyze, play, stopAll, isPlaying, isAnalyzing } = useDrawSound();

  const [inputText,  setInputText]  = useState("");
  const [activeTab,  setActiveTab]  = useState<"voice" | "sound">("voice");
  const meta = PRESET_META[config.preset];

  // Auto-analyze whenever the drawing changes
  useEffect(() => {
    if (drawingDataUrl) analyze(drawingDataUrl);
  }, [drawingDataUrl, analyze]);

  const handleSpeak = () => speak(inputText || transcript || "¡Hola!");

  const sliderStyle: React.CSSProperties = {
    width: "100%", accentColor: meta.bg, cursor: "pointer",
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ fontFamily: "'Chewy', cursive", background: "#5BC8F5" }}>

      {/* ─ Top bar ─ */}
      <div style={{
        background: "#FFE033", borderBottom: "3px solid #1A1A1A",
        padding: "8px 16px",
        display: "flex", alignItems: "center", gap: "12px",
        flexShrink: 0, flexWrap: "wrap",
      }}>
        {/* Pet mini */}
        <div style={{
          width: "48px", height: "48px",
          background: drawingDataUrl ? "transparent" : "#FFFBF2",
          border: "3px solid #1A1A1A", borderRadius: "12px",
          overflow: "hidden", flexShrink: 0, boxShadow: "3px 3px 0 #1A1A1A",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {drawingDataUrl
            ? <img src={drawingDataUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: "1.4rem" }}>🎨</span>}
        </div>

        {/* Active preset */}
        <div style={{
          background: meta.bg, border: "3px solid #1A1A1A",
          borderRadius: "50px", padding: "5px 16px",
          boxShadow: "3px 3px 0 #1A1A1A",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <span style={{ fontSize: "1.5rem" }}>{meta.emoji}</span>
          <div>
            <div style={{ fontSize: "1rem", color: "#1A1A1A" }}>Voz: {meta.label}</div>
            <div style={{ fontSize: "0.65rem", color: "#5A3A00" }}>tono {config.pitch.toFixed(1)} · velocidad {config.rate.toFixed(1)}</div>
          </div>
        </div>

        {/* Draw sound profile badge */}
        {profile && (
          <div style={{
            background: "#FFFBF2", border: "3px solid #1A1A1A",
            borderRadius: "50px", padding: "5px 14px",
            boxShadow: "3px 3px 0 #1A1A1A",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <WaveformIcon type={profile.oscType} />
            <div>
              <div style={{ fontSize: "0.8rem", color: "#1A1A1A" }}>{Math.round(profile.baseFreq)} Hz</div>
              <div style={{ fontSize: "0.6rem", color: "#555" }}>{profile.label}</div>
            </div>
          </div>
        )}

        {/* Status badges */}
        {isSpeaking && (
          <div style={{
            background: "#FF6B8A", border: "3px solid #1A1A1A",
            borderRadius: "50px", padding: "4px 12px", boxShadow: "2px 2px 0 #1A1A1A",
            display: "flex", alignItems: "center", gap: "6px",
          }}>
            <span>🔊</span><span style={{ fontSize: "0.85rem" }}>Hablando...</span>
          </div>
        )}
        {isPlaying && (
          <div style={{
            background: "#C06BDB", border: "3px solid #1A1A1A",
            borderRadius: "50px", padding: "4px 12px", boxShadow: "2px 2px 0 #1A1A1A",
            display: "flex", alignItems: "center", gap: "6px",
          }}>
            <span>🎶</span><span style={{ fontSize: "0.85rem" }}>Sonando...</span>
          </div>
        )}
        {isListening && (
          <div style={{
            background: "#B8E04A", border: "3px solid #1A1A1A",
            borderRadius: "50px", padding: "4px 12px", boxShadow: "2px 2px 0 #1A1A1A",
            display: "flex", alignItems: "center", gap: "6px",
          }}>
            <span>🎤</span><span style={{ fontSize: "0.85rem" }}>Escuchando...</span>
          </div>
        )}
        {error && (
          <div style={{
            background: "#FF6B8A", border: "2px solid #1A1A1A",
            borderRadius: "8px", padding: "3px 10px",
          }}>
            <span style={{ fontSize: "0.75rem", color: "#1A1A1A" }}>{error}</span>
          </div>
        )}
      </div>

      {/* ─ Body ─ */}
      <div style={{ flex: 1, display: "flex", gap: 0, overflow: "hidden" }}>

        {/* Left: preset selector */}
        <div style={{
          width: "96px", flexShrink: 0,
          background: "#FFE033", borderRight: "3px solid #1A1A1A",
          padding: "12px 8px",
          display: "flex", flexDirection: "column", gap: "6px",
          overflowY: "auto",
        }}>
          <span style={{ fontSize: "0.65rem", color: "#1A1A1A", textAlign: "center" }}>VOZ</span>
          {PRESETS_LIST.map(p => {
            const m = PRESET_META[p];
            const active = config.preset === p;
            return (
              <button key={p} onClick={() => applyPreset(p)} style={{
                width: "78px", height: "68px", borderRadius: "14px",
                background: active ? m.bg : "#FFFBF2",
                border: active ? "4px solid #1A1A1A" : "3px solid #1A1A1A",
                cursor: "pointer",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "2px",
                boxShadow: active ? "2px 2px 0 #1A1A1A" : "3px 3px 0 #1A1A1A",
                transform: active ? "translate(2px,2px)" : "none",
                transition: "all 0.1s", fontFamily: "'Chewy',cursive",
              }}>
                <span style={{ fontSize: "1.5rem" }}>{m.emoji}</span>
                <span style={{ fontSize: "0.6rem", color: "#1A1A1A" }}>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Center: tabs */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Tab switcher */}
          <div style={{
            display: "flex", borderBottom: "3px solid #1A1A1A",
            background: "#5BC8F5", flexShrink: 0,
          }}>
            {(["voice", "sound"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                flex: 1, padding: "8px",
                background: activeTab === tab ? "#FFFBF2" : "transparent",
                border: "none",
                borderBottom: activeTab === tab ? "none" : "none",
                borderRight: "3px solid #1A1A1A",
                cursor: "pointer",
                fontFamily: "'Chewy',cursive", fontSize: "1rem", color: "#1A1A1A",
                transition: "background 0.1s",
              }}>
                {tab === "voice" ? "🔊 Voz" : "🎨 Sonido del dibujo"}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>

            {/* ─── VOICE TAB ─── */}
            {activeTab === "voice" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

                {/* Text input */}
                <div style={{
                  background: "#FFFBF2", border: "3px solid #1A1A1A",
                  borderRadius: "16px", padding: "14px", boxShadow: "4px 4px 0 #1A1A1A",
                }}>
                  <div style={{ marginBottom: "8px", fontSize: "0.95rem", color: "#1A1A1A" }}>
                    ✏️ ¿Qué dice tu mascota?
                  </div>
                  <textarea
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder={`Escribe algo para que ${meta.label} lo diga...`}
                    rows={3}
                    style={{
                      width: "100%", padding: "10px 12px",
                      border: "3px solid #1A1A1A", borderRadius: "12px",
                      background: "#FFF8E8", fontFamily: "'Chewy', cursive",
                      fontSize: "1rem", color: "#1A1A1A", resize: "none",
                      outline: "none", boxSizing: "border-box",
                      boxShadow: "2px 2px 0 #1A1A1A",
                    }}
                  />
                  {transcript && !inputText && (
                    <div style={{
                      marginTop: "6px", padding: "8px 12px",
                      background: "#B8E04A", border: "2px solid #1A1A1A", borderRadius: "8px",
                      fontSize: "0.9rem", color: "#1A1A1A",
                    }}>🎤 <em>{transcript}</em></div>
                  )}
                  <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
                    <button onClick={handleSpeak} disabled={isSpeaking} style={{
                      flex: 1, minWidth: "110px", padding: "10px 14px",
                      borderRadius: "50px",
                      background: isSpeaking ? "#DDD" : meta.bg,
                      border: "3px solid #1A1A1A",
                      cursor: isSpeaking ? "not-allowed" : "pointer",
                      fontFamily: "'Chewy',cursive", fontSize: "0.95rem", color: "#1A1A1A",
                      boxShadow: isSpeaking ? "none" : "4px 4px 0 #1A1A1A",
                    }}>
                      {isSpeaking ? "🔊 Hablando..." : `${meta.emoji} ¡Hablar!`}
                    </button>
                    {isSpeaking && (
                      <button onClick={stopSpeaking} style={{
                        padding: "10px 14px", borderRadius: "50px",
                        background: "#FF6B8A", border: "3px solid #1A1A1A",
                        cursor: "pointer", fontFamily: "'Chewy',cursive",
                        fontSize: "0.95rem", color: "#1A1A1A", boxShadow: "3px 3px 0 #1A1A1A",
                      }}>⏹ Stop</button>
                    )}
                    <button
                      onClick={isListening ? stopListening : startListening}
                      style={{
                        flex: 1, minWidth: "110px", padding: "10px 14px",
                        borderRadius: "50px",
                        background: isListening ? "#B8E04A" : "#5BC8F5",
                        border: isListening ? "4px solid #1A1A1A" : "3px solid #1A1A1A",
                        cursor: "pointer",
                        fontFamily: "'Chewy',cursive", fontSize: "0.95rem", color: "#1A1A1A",
                        boxShadow: isListening ? "2px 2px 0 #1A1A1A" : "4px 4px 0 #1A1A1A",
                        transform: isListening ? "translate(1px,1px)" : "none",
                      }}>
                      {isListening ? "🔴 Parar mic" : "🎤 Hablar al mic"}
                    </button>
                  </div>
                </div>

                {/* Quick phrases */}
                <div style={{
                  background: "#FFFBF2", border: "3px solid #1A1A1A",
                  borderRadius: "16px", padding: "12px", boxShadow: "4px 4px 0 #1A1A1A",
                }}>
                  <div style={{ marginBottom: "8px", fontSize: "0.9rem", color: "#1A1A1A" }}>⚡ Frases rápidas</div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {QUICK_PHRASES.map(phrase => (
                      <button key={phrase}
                        onClick={() => { setInputText(phrase); speak(phrase); }}
                        style={{
                          padding: "5px 12px", borderRadius: "50px",
                          background: "#FFFBF2", border: "3px solid #1A1A1A",
                          cursor: "pointer", fontFamily: "'Chewy',cursive",
                          fontSize: "0.8rem", color: "#1A1A1A",
                          boxShadow: "3px 3px 0 #1A1A1A", transition: "all 0.1s",
                        }}
                        onMouseDown={e => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = "1px 1px 0 #1A1A1A"; }}
                        onMouseUp={e =>   { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "3px 3px 0 #1A1A1A"; }}
                      >{phrase}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── DRAW SOUND TAB ─── */}
            {activeTab === "sound" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

                {!drawingDataUrl ? (
                  <div style={{
                    background: "#FFFBF2", border: "3px solid #1A1A1A",
                    borderRadius: "16px", padding: "24px",
                    boxShadow: "4px 4px 0 #1A1A1A", textAlign: "center",
                  }}>
                    <div style={{ fontSize: "3rem" }}>🎨</div>
                    <div style={{ fontSize: "1rem", color: "#1A1A1A", marginTop: "8px" }}>
                      Ve a <strong>Draw</strong> y dibuja tu mascota primero
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#888", marginTop: "4px" }}>
                      El dibujo generará un sonido único basado en sus colores y forma
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Pet preview + play button */}
                    <div style={{
                      background: "#FFFBF2", border: "3px solid #1A1A1A",
                      borderRadius: "16px", padding: "16px",
                      boxShadow: "4px 4px 0 #1A1A1A",
                      display: "flex", gap: "16px", alignItems: "center",
                    }}>
                      <img src={drawingDataUrl} style={{
                        width: "90px", height: "90px", objectFit: "cover",
                        border: "3px solid #1A1A1A", borderRadius: "12px",
                        boxShadow: "3px 3px 0 #1A1A1A", flexShrink: 0,
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.9rem", color: "#1A1A1A", marginBottom: "6px" }}>
                          🔍 Analizando tu dibujo...
                        </div>
                        {isAnalyzing && (
                          <div style={{
                            background: "#FFE033", border: "2px solid #1A1A1A",
                            borderRadius: "8px", padding: "4px 10px",
                            fontSize: "0.8rem", color: "#1A1A1A", display: "inline-block",
                          }}>⏳ Analizando colores y formas...</div>
                        )}
                        {profile && !isAnalyzing && (
                          <div style={{
                            background: "#B8E04A", border: "2px solid #1A1A1A",
                            borderRadius: "8px", padding: "4px 10px",
                            fontSize: "0.75rem", color: "#1A1A1A", display: "inline-block",
                          }}>✅ {profile.label}</div>
                        )}
                      </div>
                    </div>

                    {/* Sound profile bars */}
                    {profile && (
                      <div style={{
                        background: "#FFFBF2", border: "3px solid #1A1A1A",
                        borderRadius: "16px", padding: "14px",
                        boxShadow: "4px 4px 0 #1A1A1A",
                        display: "flex", flexDirection: "column", gap: "10px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ fontSize: "0.95rem", color: "#1A1A1A" }}>🎛️ Perfil sonoro de tu mascota</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <WaveformIcon type={profile.oscType} />
                            <span style={{ fontSize: "0.75rem", color: "#555" }}>{profile.oscType}</span>
                          </div>
                        </div>

                        <SoundBar value={profile.baseFreq} max={1046} color="#FF6B8A" label="🎵 Frecuencia" />
                        <SoundBar value={profile.volume}   max={1}    color="#FF8C42" label="🔊 Volumen" />
                        <SoundBar value={profile.duration} max={7}    color="#FFE033" label="⏱ Duración" />
                        <SoundBar value={profile.filterFreq / 100} max={84} color="#B8E04A" label="🔷 Filtro" />
                        <SoundBar value={profile.vibrato}  max={12}   color="#5BC8F5" label="🌀 Vibrato" />
                        <SoundBar value={profile.harmonics} max={4}   color="#C06BDB" label="✨ Armónicos" />

                        {/* Toggles */}
                        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                          {profile.echo && (
                            <span style={{
                              background: "#5BAEFF", border: "2px solid #1A1A1A",
                              borderRadius: "50px", padding: "2px 10px",
                              fontSize: "0.75rem", color: "#1A1A1A",
                            }}>🌊 Eco activo</span>
                          )}
                          <span style={{
                            background: "#FFE033", border: "2px solid #1A1A1A",
                            borderRadius: "50px", padding: "2px 10px",
                            fontSize: "0.75rem", color: "#1A1A1A",
                          }}>{Math.round(profile.baseFreq)} Hz</span>
                        </div>
                      </div>
                    )}

                    {/* Play / Stop buttons */}
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => play(drawingDataUrl)}
                        disabled={isPlaying || isAnalyzing}
                        style={{
                          flex: 1, padding: "12px", borderRadius: "50px",
                          background: isPlaying ? "#DDD" : "#C06BDB",
                          border: "3px solid #1A1A1A",
                          cursor: isPlaying ? "not-allowed" : "pointer",
                          fontFamily: "'Chewy',cursive", fontSize: "1rem", color: "#1A1A1A",
                          boxShadow: isPlaying ? "none" : "4px 4px 0 #1A1A1A",
                          transition: "all 0.1s",
                        }}
                        onMouseDown={e => { if (!isPlaying) { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = "2px 2px 0 #1A1A1A"; }}}
                        onMouseUp={e =>   { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = isPlaying ? "none" : "4px 4px 0 #1A1A1A"; }}
                      >
                        {isPlaying ? "🎶 Sonando..." : "▶️ ¡Tocar sonido del dibujo!"}
                      </button>
                      {isPlaying && (
                        <button onClick={stopAll} style={{
                          padding: "12px 18px", borderRadius: "50px",
                          background: "#FF6B8A", border: "3px solid #1A1A1A",
                          cursor: "pointer", fontFamily: "'Chewy',cursive",
                          fontSize: "1rem", color: "#1A1A1A", boxShadow: "3px 3px 0 #1A1A1A",
                        }}>⏹</button>
                      )}
                    </div>

                    {/* Re-analyze */}
                    <button
                      onClick={() => analyze(drawingDataUrl!)}
                      disabled={isAnalyzing}
                      style={{
                        padding: "8px", borderRadius: "50px",
                        background: "#FFE033", border: "3px solid #1A1A1A",
                        cursor: "pointer", fontFamily: "'Chewy',cursive",
                        fontSize: "0.85rem", color: "#1A1A1A",
                        boxShadow: "3px 3px 0 #1A1A1A",
                      }}
                    >
                      🔄 Re-analizar dibujo
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: voice controls */}
        <div style={{
          width: "190px", flexShrink: 0,
          background: "#B8E04A", borderLeft: "3px solid #1A1A1A",
          padding: "14px 12px",
          display: "flex", flexDirection: "column", gap: "14px",
          overflowY: "auto",
        }}>
          <span style={{ fontSize: "0.85rem", color: "#1A1A1A" }}>🎛️ Ajustes de voz</span>

          {/* Pitch */}
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.75rem", color: "#1A1A1A" }}>🎵 Tono</span>
              <span style={{
                background: meta.bg, border: "2px solid #1A1A1A",
                borderRadius: "50px", padding: "1px 8px",
                fontSize: "0.7rem", color: "#1A1A1A",
              }}>{config.pitch.toFixed(1)}</span>
            </div>
            <input type="range" min="0.1" max="2" step="0.1"
              value={config.pitch}
              onChange={e => updateConfig({ pitch: parseFloat(e.target.value) })}
              style={sliderStyle} />
          </div>

          {/* Rate */}
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.75rem", color: "#1A1A1A" }}>⚡ Velocidad</span>
              <span style={{
                background: meta.bg, border: "2px solid #1A1A1A",
                borderRadius: "50px", padding: "1px 8px",
                fontSize: "0.7rem", color: "#1A1A1A",
              }}>{config.rate.toFixed(1)}</span>
            </div>
            <input type="range" min="0.1" max="2" step="0.1"
              value={config.rate}
              onChange={e => updateConfig({ rate: parseFloat(e.target.value) })}
              style={sliderStyle} />
          </div>

          <div style={{ width: "100%", height: "3px", background: "#1A1A1A" }} />

          {/* Toggles */}
          {([
            { key: "robotize" as const, emoji: "🤖", label: "Robotizar" },
            { key: "echo"     as const, emoji: "🌊", label: "Eco/Reverb" },
          ] as const).map(({ key, emoji, label }) => (
            <button key={key} onClick={() => updateConfig({ [key]: !config[key] })} style={{
              width: "100%", padding: "8px", borderRadius: "12px",
              background: config[key] ? meta.bg : "#FFFBF2",
              border: config[key] ? "4px solid #1A1A1A" : "3px solid #1A1A1A",
              cursor: "pointer",
              fontFamily: "'Chewy',cursive", fontSize: "0.85rem", color: "#1A1A1A",
              boxShadow: config[key] ? "2px 2px 0 #1A1A1A" : "3px 3px 0 #1A1A1A",
              transform: config[key] ? "translate(1px,1px)" : "none",
              transition: "all 0.1s",
              display: "flex", alignItems: "center", gap: "6px",
            }}>
              <span>{emoji}</span><span>{label}</span>
              <span style={{ marginLeft: "auto", fontSize: "0.7rem" }}>{config[key] ? "ON" : "OFF"}</span>
            </button>
          ))}

          <button onClick={() => applyPreset(config.preset)} style={{
            width: "100%", padding: "8px", borderRadius: "12px",
            background: "#FF6B8A", border: "3px solid #1A1A1A",
            cursor: "pointer", fontFamily: "'Chewy',cursive",
            fontSize: "0.8rem", color: "#1A1A1A", boxShadow: "3px 3px 0 #1A1A1A",
          }}>🔄 Reset preset</button>
        </div>
      </div>
    </div>
  );
}
