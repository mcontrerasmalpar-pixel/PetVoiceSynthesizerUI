# 🐾 Pet Voice Synthesizer UI

> Dale voz a tu mascota dibujada. Un juguete creativo donde el arte se convierte en sonido, emoción y personalidad.

Diseño original en Figma: [Pet Voice Synthesizer UI](https://www.figma.com/design/QAWzxncfn3KVK3o3wkuNBp/Pet-Voice-Synthesizer-UI)

---

## 🚀 Cómo correr el proyecto

```bash
npm i          # instalar dependencias
npm run dev    # servidor de desarrollo
```

---

## ✨ Features

### 🔐 Autenticación real con Supabase
Login y registro con email + contraseña usando **Supabase Auth**. Las cuentas son reales y persistentes. Al registrarte puedes añadir un nombre de usuario que aparece en la app. Los dibujos y mascotas guardadas se vinculan a tu cuenta en la base de datos.

### 🎨 Draw Mode — Dibuja tu mascota
Canvas de dibujo libre con herramientas de color, tamaño de pincel y borrador. Estilo visual inspirado en **Tomodachi Life** (Nintendo DS): colores vivos, bordes negros gruesos, tipografía `Chewy`. El dibujo es la base de todo lo que viene después.

### 🎵 Play Mode — Tu dibujo genera una melodía
El dibujo se analiza pixel a pixel para extraer:
- **Tono dominante (hue)** → nota raíz de la melodía
- **Brillo promedio** → escala musical (mayor, menor, pentatónica, blues, dórica)
- **Cobertura de tinta** → duración y volumen de las notas
- **Posición vertical del trazo** → altura de cada nota en la escala

Resultado: cada dibujo produce una melodía única e irrepetible. Puedes elegir entre 6 instrumentos (Piano, Guitarra, Marimba, Flauta, Campanas, Synth), ajustar el tempo y activar loop.

### 🔊 Voice Mode — Tu mascota habla
Tres capas de audio combinadas:

**1. Mood Detection desde el dibujo**
El análisis del dibujo detecta automáticamente el estado emocional de la mascota:

| Mood | Señales del dibujo |
|---|---|
| ⚡ Energético | Frecuencia alta, volumen alto, waveform suave |
| 😊 Feliz | Tonos altos, brillo, poca aspereza |
| 🌊 Tranquilo | Duración larga, volumen bajo, waveform suave |
| 💤 Somnoliento | Muy larga duración, volumen muy bajo |
| 🎉 Juguetón | Duración corta, energía media |
| 🔮 Curioso | Vibrato alto, frecuencia media |
| 🌧️ Melancólico | Volumen bajo, waveform áspero |
| 🔥 Enojado | Waveform duro, volumen alto, duración corta |

Cada mood genera una **frase automática personalizada** por animal (192 frases únicas: 8 moods × 8 animales × 3 variantes). La frase aparece lista para escuchar o editar.

**2. Sonidos reales de animales (Web Audio API)**
Cada animal tiene su propio sonido sintetizado sin muestras externas:
- 🐱 Gato → oscilador sine 600→900→500 Hz (miau)
- 🐶 Perro → sawtooth 200→120 Hz + filtro lowpass (woof)
- 🐦 Pájaro → 5 chirps rápidos en 2400–3200 Hz
- 🐸 Rana → square wave con bandpass filter (croc)
- 🐇 Conejo / 🐹 Hámster → sine agudo 1800–2400 Hz (squeak)
- 🐄 Vaca → sine lento + vibrato (muuu)
- 🦁 León → ruido filtrado tipo rugido (roaar)

**3. Voz TTS con personalidad**
Síntesis de voz del browser con pitch y velocidad ajustados por animal. Suena primero el sonido del animal y luego la voz habla el texto. Incluye micrófono: habla tú y la mascota lo repite con su voz.

### 💾 Guardar mascota
Guarda tu mascota con nombre y tipo de animal en **Supabase**. El dibujo se sube a **Supabase Storage** y la melodía se guarda como JSON. Todo accesible desde el perfil.

### 🐾 Pet Profile
Vista de tu mascota guardada con su nombre, dibujo, tipo de animal y opción de reproducir su melodía de nuevo.

---

## 🗺️ Flujo de la app

```
Login 🔐 → Dibuja 🎨 → Escucha la melodía 🎵 → Voz del animal 🔊 → Guarda 💾
```

---

## 🛠️ Stack técnico

| Tecnología | Uso |
|---|---|
| React + TypeScript | UI y lógica |
| Vite | Bundler y dev server |
| Web Audio API | Síntesis de melodías y sonidos animales |
| Web Speech API | TTS (texto a voz) y reconocimiento de voz |
| Supabase Auth | Login / registro de usuarios |
| Supabase Database | Guardado de mascotas |
| Supabase Storage | Subida de dibujos |
| CSS-in-JS inline | Estilos al estilo Tomodachi Life |

---

## 📁 Estructura relevante

```
src/
├── app/
│   ├── App.tsx                  # Navegación principal + auth guard
│   └── components/
│       ├── DrawMode.tsx          # Canvas de dibujo
│       ├── PlayMode.tsx          # Reproductor de melodía
│       ├── VoiceMode.tsx         # Voz + mood detection
│       ├── PetProfile.tsx        # Perfil de mascota
│       ├── SavePetModal.tsx      # Modal para guardar
│       └── LoginScreen.tsx       # Pantalla de login/registro
├── hooks/
│   ├── usePetVoice.ts           # TTS + micrófono + sonidos animales
│   └── useDrawSound.ts          # Análisis del dibujo → perfil sonoro
└── lib/
    ├── supabase.ts              # Auth + DB + Storage
    └── moodDetect.ts            # Mood detection → frases automáticas
```
