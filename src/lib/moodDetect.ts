/**
 * moodDetect.ts
 * Reads a DrawSoundProfile + animal preset and returns:
 *  - a Mood label
 *  - a generated phrase the pet would say
 *  - an emoji that matches the mood
 */
import type { DrawSoundProfile } from "../hooks/useDrawSound";
import type { PetVoicePreset } from "../hooks/usePetVoice";

export type Mood =
  | "energetic"   // rojo, mucho trazo
  | "happy"       // amarillo/verde, brillante
  | "calm"        // azul/cian, poco trazo
  | "melancholic" // oscuro, saturación baja
  | "playful"     // naranja, medio trazo
  | "curious"     // violeta/rosa, cobertura media
  | "sleepy"      // gris/bajo brillo, poco trazo
  | "angry";      // rojo oscuro, mucho trazo, oscuro

export interface MoodResult {
  mood:   Mood;
  emoji:  string;
  label:  string;  // Spanish label
  phrase: string;  // What the pet says
}

const MOOD_EMOJI: Record<Mood, string> = {
  energetic:   "⚡",
  happy:       "🌟",
  calm:        "🌊",
  melancholic: "🌧️",
  playful:     "🎉",
  curious:     "🔮",
  sleepy:      "💤",
  angry:       "🔥",
};

const MOOD_LABEL: Record<Mood, string> = {
  energetic:   "Energético",
  happy:       "Feliz",
  calm:        "Tranquilo",
  melancholic: "Melancólico",
  playful:     "Juguetón",
  curious:     "Curioso",
  sleepy:      "Somnoliento",
  angry:       "Enojado",
};

// Per-animal phrases per mood — 3 options, one is picked by hash
const PHRASES: Record<PetVoicePreset, Record<Mood, string[]>> = {
  cat: {
    energetic:   ["¡Tengo mucha energía, quiero correr por toda la casa!", "¡Estoy súper activo hoy, nadie me para!", "¡Me siento poderoso, el mundo es mío!"],
    happy:       ["Miau... estoy muy contento hoy 😸", "¡Purr purr, la vida es perfecta!", "¡Hoy es el mejor día del mundo, miau!"],
    calm:        ["Mmmm... me apetece tomar una siesta larga al sol.", "Estoy relajado, no me molestes por favor.", "El silencio es mi cosa favorita... miau."],
    melancholic: ["Extraño mis juguetes de cuando era pequeño...", "¿Por qué el día está tan gris hoy? Miau...", "Me siento un poco solo hoy."],
    playful:     ["¡Quiero jugar con esa pelota de lana ahora mismo!", "¡Atrapa el ratón, atrapa el ratón! ¡Miau!", "¡Vamos a jugar, por favor por favor!"],
    curious:     ["¿Qué hay dentro de esa caja? Tengo que investigar.", "Huele raro aquí... ¿qué es eso?", "Voy a explorar cada rincón de esta casa."],
    sleepy:      ["Zzz... cinco minutitos más...", "El sol está muy caliente y tengo tanto sueño...", "No me despiertes, estoy en mi mejor sueño."],
    angry:       ["¡Me pisaron la cola y estoy muy enojado!", "¡Esto es inaceptable! ¡Miau furioso!", "¡Nadie toca mi comida o las consecuencias serán graves!"],
  },
  dog: {
    energetic:   ["¡Guau guau! ¡Vamos a correr al parque ahora!", "¡Tengo tantísima energía, sácame a pasear!", "¡Guau! ¡Pelota pelota pelota!"],
    happy:       ["¡Guau! ¡Eres la mejor persona del mundo!", "¡Estoy moviendo la cola tan rápido que casi vuelo!", "¡Este es el mejor día de mi vida, guau!"],
    calm:        ["Estoy bien aquí a tu lado, tranquilo y feliz.", "Solo quiero estar cerca de ti, guau suavecito.", "Qué bonito es descansar juntos, guau."],
    melancholic: ["¿Cuándo vuelves a casa? Te extraño mucho.", "Hoy me siento un poco solito sin ti.", "El parque estaba vacío y me puse triste."],
    playful:     ["¡Trae la pelota, trae la pelota, tírala ya!", "¡Juguemos al escondite, yo me escondo primero!", "¡Guau guau! ¡Corretéame, vamos!"],
    curious:     ["¿Qué es ese olor tan raro? Voy a investigar.", "Hay algo raro bajo el sofá y necesito saberlo.", "¡Ese sonido viene de allá, voy a ver!"],
    sleepy:      ["Guau... tan cansado después del paseo...", "Solo un poquito más en tu regazo... zzz.", "Los ojos se me cierran solos, guau suave."],
    angry:       ["¡El cartero otra vez! ¡Guau guau GUAU!", "¡Me quitaron el hueso y estoy furioso!", "¡Esto no está bien! ¡Guau enojado!"],
  },
  bird: {
    energetic:   ["¡Pío pío! ¡Quiero volar por todo el cuarto!", "¡Estoy lleno de energía, pío pío pío!", "¡El cielo me llama, quiero volar libre!"],
    happy:       ["¡Pío! ¡El sol brilla y yo también brillo!", "¡Cantaré toda la mañana de alegría!", "¡Pío pío pío! ¡Todo es maravilloso!"],
    calm:        ["Piiiio... qué tranquila está la tarde.", "Estoy posado aquí, observando el mundo calladito.", "El viento suave me mece y estoy muy bien."],
    melancholic: ["Extraño el árbol donde nací... pío triste.", "Hoy el cielo está nublado y me siento igual.", "Pío... a veces extraño volar sin jaulas."],
    playful:     ["¡Pío pío! ¡Mueve ese dedo que lo quiero morder!", "¡Quiero jugar con ese espejo ahora mismo!", "¡Pío! ¡Lánzame una semillita, vamos!"],
    curious:     ["¿Qué es esa cosa brillante? Necesito investigar.", "Pío... ese ruido viene de afuera, ¿qué será?", "¡Nunca había visto eso, pío curioso!"],
    sleepy:      ["Pío... ya es hora de esconder la cabeza bajo el ala.", "Qué sueño tan rico me está entrando, pío.", "Zzz... pío... zzz..."],
    angry:       ["¡No toques mi jaula! ¡Pío furioso!", "¡Me cambiaron de lugar y estoy muy enojado!", "¡Pío pío PÍO! ¡Esto no me gusta nada!"],
  },
  frog: {
    energetic:   ["¡Croac! ¡Salté tres metros hoy, nuevo récord!", "¡Estoy lleno de energía, croac croac!", "¡Nada me detiene hoy, croac poderoso!"],
    happy:       ["Croac... qué rico está el charco hoy.", "¡Croac! ¡La lluvia llegó y estoy felicísimo!", "¡Este barro es el mejor del mundo, croac!"],
    calm:        ["Sentado en mi hoja de nenúfar, todo está bien.", "Croac suave... la laguna está perfecta hoy.", "Nada me preocupa, solo el sonido del agua."],
    melancholic: ["Hoy no han caído moscas... qué día tan triste.", "Croac... el estanque está muy quieto hoy.", "A veces extraño la lluvia de la semana pasada."],
    playful:     ["¡Croac! ¡Atrápame si puedes, salto muy lejos!", "¡Juguemos a saltar piedras en el agua!", "¡Croac croac! ¡Competencia de saltos!"],
    curious:     ["¿Qué es eso que flota en el agua? Croac...", "Nunca había visto esa mosca, voy a investigar.", "Croac... ¿qué hay al otro lado del estanque?"],
    sleepy:      ["Croac lento... el sol me da tanto sueño...", "Me voy a hundir en el barro a dormir un rato.", "Zzz... croac... zzz..."],
    angry:       ["¡Me pisaron el nenúfar! ¡Croac furioso!", "¡Alguien tiró una piedra en mi charco!", "¡CROAC! ¡Esto es una invasión!"],
  },
  rabbit: {
    energetic:   ["¡Squeak! ¡Quiero correr por todo el jardín!", "¡Mis patas no paran, squeak squeak!", "¡Tengo energía para saltar toda la tarde!"],
    happy:       ["Squeak... qué rico está este trébol verde.", "¡Squeak! ¡Hoy me dieron zanahoria!", "¡Todo está perfecto, squeak contento!"],
    calm:        ["Aquí sentado moviendo la nariz... todo bien.", "Squeak suave... la tarde está muy tranquila.", "Me gusta este rinconcito tan cálido."],
    melancholic: ["Squeak... extraño el prado de antes.", "Hoy no tengo ganas de saltar mucho.", "Squeak triste... el cielo está muy gris."],
    playful:     ["¡Persígueme persígueme! ¡Squeak squeak!", "¡Quiero saltar en ese montón de hojas!", "¡Squeak! ¡Juguemos al escondite en el jardín!"],
    curious:     ["Squeak... ¿qué hay dentro de esa madriguera?", "Muevo la nariz... huele a algo nuevo y raro.", "Nunca había visto eso, squeak curioso."],
    sleepy:      ["Squeak... mis orejas caen de sueño.", "El pasto suave me da tanto sueño...", "Zzz... squeak... zzz..."],
    angry:       ["¡Me quitaron mi zanahoria! ¡Squeak enojado!", "¡Eso era mío! ¡Squeak furioso!", "¡No me toques las orejas sin permiso!"],
  },
  hamster: {
    energetic:   ["¡Squeak squeak! ¡La rueda no me cansa nunca!", "¡Puedo dar mil vueltas en la rueda hoy!", "¡Squeak! ¡Soy el más rápido del mundo!"],
    happy:       ["Squeak... encontré semillas escondidas de ayer.", "¡Squeak! ¡Mis cachetes están llenos de comida!", "¡Todo está perfecto en mi madriguera!"],
    calm:        ["Aquí guardando semillitas tranquilamente.", "Squeak suave... mi nido está calientito.", "Estoy bien en mi rincón esponjoso."],
    melancholic: ["Squeak... ya se acabaron las semillas de girasol.", "Hoy la rueda no me anima mucho.", "Squeak triste... extraño mis semillas favoritas."],
    playful:     ["¡Squeak squeak! ¡Escóndeme algo para buscar!", "¡Quiero explorar fuera de la jaula!", "¡Squeak! ¡El laberinto me encanta!"],
    curious:     ["Squeak... ¿qué es ese olor nuevo en la jaula?", "Nunca había visto ese juguete, squeak.", "Muevo los bigotes... hay algo nuevo aquí."],
    sleepy:      ["Zzz squeak zzz... el nido es tan cómodo...", "Solo un poco más en mi montaña de viruta.", "Squeak... los ojos ya no me abren."],
    angry:       ["¡Me despertaron y estoy furioso! ¡Squeak!", "¡Nadie toca mi comida escondida!", "¡SQUEAK! ¡Respeta mi espacio!"],
  },
  cow: {
    energetic:   ["¡Muuu! ¡Hoy el prado verde me llena de energía!", "¡Muuu energético! ¡Quiero correr por el campo!", "¡Hay tanto pasto fresco, muuu!"],
    happy:       ["Muuu... qué rico está el pasto de hoy.", "¡Muuu! ¡El sol calienta justo como me gusta!", "Estoy muy contenta con mi prado, muuu."],
    calm:        ["Muuu suave... masticando despacio bajo el árbol.", "Todo está bien aquí en el campo, muuu.", "La brisa está fresca y yo estoy tranquila."],
    melancholic: ["Muuu... el prado ya no huele igual que antes.", "Extraño el campo de la granja vieja, muuu triste.", "Hoy el cielo gris me pone melancólica."],
    playful:     ["¡Muuu! ¡Corramos por el prado juntos!", "¡Quiero salpicarte en el charco del campo!", "¡Muuu juguetón! ¡Atrápame si puedes!"],
    curious:     ["Muuu... ¿qué es ese ruido del otro lado de la cerca?", "Nunca había visto esa flor, huele raro.", "Muuu curioso... algo nuevo hay aquí."],
    sleepy:      ["Muuu lento... ya es hora de echarme en el pasto.", "El sol del mediodía me da tanto sueño, muuu.", "Zzz... muuu... zzz..."],
    angry:       ["¡Muuu! ¡El tractor me despertó de mi siesta!", "¡No entres a mi prado sin permiso, muuu!", "¡MUUU! ¡Eso era mi mejor hierba!"],
  },
  lion: {
    energetic:   ["¡ROAAR! ¡Soy el rey y hoy estoy en mi mejor momento!", "¡Roaar! ¡Nadie corre más rápido que yo en la sabana!", "¡Hoy cazaré algo increíble, roaar!"],
    happy:       ["Rooar suave... el sol calienta mi melena perfectamente.", "¡Roaar! ¡Mi manada está reunida y soy feliz!", "Hoy la sabana huele bien y estoy contento."],
    calm:        ["Roaar suave... descansando bajo la acacia.", "La sabana está tranquila, todo está bien.", "Observo mi reino desde aquí, todo perfecto."],
    melancholic: ["Roaar... extraño los días de lluvia en la sabana.", "Hoy la manada está callada y me siento solo.", "Roaar bajo... el horizonte se ve muy lejos."],
    playful:     ["¡Roaar! ¡Los cachorros quieren jugar y yo también!", "¡Persígueme por la sabana, roaar!", "¡Hoy me siento cachorro, roaar juguetón!"],
    curious:     ["Roaar... ¿qué hay al otro lado de ese río?", "Nunca había visto esa presa, voy a investigar.", "Muevo las orejas... algo nuevo se acerca."],
    sleepy:      ["Roaar lento... la siesta del mediodía me llama.", "Zzz... roaar... la sombra está perfecta aquí.", "Después de comer, solo quiero dormir, roaar."],
    angry:       ["¡ROAAR! ¡Nadie entra en mi territorio!", "¡El intruso pagará las consecuencias, ROAAR!", "¡Mi presa era mía! ¡Roaar furioso!"],
  },
};

/** Detect mood from a DrawSoundProfile */
export function detectMood(profile: DrawSoundProfile): Mood {
  const { baseFreq, oscType, volume, duration, vibrato } = profile;

  // Normalize frequency to 0-1 within C2-C6 range (65-1046 Hz)
  const freqNorm = Math.min(1, Math.max(0, (baseFreq - 65) / 981));
  // Volume as energy proxy
  const energy = volume;
  // Duration as activity (long = calm/melancholic, short = energetic/playful)
  const durationNorm = Math.min(1, duration / 7);
  // Waveform: sine=bright, triangle=neutral, sawtooth=rough, square=harsh
  const waveHarshness: Record<OscillatorType, number> = {
    sine: 0.1, triangle: 0.35, sawtooth: 0.7, square: 0.9, custom: 0.5,
  };
  const harshness = waveHarshness[oscType] ?? 0.5;
  // Vibrato = expressiveness
  const vibratoNorm = Math.min(1, vibrato / 12);

  // Decision tree
  if (energy > 0.65 && harshness > 0.6 && durationNorm < 0.4) return "angry";
  if (energy > 0.6  && durationNorm < 0.45 && freqNorm > 0.5)  return "energetic";
  if (freqNorm > 0.6 && energy > 0.5 && harshness < 0.4)       return "happy";
  if (durationNorm > 0.7 && energy < 0.4 && harshness < 0.4)   return "sleepy";
  if (harshness < 0.3 && durationNorm > 0.5 && vibratoNorm < 0.3) return "calm";
  if (energy < 0.35 && harshness > 0.3)                         return "melancholic";
  if (vibratoNorm > 0.5 && freqNorm > 0.4)                      return "curious";
  if (durationNorm < 0.5 && energy > 0.4 && harshness < 0.6)   return "playful";
  // Default fallback
  return "calm";
}

/** Pick a phrase deterministically based on baseFreq (stable per drawing) */
function pickPhrase(phrases: string[], seed: number): string {
  return phrases[Math.floor(seed * 100) % phrases.length];
}

/** Main entry point */
export function getMoodResult(
  profile: DrawSoundProfile,
  preset:  PetVoicePreset,
): MoodResult {
  const mood   = detectMood(profile);
  const phrase = pickPhrase(PHRASES[preset][mood], profile.baseFreq);
  return {
    mood,
    emoji:  MOOD_EMOJI[mood],
    label:  MOOD_LABEL[mood],
    phrase,
  };
}
