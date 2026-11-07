// Kandinsky Cam Paint — v6 sound
// The painting is a score. A playhead sweeps left → right in a loop and plays every mark it passes.
//
// Rules (inspired by Kandinsky's color–sound ideas in "Concerning the Spiritual in Art"):
//  - Height = pitch (higher on the paper = higher note), all notes from one pentatonic scale
//  - Color = instrument (synthesized approximations, not real samples)
//  - Black = percussion (pencil lines + black/outline shapes give soft knocks)
//  - Shape = how the note starts: circle soft & round, square blocky, triangle sharp
//  - Size = loudness and length
//
// Uses the browser's built-in Web Audio API (no extra library).
// Browsers only allow sound after one click/key press on the page; see unlock().

const LOOP_SECONDS = 8

// timbre per palette color (keys match KANDINSKY_PALETTE in paint.js)
const VOICES = {
  '#F2C230': { wave: 'sawtooth', cutoff: 2800, attack: 0.02, oct: 1,  decay: 0.6 }, // yellow  → bright, trumpet-like
  '#D63A2A': { wave: 'square',   cutoff: 1400, attack: 0.03, oct: 0,  decay: 0.8 }, // red     → warm brass
  '#1E4D9B': { wave: 'sine',     cutoff: 2000, attack: 0.08, oct: -1, decay: 1.6 }, // deep blue → deep, cello/organ-like
  '#7FB3D5': { wave: 'sine',     cutoff: 3000, attack: 0.06, oct: 1,  decay: 1.0 }, // light blue → flute-like
  '#6B4C9A': { wave: 'triangle', cutoff: 900,  attack: 0.04, oct: -1, decay: 1.0 }, // violet  → low reed
  '#E9A3A0': { wave: 'triangle', cutoff: 2500, attack: 0.03, oct: 1,  decay: 0.9 }, // pink    → soft high
  '#E8822A': { wave: 'sawtooth', cutoff: 1800, attack: 0.02, oct: 0,  decay: 0.7 }, // orange  → mid brass
  '#3F8A5A': { wave: 'triangle', cutoff: 2200, attack: 0.05, oct: 0,  decay: 1.2 }  // green   → calm string-like
}

const PENTATONIC = [0, 2, 4, 7, 9]
const BASE_FREQ = 130.81 // C3
const NOTE_COUNT = 15    // 3 octaves

const Sound = {
  ctx: null,
  master: null,
  noise: null,
  voices: 0,
  maxVoices: 24,

  init() {
    if (this.ctx) return
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    this.ctx = new AC()

    const comp = this.ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.ratio.value = 6
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.7
    this.master.connect(comp)
    comp.connect(this.ctx.destination)

    // short noise buffer for percussion
    const len = this.ctx.sampleRate * 0.2
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const d = this.noise.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  },

  unlock() {
    this.init()
    if (this.ctx && this.ctx.state !== 'running') this.ctx.resume()
  },

  ready() {
    return this.ctx && this.ctx.state === 'running'
  },

  // y position → frequency on the pentatonic scale
  pitch(y, h, octShift = 0) {
    let idx = constrain(floor(map(y, h, 0, 0, NOTE_COUNT)), 0, NOTE_COUNT - 1)
    let semis = 12 * floor(idx / 5) + PENTATONIC[idx % 5] + 12 * octShift
    return BASE_FREQ * pow(2, semis / 12)
  },

  tone(freq, { wave = 'sine', attack = 0.01, decay = 0.8, gain = 0.15, cutoff = 4000 } = {}) {
    if (!this.ready() || this.voices >= this.maxVoices) return
    const c = this.ctx
    const t = c.currentTime

    const o = c.createOscillator()
    o.type = wave
    o.frequency.value = freq

    const f = c.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = cutoff

    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)

    o.connect(f); f.connect(g); g.connect(this.master)
    this.voices++
    o.onended = () => { this.voices-- }
    o.start(t)
    o.stop(t + attack + decay + 0.05)
  },

  // black = percussion: a soft pitched knock
  knock(freq, gain = 0.2) {
    if (!this.ready() || this.voices >= this.maxVoices) return
    const c = this.ctx
    const t = c.currentTime

    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(freq * 2, t)
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.06)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
    o.connect(g); g.connect(this.master)

    const n = c.createBufferSource()
    n.buffer = this.noise
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = freq * 4
    bp.Q.value = 3
    const ng = c.createGain()
    ng.gain.setValueAtTime(gain * 0.4, t)
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
    n.connect(bp); bp.connect(ng); ng.connect(this.master)

    this.voices++
    o.onended = () => { this.voices-- }
    o.start(t); o.stop(t + 0.25)
    n.start(t); n.stop(t + 0.06)
  },

  // play one shape mark
  playMark(m, h, k) {
    let s = constrain(m.size / (200 * k), 0.1, 1)
    let gain = 0.06 + 0.16 * s

    let v = VOICES[m.col]
    if (!v) { // black or outline-only shape → percussion
      this.knock(this.pitch(m.y, h, -1), gain + 0.05)
      return
    }

    let attack = v.attack
    let decay = v.decay * (0.5 + s)
    let cutoff = v.cutoff

    if (m.type === 'Circle')   { attack *= 2;   decay *= 1.3 }
    if (m.type === 'Square')   { attack = 0.01; decay *= 0.8 }
    if (m.type === 'Triangle') { attack = 0.005; decay *= 0.6; cutoff *= 1.4 }

    this.tone(this.pitch(m.y, h, v.oct), { wave: v.wave, attack, decay, gain, cutoff })
  },

  // pencil = soft percussion, pitch from height
  playLine(y, h) {
    this.knock(this.pitch(y, h, 0), 0.12)
  }
}

// ---------- playhead ----------

let playheadX = 0

function updatePlayhead(painter) {
  if (!painter.canvasArmed) { playheadX = 0; return }

  let prev = playheadX
  let step = painter.w * (deltaTime / 1000) / LOOP_SECONDS
  let cur = prev + step
  let wrapped = false
  if (cur >= painter.w) { cur -= painter.w; wrapped = true }
  playheadX = cur

  const crossed = (x) => wrapped ? (x >= prev || x < cur) : (x >= prev && x < cur)
  let now = millis()

  for (let m of painter.marks) {
    if (crossed(m.x)) {
      Sound.playMark(m, painter.h, painter.k)
      painter.flash(m.x, m.y, m.size)
    }
  }

  for (let st of painter.strokes) {
    if (now - st.lastHit < 70) continue
    let inRange = wrapped ? true : (st.maxX >= prev && st.minX < cur)
    if (!inRange) continue
    for (let p of st.pts) {
      if (crossed(p.x)) {
        Sound.playLine(p.y, painter.h)
        painter.flash(p.x, p.y, 10 * painter.k)
        st.lastHit = now
        break
      }
    }
  }
}

function drawPlayhead(painter) {
  if (!painter.canvasArmed) return
  push()
  stroke(0, 45)
  strokeWeight(1.5)
  line(playheadX, 0, playheadX, painter.h)
  pop()
}