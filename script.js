let started = false;
let audioInitialized = false;
let scene, camera, renderer, sphere;
let smoothedEnergy = 0;
let particles, particlePositions;
let mouseXNorm = 0.5;
let mouseYNorm = 0.5;

// ---------- Three.js ----------
function initThree() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 4;

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const material = new THREE.MeshBasicMaterial({ wireframe: true });
  sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);
  const particleCount = 400;
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 12; // x
    positions[i * 3 + 1] = (Math.random() - 0.5) * 8; // y
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10; // z
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.03,
    transparent: true,
    opacity: 0.6,
  });

  particles = new THREE.Points(particleGeometry, particleMaterial);
  particlePositions = particleGeometry.attributes.position.array;
  scene.add(particles);
  animate();
}

// ---------- Sound chain ----------
const synth = new Tone.Oscillator({
  type: "square",
  frequency: 110,
});

const synth2 = new Tone.Oscillator({
  type: "sine",
  frequency: 110 * 1.5,
});

const synth2Gain = new Tone.Gain(0.12);
const panner = new Tone.Panner(0);

const filter = new Tone.Filter({
  type: "lowpass",
  frequency: 800,
  rolloff: -24,
});
filter.Q.value = 8;

const reverb = new Tone.Reverb({
  decay: 6,
  wet: 0.3,
});

const delay = new Tone.FeedbackDelay({
  delayTime: 0.25,
  feedback: 0.35,
  wet: 0,
});

const gain = new Tone.Gain(0.01);

const lfo = new Tone.LFO({
  frequency: 0.5,
});

const filterEnv = new Tone.Envelope({
  attack: 0.02,
  decay: 0.15,
  sustain: 0.3,
  release: 0.4,
});

const fft = new Tone.FFT(64);

function animate() {
  requestAnimationFrame(animate);

  const spectrum = fft.getValue();
  let maxEnergy = -100;

  for (let i = 0; i < spectrum.length; i++) {
    if (spectrum[i] > maxEnergy) {
      maxEnergy = spectrum[i];
    }
  }

  const normalized = Math.min(1, Math.max(0, (maxEnergy + 100) / 100));

  // FFT response
  smoothedEnergy += (normalized - smoothedEnergy) * 0.15;

  if (sphere) {
    sphere.scale.setScalar(1 + smoothedEnergy * 0.5);

    // wobble
    const time = performance.now() * 0.001;
    sphere.position.x = Math.sin(time * 0.7) * 0.02;
    sphere.position.y = Math.cos(time * 0.5) * 0.02;
  }
  if (particles) {
    const time = performance.now() * 0.0002;

    particles.geometry.attributes.position.needsUpdate = true;

    particles.rotation.y += 0.0008;
    particles.rotation.x += 0.0003;

    // slight audio reactivity
    particles.material.opacity = 0.35 + smoothedEnergy * 0.4;

    // subtle parallax from mouse
    particles.position.x +=
      ((mouseXNorm - 0.5) * 0.4 - particles.position.x) * 0.03;
    particles.position.y +=
      (-(mouseYNorm - 0.5) * 0.25 - particles.position.y) * 0.03;
  }
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// chain
synth.connect(filter);
synth2.chain(synth2Gain, filter);

filter.chain(reverb, delay, panner, gain, Tone.Destination);
gain.connect(fft);

//filterEnv.connect(filter.frequency);
//lfo.connect(filter.frequency);

// ---------- Zones ----------
const zones = [
  {
    name: "drift",
    minX: 0,
    maxX: 0.33,
    q: 4,
    delayWet: 0.05,
    hint: "Zone 1: low drift",
  },
  {
    name: "bloom",
    minX: 0.33,
    maxX: 0.66,
    q: 8,
    delayWet: 0.2,
    hint: "Zone 2: dream bloom",
  },
  {
    name: "air",
    minX: 0.66,
    maxX: 1,
    q: 14,
    delayWet: 0.45,
    hint: "Zone 3: sharp air",
  },
];

// ---------- UI ----------
const $ = (id) => document.getElementById(id);

const startBtn = $("startBtn");
const stopBtn = $("stopBtn");

const master = $("master");
const masterVal = $("masterVal");

const cutoffRange = $("cutoffRange");
const cutoffVal = $("cutoffVal");

const wet = $("wet");
const wetVal = $("wetVal");

const lfoRate = $("lfoRate");
const lfoVal = $("lfoVal");

let cutoffMax = parseFloat(cutoffRange.value);
let masterLevel = parseFloat(master.value);

// ---------- Start/ Stop ----------
async function startAudio() {
  await Tone.start();

  if (!renderer) initThree();

  if (!audioInitialized) {
    synth.start();
    synth2.start();
    lfo.start();
    audioInitialized = true;
  }

  gain.gain.cancelScheduledValues(Tone.now());
  gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), Tone.now());
  gain.gain.rampTo(masterLevel, 0.2);

  started = true;
  $("hint").innerText = "Move mouse to explore the sound space";
  startBtn.disabled = true;
  stopBtn.disabled = false;
}

function stopAudio() {
  if (!started) return;

  gain.gain.cancelScheduledValues(Tone.now());
  gain.gain.rampTo(0.0001, 0.2);

  started = false;
  $("hint").innerText = "Click Start · Move mouse to shape sound!";
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

startBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  startAudio();
});

stopBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  stopAudio();
});

// ---------- Slider mappings ----------
master.addEventListener("input", () => {
  masterLevel = parseFloat(master.value);
  masterVal.textContent = masterLevel.toFixed(2);

  if (started) {
    gain.gain.rampTo(masterLevel, 0.1);
  }
});

cutoffRange.addEventListener("input", () => {
  cutoffMax = parseFloat(cutoffRange.value);
  cutoffVal.textContent = Math.round(cutoffMax);
});

wet.addEventListener("input", () => {
  const v = parseFloat(wet.value);
  wetVal.textContent = v.toFixed(2);
  reverb.wet.rampTo(v, 0.1);
});

lfoRate.addEventListener("input", () => {
  const v = parseFloat(lfoRate.value);
  lfoVal.textContent = v.toFixed(2);
  lfo.frequency.rampTo(v, 0.1);
});

// Initialize readouts
master.dispatchEvent(new Event("input"));
cutoffRange.dispatchEvent(new Event("input"));
wet.dispatchEvent(new Event("input"));
lfoRate.dispatchEvent(new Event("input"));

// ---------- Mouse mapping ----------
document.addEventListener("mousemove", (e) => {
  if (!started) return;

  const xNorm = e.clientX / window.innerWidth;
  const yNorm = e.clientY / window.innerHeight;

  mouseXNorm = xNorm;
  mouseYNorm = yNorm;

  const activeZone = zones.find(
    (zone) => xNorm >= zone.minX && xNorm < zone.maxX
  );

  if (sphere) {
    sphere.rotation.x = yNorm * Math.PI;
    sphere.rotation.y = xNorm * Math.PI * 2;
  }

  if (activeZone) {
    $("hint").innerText = activeZone.hint;
    filter.Q.value = activeZone.q;
    delay.wet.rampTo(activeZone.delayWet, 0.1);
  }

  const pan = (xNorm * 2 - 1) * 0.5;
  panner.pan.rampTo(pan, 0.08);

  const r = Math.floor(80 + xNorm * 80);
  const g = Math.floor(120 + yNorm * 70);
  const b = Math.floor(140 + (1 - xNorm) * 60);
  document.body.style.background = `rgb(${r}, ${g}, ${b})`;

  const cutoff = 400 + xNorm * cutoffMax;
  // filter.frequency.value = cutoff;
  lfo.min = cutoff - 150;
  lfo.max = cutoff + 1500;
  // console.log(cutoff);

  const wetTarget = 0.05 + (1 - yNorm) * 0.75;
  reverb.wet.rampTo(wetTarget, 0.08);

  const freq = 90 + (1 - yNorm) * 220;
  console.log(freq, cutoff);
  synth.frequency.rampTo(freq, 0.08);
  synth2.frequency.rampTo(freq * 1.5, 0.08);
});
