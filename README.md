# 🎨 Doodio

> Draw anything. Hear it as music. No skills required.

Live app: [doodio.vercel.app]((https://doodio-alpha.vercel.app/))

Built for the **Figma Make Challenge** — prototyped with Figma Make, connected to GitHub via Figma MCP.

---

## 🌟 The idea

I've always believed everyone can be creative. I'm not the best at drawing or playing instruments — but when I listen to music or make something with my hands, I feel a different version of myself. Freer.

Doodio turns that feeling into an app. You draw anything — a chaotic scribble, a wobbly sun, a blob that sort of looks like a cat — and your drawing becomes a unique melody. Your colors, your strokes, your shapes become sound. No music theory. No artistic skills required.

My demo drawings looked like a 5-year-old made them. They sounded beautiful. 🎵

---

## 🚀 Getting started

```bash
npm i          # install dependencies
npm run dev    # start dev server
```

---

## ✨ Features

### 🎨 Draw — Your canvas, your rules
Free-drawing canvas with color picker, brush size, and eraser. Visual style inspired by **Tomodachi Life** (Nintendo DS): bold colors, thick black outlines, `Chewy` typography. Draw anything — the messier the better.

### 🔊 Sound Profile — Your drawing becomes music
The drawing is analyzed pixel by pixel to extract a unique **Sound Profile**:

| Drawing signal | What it controls |
|---|---|
| **Dominant hue** | Root note of the melody |
| **Average brightness** | Musical scale (major, minor, pentatonic, blues, dorian) |
| **Ink coverage** | Note duration and volume |
| **Vertical stroke position** | Pitch height within the scale |

Every drawing produces a melody that only it could generate.

### 🎵 Listen — Play and remix your melody
Explore the melody your drawing created:
- Choose from 6 instruments: Piano, Guitar, Marimba, Flute, Bells, Synth
- Remix across 6 genres: Jazz, Rock, Ballad, Pop, Funk, Metal
- Adjust tempo and activate loop
- See the detected scale by name (e.g. *"D minor pentatonic"*)

### 🎤 Voice — Add yourself to the music
Record your voice — sing, hum, or say anything — and layer it over your drawing's melody. Your voice becomes an instrument or a musical style. Something completely yours.

### 💾 Gallery — Every doodle sounds different
Save your doodle with a name to **Supabase**. Browse the shared gallery and tap any card to hear what that drawing sounds like. A collection of imperfect, beautiful things.

---

## 🗺️ App flow

```
Draw 🎨 → Melody generates 🎵 → Remix with genre 🎸 → Add your voice 🎤 → Save to Gallery 💾
```

---

## 🛠️ Tech stack

| Technology | Purpose |
|---|---|
| React + TypeScript | UI and logic |
| Vite | Bundler and dev server |
| Web Audio API | Melody synthesis + live audio recording + remixing |
| MediaRecorder API | Voice recording |
| Supabase Auth | User login / registration |
| Supabase Database | Doodle data storage |
| Supabase Storage | Drawing uploads |
| Figma Make | UI prototyping |
| Figma MCP + GitHub | Design-to-code sync |
| Vercel | Deployment |
| CSS-in-JS inline | Tomodachi Life–inspired visual style |

---

## 📁 Project structure

```
src/
├── app/
│   ├── App.tsx                   # Main navigation + auth guard
│   └── components/
│       ├── DrawMode.tsx           # Drawing canvas
│       ├── PlayMode.tsx           # Melody player + genre remix
│       ├── VoiceMode.tsx          # Voice recording + layering
│       ├── ExperimentMode.tsx     # Experiment tab
│       ├── PetProfile.tsx         # Saved doodle view
│       ├── SavePetModal.tsx       # Save modal
│       ├── LoginScreen.tsx        # Login / register screen
│       └── TomodachiLogin.tsx     # Animated login screen
├── hooks/
│   ├── useDrawSound.ts            # Drawing analysis → Sound Profile
│   ├── usePetRecorder.ts          # MediaRecorder → voice
│   └── useRemix.ts                # Layering voice + melody
└── lib/
    ├── supabase.ts                # Auth + DB + Storage
    └── moodDetect.ts              # Mood detection from Sound Profile
```

---

## 💛 Made with

This project was built with love, a lot of bad drawings, and the belief that imperfection is where creativity actually lives.

> *"Come as you are. Your imperfection is the art."*
