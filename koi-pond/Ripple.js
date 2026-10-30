// Ripple — rings on the surface when a koi is released (and the odd ambient drop)

class Ripple {
  constructor(x, y, strength = 1) {
    this.pos = createVector(x, y)
    this.r = 0
    this.life = 1
    this.strength = strength
    this.hit = new Set() // pads this ripple already rocked
  }

  update() {
    this.r += 1.2 + 1.2 * this.strength
    this.life -= 0.011
  }

  get done() {
    return this.life <= 0
  }

  display() {
    push()
    noFill()
    for (let k = 0; k < 3; k++) {
      const rr = this.r - k * 14 * this.strength
      if (rr <= 0) continue
      stroke(215, 245, 238, 140 * this.life * this.strength * (1 - k * 0.3))
      strokeWeight(1.6 * this.life + 0.4)
      ellipse(this.pos.x, this.pos.y, rr * 2, rr * 2)
    }
    pop()
  }
}
