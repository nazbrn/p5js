// Water
// Deep pond color, soft stones on the floor, and moving caustic light.
// The caustics are drawn into a small buffer and scaled up, so they stay cheap.

class Water {
  constructor() {
    this.flow = createVector(0.3, 0)
    this.strength = 0.3
    this.t = 0
    this.scale = 5 // caustic buffer is 1/5 of the canvas
    this.build()
  }

  // (re)build the background + caustic buffer for the current canvas size
  build() {
    // ---- pond floor
    this.bg = createGraphics(width, height)
    this.bg.pixelDensity(1)
    const g = this.bg.drawingContext

    const cx = width * 0.45
    const cy = height * 0.4
    const R = Math.hypot(width, height) * 0.7
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, R)
    grad.addColorStop(0, 'rgb(46, 124, 132)')
    grad.addColorStop(0.4, 'rgb(25, 90, 104)')
    grad.addColorStop(1, 'rgb(5, 28, 40)')
    g.fillStyle = grad
    g.fillRect(0, 0, width, height)

    // soft stones and silt on the floor
    const stones = Math.round((width * height) / 9000)
    for (let i = 0; i < stones; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const r = 10 + Math.random() * 60
      const light = Math.random() < 0.35
      const sg = g.createRadialGradient(x, y, 0, x, y, r)
      sg.addColorStop(0, light ? 'rgba(130, 180, 165, 0.10)' : 'rgba(3, 24, 32, 0.30)')
      sg.addColorStop(1, 'rgba(0, 0, 0, 0)')
      g.fillStyle = sg
      g.beginPath()
      g.arc(x, y, r, 0, Math.PI * 2)
      g.fill()
    }

    // darker edges, like looking down into depth
    const v = g.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.3, width / 2, height / 2, R * 0.8)
    v.addColorStop(0, 'rgba(0, 0, 0, 0)')
    v.addColorStop(1, 'rgba(1, 12, 20, 0.55)')
    g.fillStyle = v
    g.fillRect(0, 0, width, height)

    // ---- caustic light buffer
    this.cw = Math.ceil(width / this.scale)
    this.ch = Math.ceil(height / this.scale)
    this.caustic = createGraphics(this.cw, this.ch)
    this.caustic.pixelDensity(1)
    this.caustic.loadPixels()
  }

  update() {
    this.t += 0.012
  }

  applyTo(koi) {
    // add the flow to the koi's position (fixed: koi store position in koi.pos)
    koi.pos.x += this.flow.x * this.strength
    koi.pos.y += this.flow.y * this.strength
  }

  changeDirection(dx, dy) {
    this.flow.set(dx, dy)
    this.flow.normalize()
  }

  changeStrength(newStrength) {
    this.strength = newStrength
  }

  display(light = 1) {
    image(this.bg, 0, 0, width, height)

    // caustics: thin bright lines where three slow sine fields cross zero
    const px = this.caustic.pixels
    const s = this.scale
    const t = this.t
    const ox = this.flow.x * t * 30
    const oy = this.flow.y * t * 30
    let idx = 0
    for (let y = 0; y < this.ch; y++) {
      const wy = (y * s - oy) * 0.019
      for (let x = 0; x < this.cw; x++) {
        const wx = (x * s - ox) * 0.019
        const a = Math.sin(wx + Math.sin(wy * 1.3 + t) * 1.2 + t * 0.7)
        const b = Math.sin(wy * 1.15 + Math.sin(wx * 1.1 - t * 0.8) * 1.1 - t * 0.5)
        const c = Math.sin((wx + wy) * 0.7 + Math.sin(wx * 0.5 - wy * 0.6 + t * 0.4) * 1.5 + t * 0.3)
        let v = 1 - Math.abs((a + b + c) / 3)
        v *= v
        v *= v
        v *= v
        v *= v
        px[idx] = 205
        px[idx + 1] = 244
        px[idx + 2] = 236
        px[idx + 3] = v * 80
        idx += 4
      }
    }
    this.caustic.updatePixels()

    push()
    blendMode(ADD)
    drawingContext.globalAlpha = light
    image(this.caustic, 0, 0, width, height)
    drawingContext.globalAlpha = 1
    pop()
  }
}
