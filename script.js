let started = false;

// ---------- Sound chain ----------
const synth = new Tone.Oscillator({ type: "sawtooth", frequency: 110 });

const synth2 = new Tone.Oscillator({ type: "sine", frequency: 110 * 1.5 }); // subtle fifth layer
const synth2Gain = new Tone.Gain(0.12);

const filter = new Tone.Filter({
  type: "lowpass",
  frequency: 800,
  rolloff: -24,
});
filter.Q.value = 8;

const reverb = new Tone.Reverb({ decay: 6, wet: 0.3 });

const gain = new Tone.Gain(0.0001); // start silent (prevents surprise audio)

// LFO for slow motion ("breathing")
const lfo = new Tone.LFO({
  frequency: 0.08,
  min: -150,
  max: 150, // modulation depth in Hz (added around current cutoff)
});

// Connect chain: (synths) -> filter -> reverb -> gain -> destination
synth.connect(filter);
synth2.chain(synth2Gain, filter);
filter.chain(reverb, gain, Tone.Destination);

// LFO into filter frequency
lfo.connect(filter.frequency);

// ---------- UI helpers ----------
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

// ---------- Start / Stop ----------
async function startAudio() {
  if (started) return;
  await Tone.start();

  synth.start();
  synth2.start();
  lfo.start();

  // click-free fade in
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

  // click-free fade out then stop oscillators
  gain.gain.cancelScheduledValues(Tone.now());
  gain.gain.rampTo(0.0001, 0.2);

  setTimeout(() => {
    synth.stop();
    synth2.stop();
    lfo.stop();

    started = false;
    $("hint").innerText = "Click Start · Move mouse to shape sound!";
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }, 230);
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

  if (started) gain.gain.rampTo(masterLevel, 0.1);
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

// ---------- Gesture mapping ----------
document.addEventListener("mousemove", (e) => {
  if (!started) return;

  const xNorm = e.clientX / window.innerWidth;
  const yNorm = e.clientY / window.innerHeight;

  // X: base filter cutoff (LFO adds motion on top)
  const cutoff = 200 + xNorm * cutoffMax;
  filter.frequency.rampTo(cutoff, 0.08);

  // Y: reverb wetness (inverted) - if you want, keep slider as max depth
  const wetTarget = 0.05 + (1 - yNorm) * 0.75;
  reverb.wet.rampTo(wetTarget, 0.08);

  // Bonus: tiny pitch drift (subtle, not a full instrument yet)
  const freq = 90 + (1 - yNorm) * 220; // 90..310
  synth.frequency.rampTo(freq, 0.08);
  synth2.frequency.rampTo(freq * 1.5, 0.08);
});
