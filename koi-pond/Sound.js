// PondSound
// All sound is generated live with the Web Audio API, no audio files.
// - a low drone and a quiet water bed
// - slow plucked notes in the miyako-bushi (In) scale on D, like a koto in the distance
// - a plop + note when you release a koi
// - rain hiss and droplet ticks that follow the rain intensity

class PondSound {
  constructor() {
    this.ctx = null
    this.on = false
    this.rain = 0
    this.step = 4
    // D miyako-bushi: D Eb G A Bb, across two octaves
    this.scale = [196.0, 220.0, 233.08, 293.66, 311.13, 392.0, 440.0, 466.16, 587.33, 622.25, 783.99]
  }

  init() {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return false
    const c = (this.ctx = new AC())

    this.master = c.createGain()
    this.master.gain.value = 0
    this.master.connect(c.destination)

    // reverb from a generated impulse
    this.reverb = c.createConvolver()
    this.reverb.buffer = this.impulse(3.5, 2.6)
    const wet = c.createGain()
    wet.gain.value = 0.5
    this.reverb.connect(wet).connect(this.master)
    this.dry = c.createGain()
    this.dry.gain.value = 0.55
    this.dry.connect(this.master)

    // shared noise
    const len = c.sampleRate * 2
    this.noise = c.createBuffer(1, len, c.sampleRate)
    const data = this.noise.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1

    // water bed: soft low noise that breathes
    const water = this.loopNoise()
    const wl = c.createBiquadFilter()
    wl.type = 'lowpass'
    wl.frequency.value = 420
    const wg = c.createGain()
    wg.gain.value = 0.05
    const lfo = c.createOscillator()
    lfo.frequency.value = 0.07
    const lfoGain = c.createGain()
    lfoGain.gain.value = 0.025
    lfo.connect(lfoGain).connect(wg.gain)
    lfo.start()
    water.connect(wl).connect(wg).connect(this.master)

    // drone
    const dl = c.createBiquadFilter()
    dl.type = 'lowpass'
    dl.frequency.value = 700
    const dg = c.createGain()
    dg.gain.value = 0.035
    dl.connect(dg)
    dg.connect(this.dry)
    dg.connect(this.reverb)
    for (const [f, type] of [[73.42, 'sine'], [110.0, 'triangle'], [146.83, 'sine']]) {
      const o = c.createOscillator()
      o.type = type
      o.frequency.value = f
      o.detune.value = Math.random() * 8 - 4
      o.connect(dl)
      o.start()
    }
    this.droneGain = dg

    // rain hiss
    const rn = this.loopNoise()
    const rh = c.createBiquadFilter()
    rh.type = 'highpass'
    rh.frequency.value = 1400
    const rl = c.createBiquadFilter()
    rl.type = 'lowpass'
    rl.frequency.value = 7000
    this.rainGain = c.createGain()
    this.rainGain.gain.value = 0
    rn.connect(rh).connect(rl).connect(this.rainGain).connect(this.master)

    this.melody()
    this.ticks()
    return true
  }

  impulse(seconds, decay) {
    const c = this.ctx
    const len = Math.floor(c.sampleRate * seconds)
    const buf = c.createBuffer(2, len, c.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
    return buf
  }

  loopNoise() {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    src.start()
    return src
  }

  toggle() {
    if (!this.ctx && !this.init()) return false
    const c = this.ctx
    const t = c.currentTime
    this.on = !this.on
    if (this.on) c.resume()
    this.master.gain.cancelScheduledValues(t)
    this.master.gain.setTargetAtTime(this.on ? 0.85 : 0, t, 0.4)
    return this.on
  }

  pluck(freq, vel = 1) {
    if (!this.on) return
    const c = this.ctx
    const t = c.currentTime + 0.01
    const o = c.createOscillator()
    o.type = 'triangle'
    o.frequency.setValueAtTime(freq * 1.012, t)
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.08)
    const o2 = c.createOscillator()
    o2.type = 'sine'
    o2.frequency.value = freq * 2
    const g2 = c.createGain()
    g2.gain.value = 0.25
    const f = c.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(2600, t)
    f.frequency.exponentialRampToValueAtTime(500, t + 1.6)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.16 * vel, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4)
    o.connect(f)
    o2.connect(g2).connect(f)
    f.connect(g)
    g.connect(this.dry)
    g.connect(this.reverb)
    o.start(t)
    o2.start(t)
    o.stop(t + 2.6)
    o2.stop(t + 2.6)
  }

  // a water plop: a quick falling sine
  plop(vol = 1) {
    if (!this.on) return
    const c = this.ctx
    const t = c.currentTime + 0.005
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(900 + Math.random() * 300, t)
    o.frequency.exponentialRampToValueAtTime(260, t + 0.12)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.12 * vol, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    o.connect(g)
    g.connect(this.dry)
    g.connect(this.reverb)
    o.start(t)
    o.stop(t + 0.2)
  }

  // releasing a koi: plop, then a high note
  release() {
    this.plop(1)
    const hi = this.scale.slice(6)
    setTimeout(() => this.pluck(hi[Math.floor(Math.random() * hi.length)], 0.9), 90)
  }

  // slow random walk through the scale; sparser while it rains
  melody() {
    const next = () => {
      if (this.on) {
        this.step = Math.max(0, Math.min(this.scale.length - 1, this.step + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]))
        this.pluck(this.scale[this.step], 0.7 + Math.random() * 0.3)
        if (Math.random() < 0.18 && this.step + 2 < this.scale.length) {
          setTimeout(() => this.pluck(this.scale[this.step + 2], 0.5), 160)
        }
      }
      const wait = 1100 + Math.random() * 2600 + this.rain * 2200
      setTimeout(next, wait)
    }
    setTimeout(next, 600)
  }

  // droplet ticks during rain
  ticks() {
    setInterval(() => {
      if (!this.on || this.rain < 0.05) return
      if (Math.random() > this.rain * 0.9) return
      const c = this.ctx
      const t = c.currentTime + Math.random() * 0.05
      const o = c.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(1800 + Math.random() * 1600, t)
      o.frequency.exponentialRampToValueAtTime(700, t + 0.04)
      const g = c.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(0.03 * this.rain, t + 0.002)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06)
      o.connect(g).connect(this.master)
      o.start(t)
      o.stop(t + 0.08)
    }, 70)
  }

  setRain(v) {
    if (!this.ctx || Math.abs(v - this.rain) < 0.01) return
    this.rain = v
    const t = this.ctx.currentTime
    this.rainGain.gain.setTargetAtTime(v * 0.16, t, 0.5)
    this.droneGain.gain.setTargetAtTime(0.035 * (1 - v * 0.4), t, 0.8)
  }
}
