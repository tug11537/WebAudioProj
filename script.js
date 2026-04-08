let started = false;
let audioInitialized = false;
let scene, camera, renderer, sphere;

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

  // Three.js sphere geometry
  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const material = new THREE.MeshBasicMaterial({ wireframe: true });
  sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);
  console.log(geometry);

  animateThree();
}

function animateThree() {
  requestAnimationFrame(animateThree);

  if (sphere) {
    sphere.rotation.x += 0.005;
    sphere.rotation.y += 0.008;
  }

  renderer.render(scene, camera);
}

// ---------- Sound chain ----------
const synth = new Tone.Oscillator({
  type: "sawtooth",
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

const gain = new Tone.Gain(0.0001);

// LFO for slow motion / breathing
const lfo = new Tone.LFO({
  frequency: 0.08,
  min: -150,
  max: 150,
});

// chain
synth.connect(filter);
synth2.chain(synth2Gain, filter);
filter.chain(reverb, delay, panner, gain, Tone.Destination);

// LFO into filter frequency
lfo.connect(filter.frequency);

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

  const activeZone = zones.find(
    (zone) => xNorm >= zone.minX && xNorm < zone.maxX
  );

  if (sphere) {
    sphere.rotation.x = yNorm * Math.PI;
    sphere.rotation.y = xNorm * Math.PI * 2;
    sphere.scale.setScalar(1 + (1 - yNorm) * 0.7);
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

  const scale = 1 + (1 - yNorm) * 0.8;
  const blur = xNorm * 6;

  const cutoff = 200 + xNorm * cutoffMax;
  filter.frequency.rampTo(cutoff, 0.08);

  const wetTarget = 0.05 + (1 - yNorm) * 0.75;
  reverb.wet.rampTo(wetTarget, 0.08);

  const freq = 90 + (1 - yNorm) * 220;
  synth.frequency.rampTo(freq, 0.08);
  synth2.frequency.rampTo(freq * 1.5, 0.08);
});
