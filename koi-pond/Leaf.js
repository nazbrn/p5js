// Leaf — a lily pad
// Round pad with the V-notch real water lilies have, radial veins,
// mottled color and an upturned rim. Drawn once into a texture, then reused.

class Leaf {
  constructor(x, y, size = random(40, 80)) {
    this.pos = createVector(x, y)
    this.drawPos = this.pos.copy()
    this.size = size // diameter

    // base color (each pad a little different)
    const shift = random(-14, 14)
    this.basecolor = [40 + shift * 0.3, 96 + shift, 50 + shift * 0.3]
    this.midcolor = [74 + shift * 0.4, 134 + shift, 64]
    this.centercolor = [128 + shift * 0.5, 168 + shift * 0.6, 84]

    // glow when koi is near
    this.highlightcolor = [150, 235, 175]
    this.glow = 0
    this.highlighted = false

    this.redRim = random() < 0.35 // some lily pads have a reddish edge
    this.angle = random(TWO_PI)
    this.seed = random(1000)
    this.wobble = 0

    this.tex = this.render()
  }

  padPath(c, R, notch) {
    const path = new Path2D()
    path.moveTo(c + R * 0.06, c)
    for (let a = notch; a <= TWO_PI - notch; a += 0.04) {
      const wob = 1 + (noise(this.seed + Math.cos(a) * 1.5, this.seed + Math.sin(a) * 1.5) - 0.5) * 0.06
      path.lineTo(c + Math.cos(a) * R * wob, c + Math.sin(a) * R * wob)
    }
    path.lineTo(c + Math.cos(-notch) * R, c + Math.sin(-notch) * R)
    path.closePath()
    return path
  }

  render() {
    const R = this.size / 2
    const dim = Math.ceil(this.size * 1.15)
    const c = dim / 2
    const g = createGraphics(dim, dim)
    const ctx = g.drawingContext
    const rgba = (col, a) => `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${a})`

    const notch = random(0.16, 0.26)
    const path = this.padPath(c, R, notch)

    // body of the pad
    const grad = ctx.createRadialGradient(c - R * 0.1, c, 0, c, c, R)
    grad.addColorStop(0, rgba(this.centercolor, 1))
    grad.addColorStop(0.35, rgba(this.midcolor, 1))
    grad.addColorStop(1, rgba(this.basecolor, 1))
    ctx.fillStyle = grad
    ctx.fill(path)

    ctx.save()
    ctx.clip(path)

    // mottling
    for (let i = 0; i < 70; i++) {
      const a = random(TWO_PI)
      const d = Math.sqrt(random()) * R
      const x = c + Math.cos(a) * d
      const y = c + Math.sin(a) * d
      const r = random(R * 0.04, R * 0.16)
      const light = random() < 0.5
      const sg = ctx.createRadialGradient(x, y, 0, x, y, r)
      sg.addColorStop(0, light ? 'rgba(190, 215, 130, 0.10)' : 'rgba(20, 60, 30, 0.14)')
      sg.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = sg
      ctx.beginPath()
      ctx.arc(x, y, r, 0, TWO_PI)
      ctx.fill()
    }

    // radial veins from the center out to the rim
    const veins = 19
    ctx.strokeStyle = 'rgba(205, 232, 170, 0.24)'
    ctx.lineWidth = Math.max(0.8, R * 0.012)
    ctx.lineCap = 'round'
    for (let k = 0; k < veins; k++) {
      const a = notch + 0.14 + (k / (veins - 1)) * (TWO_PI - 2 * notch - 0.28)
      const bend = 0.07
      ctx.beginPath()
      ctx.moveTo(c + R * 0.05, c)
      ctx.quadraticCurveTo(
        c + Math.cos(a + bend) * R * 0.55, c + Math.sin(a + bend) * R * 0.55,
        c + Math.cos(a) * R * 0.98, c + Math.sin(a) * R * 0.98
      )
      ctx.stroke()
    }

    // soft sun highlight
    const hl = ctx.createRadialGradient(c - R * 0.35, c - R * 0.35, 0, c - R * 0.35, c - R * 0.35, R * 0.9)
    hl.addColorStop(0, 'rgba(255, 255, 230, 0.12)')
    hl.addColorStop(1, 'rgba(255, 255, 230, 0)')
    ctx.fillStyle = hl
    ctx.fillRect(0, 0, dim, dim)

    // upturned rim (inner half of a wide stroke)
    ctx.lineWidth = R * 0.08
    ctx.strokeStyle = this.redRim ? 'rgba(150, 62, 52, 0.55)' : 'rgba(175, 205, 115, 0.45)'
    ctx.stroke(path)
    ctx.restore()

    // crisp outer edge
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(8, 36, 20, 0.45)'
    ctx.stroke(path)

    return g
  }

  update() {
    const t = frameCount * 0.002
    this.drawPos.x = this.pos.x + (noise(this.seed, t) - 0.5) * this.size * 0.18
    this.drawPos.y = this.pos.y + (noise(this.seed + 50, t) - 0.5) * this.size * 0.18
    this.wobble *= 0.965
  }

  drawShadow() {
    const ctx = drawingContext
    const R = this.size / 2
    const x = this.drawPos.x + R * 0.16
    const y = this.drawPos.y + R * 0.24
    const g = ctx.createRadialGradient(x, y, R * 0.5, x, y, R * 1.15)
    g.addColorStop(0, 'rgba(2, 16, 22, 0.38)')
    g.addColorStop(1, 'rgba(2, 16, 22, 0)')
    ctx.save()
    ctx.globalAlpha = typeof sunlight === 'number' ? sunlight : 1
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, R * 1.15, 0, TWO_PI)
    ctx.fill()
    ctx.restore()
  }

  display(ishighlighted = false) {
    this.glow = lerp(this.glow, ishighlighted ? 1 : 0, 0.06)
    const R = this.size / 2
    const ctx = drawingContext

    push()
    translate(this.drawPos.x, this.drawPos.y)

    // glow when koi is near
    if (this.glow > 0.01) {
      const h = this.highlightcolor
      const g = ctx.createRadialGradient(0, 0, R * 0.85, 0, 0, R * 1.5)
      g.addColorStop(0, `rgba(${h[0]},${h[1]},${h[2]},${0.32 * this.glow})`)
      g.addColorStop(1, `rgba(${h[0]},${h[1]},${h[2]},0)`)
      blendMode(ADD)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, R * 1.5, 0, TWO_PI)
      ctx.fill()
      blendMode(BLEND)
    }

    const sway = Math.sin(frameCount * 0.01 + this.seed) * 0.03
    const rock = Math.sin(frameCount * 0.15 + this.seed) * this.wobble * 0.08
    rotate(this.angle + sway + rock)
    scale(1 + this.glow * 0.02 + this.wobble * 0.015)

    imageMode(CENTER)
    image(this.tex, 0, 0)

    // brighten the pad itself while it glows
    if (this.glow > 0.01) {
      blendMode(ADD)
      ctx.globalAlpha = this.glow * 0.3
      image(this.tex, 0, 0)
      ctx.globalAlpha = 1
      blendMode(BLEND)
    }
    pop()
  }

  isNear(koi) {
    const d = dist(this.drawPos.x, this.drawPos.y, koi.pos.x, koi.pos.y)
    return d < this.size / 2 + koi.rad + 10
  }

  // push fishes away, and turn them along the pad's edge instead of a random spin
  repel(koi) {
    const toKoi = p5.Vector.sub(koi.pos, this.drawPos)
    const mindist = this.size * 0.5 + koi.rad * 0.6
    const d = toKoi.mag()

    if (d < mindist && d > 0) {
      toKoi.normalize()
      koi.pos.add(p5.Vector.mult(toKoi, (mindist - d) * 0.5))

      // remove the part of the velocity pointing into the pad
      const inward = koi.vel.dot(toKoi)
      if (inward < 0) koi.vel.sub(p5.Vector.mult(toKoi, inward * 1.2))
    }
  }

  // ripples rock the pad when the ring passes under it
  disturb(ripple) {
    if (ripple.hit.has(this)) return
    const d = dist(this.drawPos.x, this.drawPos.y, ripple.pos.x, ripple.pos.y)
    if (Math.abs(d - ripple.r) < this.size * 0.3) {
      ripple.hit.add(this)
      this.wobble = Math.min(1, this.wobble + 0.7 * ripple.strength * ripple.life)
    }
  }
}
