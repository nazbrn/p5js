// Rain
// Every so often the sky clouds over and it rains.
// Drops make small rings on the water, tap the lily pads, and the sunlight dims.

class Rain {
  constructor() {
    this.intensity = 0 // 0 = clear, 1 = full rain (eases toward target)
    this.target = 0
    this.state = 'clear'
    this.timer = 40 * 60 // first rain after ~40 seconds
    this.drops = []
    this.spawn = 0
  }

  start(seconds = random(25, 35)) {
    this.state = 'raining'
    this.target = 1
    this.timer = seconds * 60
  }

  stop() {
    this.state = 'clear'
    this.target = 0
    this.timer = random(90, 150) * 60
  }

  toggle() {
    if (this.state === 'raining') this.stop()
    else this.start()
  }

  update(leaves) {
    this.timer--
    if (this.timer <= 0) {
      if (this.state === 'clear') this.start()
      else this.stop()
    }
    this.intensity = lerp(this.intensity, this.target, 0.004)
    if (this.intensity < 0.002) this.intensity = 0

    // new drops this frame, scaled by screen area
    this.spawn += this.intensity * ((width * height) / 1e6) * 10
    while (this.spawn >= 1) {
      this.spawn--
      const x = random(width)
      const y = random(height)
      let pad = null
      for (const leaf of leaves) {
        if (dist(x, y, leaf.drawPos.x, leaf.drawPos.y) < leaf.size * 0.48) {
          pad = leaf
          break
        }
      }
      if (pad) pad.wobble = Math.min(1, pad.wobble + 0.04)
      this.drops.push({ x, y, r: 0, max: pad ? random(3, 6) : random(8, 26), life: 1, onPad: !!pad })
    }

    for (const d of this.drops) {
      d.r += (d.max - d.r) * 0.08 + 0.3
      d.life -= d.onPad ? 0.08 : 0.035
    }
    this.drops = this.drops.filter((d) => d.life > 0)
  }

  // rings on the open water
  displayWater() {
    const ctx = drawingContext
    ctx.save()
    ctx.lineWidth = 1
    for (const d of this.drops) {
      if (d.onPad) continue
      ctx.strokeStyle = `rgba(220, 245, 240, ${0.5 * d.life})`
      ctx.beginPath()
      ctx.ellipse(d.x, d.y, d.r, d.r * 0.92, 0, 0, TWO_PI)
      ctx.stroke()
      if (d.r > 6) {
        ctx.strokeStyle = `rgba(220, 245, 240, ${0.25 * d.life})`
        ctx.beginPath()
        ctx.ellipse(d.x, d.y, d.r * 0.55, d.r * 0.5, 0, 0, TWO_PI)
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  // little splashes on top of the pads
  displayPads() {
    const ctx = drawingContext
    ctx.save()
    for (const d of this.drops) {
      if (!d.onPad) continue
      ctx.fillStyle = `rgba(235, 250, 240, ${0.6 * d.life})`
      ctx.beginPath()
      ctx.arc(d.x, d.y, 1.5, 0, TWO_PI)
      ctx.fill()
      ctx.strokeStyle = `rgba(235, 250, 240, ${0.35 * d.life})`
      ctx.beginPath()
      ctx.arc(d.x, d.y, d.r, 0, TWO_PI)
      ctx.stroke()
    }
    ctx.restore()
  }

  // overcast light on the water
  displayShade() {
    if (this.intensity <= 0) return
    const ctx = drawingContext
    ctx.save()
    ctx.fillStyle = `rgba(6, 18, 28, ${0.3 * this.intensity})`
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
  }

  // falling streaks over everything
  displayStreaks() {
    if (this.intensity <= 0.02) return
    const ctx = drawingContext
    const n = Math.floor(this.intensity * ((width * height) / 1e6) * 70)
    ctx.save()
    ctx.strokeStyle = `rgba(215, 235, 240, ${0.14 * this.intensity})`
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const l = 12 + Math.random() * 18
      ctx.moveTo(x, y)
      ctx.lineTo(x - l * 0.25, y + l)
    }
    ctx.stroke()
    ctx.restore()
  }
}
