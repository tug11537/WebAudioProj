# Sound Drift

An interactive web-based sound instrument built with Tone.js and Three.js.

Move your mouse across the screen to explore a dynamic sound space. Gesture controls pitch, timbre, spatialization, and viusal behavior in real time.

- **X-axis:** controls filter range, stereo panning, and zone selection
- **Y-axis:** controls pitch and reverb depth
- **Zones (horizontal regions):** introduce different sonic states by changing filter resonance and delay intensity

## Features

- Dual-oscillator voice (sawtooth + sine fifth layer)
- LFO-modulated lowpass filter for evolving timbre
- Zone-based processing (discrete and continuous interaction)
- Reverb and delay for spatial depth
- Stereo panning based on mouse position
- Real-time audio analysis (FFT)
- Audio-reactive visuals (Three.js sphere + particle system)
- Smooth parameter transitions (ramping)
- Adjustible UI controls (master, cutoff range, reverb, LFO rate)

## Visual System

- Central sphere scales with audio energy
- Particle field adds depth and ambient motion
- Background color shifts with interaction
- Visuals are driven by FFT analysis of the audio signal

## Technologies Used

- Tone.js
- Three.js
- Web Audio API
- HTML / CSS / JavaScript

## How to Run

1. Clone the repository
2. Open `index.html` in a browser
3. Click **Start**
4. Move your mouse to explore!

## Concept

This project explores gesture-based synthesis and the relationship between sound and viusal form. Continuous mouse movement controls pitch, filtering, and spatial effects, while discrete zones introduce changes in sonic character.

LFO modulates the filter to create constant timbral motion, and real-time audio analysis drives visual feedback, linking sound and image into a unified interactive system.

---

Built as part of a Web Audio seminar.
