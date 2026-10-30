// KoiFish
// A koi with a flexible spine, so the body bends as it turns.
// Patterns are based on real koi varieties.

const KOI_WHITE = [246, 241, 230]
const KOI_RED = [210, 60, 34]
const KOI_BLACK = [26, 24, 28]
const KOI_GOLD = [236, 178, 58]
const KOI_BLUE = [116, 146, 166]
const KOI_ORANGE = [226, 110, 48]
const KOI_BRONZE = [158, 106, 60]

const KOI_VARIETIES = [
  { name: 'Kohaku', jp: '紅白', weight: 3 },
  { name: 'Taisho Sanke', jp: '大正三色', weight: 2 },
  { name: 'Showa', jp: '昭和三色', weight: 2 },
  { name: 'Tancho', jp: '丹頂', weight: 1 },
  { name: 'Yamabuki Ogon', jp: '山吹黄金', weight: 1 },
  { name: 'Asagi', jp: '浅黄', weight: 1 },
  { name: 'Chagoi', jp: '茶鯉', weight: 1 },
]

function pickKoiVariety() {
  let total = 0
  for (const v of KOI_VARIETIES) total += v.weight
  let r = random(total)
  for (const v of KOI_VARIETIES) {
    r -= v.weight
    if (r <= 0) return v
  }
  return KOI_VARIETIES[0]
}

function koiRGBA(c, a = 1) {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`
}

// smooth closed outline through a list of points
function smoothClosedPath(points) {
  const path = new Path2D()
  const L = points.length
  const last = points[L - 1]
  path.moveTo((last.x + points[0].x) / 2, (last.y + points[0].y) / 2)
  for (let i = 0; i < L; i++) {
    const p = points[i]
    const q = points[(i + 1) % L]
    path.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2)
  }
  path.closePath()
  return path
}

class KoiFish {
  constructor(_x = width * 0.5, _y = height * 0.5, mood = 0) {
    this.pos = createVector(_x, _y)
    this.vel = p5.Vector.random2D().mult(random(0.8, 1.4))
    this.mood = mood

    const S = constrain(min(width, height) / 850, 0.55, 1.25)
    this.len = random(105, 145) * S
    this.rad = this.len * 0.16 // radius for edge + Leaf checks
    this.maxSpeed = random(1.1, 1.8)
    this.angle = this.vel.heading() // direction fish is facing

    this.variety = pickKoiVariety()
    this.makePattern()

    // spine: a chain of points that follows the head
    this.segCount = 12
    this.segLen = this.len / (this.segCount - 1)
    this.spine = []
    for (let i = 0; i < this.segCount; i++) {
      this.spine.push(createVector(
        _x - Math.cos(this.angle) * this.segLen * i,
        _y - Math.sin(this.angle) * this.segLen * i
      ))
    }

    this.phase = random(TWO_PI)
    this.seed = random(1000)
    this.wanderT = random(1000)
    this.age = 0 // used to fade the koi in when it's released
    this.trail = [] // ミ wake marks
    this.schoolingtimer = 0
    this.computeBody()
  }

  makePattern() {
    const v = this.variety.name
    this.patches = [] // { t: along body 0-1, side: -1..1 across body, r: radius as fraction of length }
    this.sheen = 0.15
    this.scales = false

    // an organic patch = one big circle plus two smaller overlapping ones
    const blob = (t, side, r, col) => {
      this.patches.push({ t, side, r, col })
      for (let k = 0; k < 2; k++) {
        this.patches.push({ t: t + random(-0.06, 0.06), side: side + random(-0.35, 0.35), r: r * random(0.55, 0.85), col })
      }
    }

    if (v === 'Kohaku' || v === 'Taisho Sanke') {
      this.base = KOI_WHITE
      this.fin = KOI_WHITE
      const n = floor(random(2, 5))
      for (let i = 0; i < n; i++) blob(0.04 + (i / n) * 0.72 + random(0.06), random(-0.4, 0.4), random(0.08, 0.13), KOI_RED)
      if (v === 'Taisho Sanke') {
        const m = floor(random(3, 7))
        for (let i = 0; i < m; i++) this.patches.push({ t: random(0.18, 0.85), side: random(-0.9, 0.9), r: random(0.025, 0.05), col: KOI_BLACK })
      }
    } else if (v === 'Showa') {
      this.base = KOI_BLACK
      this.fin = [70, 64, 66]
      this.sheen = 0.1
      for (let i = 0, n = floor(random(2, 4)); i < n; i++) blob(random(0.05, 0.75), random(-0.5, 0.5), random(0.08, 0.12), KOI_RED)
      for (let i = 0, n = floor(random(2, 4)); i < n; i++) blob(random(0.1, 0.85), random(-0.6, 0.6), random(0.09, 0.14), KOI_WHITE)
    } else if (v === 'Tancho') {
      this.base = KOI_WHITE
      this.fin = KOI_WHITE
      this.patches.push({ t: 0.07, side: 0, r: 0.075, col: KOI_RED })
    } else if (v === 'Yamabuki Ogon') {
      this.base = KOI_GOLD
      this.fin = [246, 206, 110]
      this.sheen = 0.5
    } else if (v === 'Asagi') {
      this.base = KOI_BLUE
      this.fin = [210, 196, 184]
      this.scales = true
      for (const s of [-1, 1]) {
        this.patches.push({ t: 0.05, side: s * 0.85, r: 0.055, col: KOI_ORANGE })
        for (let t = 0.3; t < 0.85; t += 0.12) this.patches.push({ t, side: s, r: 0.06, col: KOI_ORANGE })
      }
    } else {
      // Chagoi
      this.base = KOI_BRONZE
      this.fin = [180, 132, 88]
      this.scales = true
      this.sheen = 0.25
    }
  }

  // half-width of the body at t (0 = head, 1 = tail base)
  widthAt(t) {
    const maxW = this.len * 0.135
    if (t < 0.28) return maxW * (0.6 + 0.4 * Math.sin((t / 0.28) * HALF_PI))
    const k = (t - 0.28) / 0.72
    return maxW * (0.12 + 0.88 * Math.cos(k * HALF_PI))
  }

  computeBody() {
    const n = this.segCount
    const pts = []
    const ws = []
    for (let i = 0; i < n; i++) {
      const a = this.spine[Math.max(0, i - 1)]
      const b = this.spine[Math.min(n - 1, i + 1)]
      let tx = a.x - b.x
      let ty = a.y - b.y
      const m = Math.hypot(tx, ty) || 1
      tx /= m
      ty /= m
      const nx = -ty
      const ny = tx
      const t = i / (n - 1)
      // swimming wave, stronger toward the tail
      const wave = Math.sin(this.phase - t * 4.5) * this.len * 0.045 * t * t
      pts.push({ x: this.spine[i].x + nx * wave, y: this.spine[i].y + ny * wave, tx, ty, nx, ny })
      ws.push(this.widthAt(t))
    }

    const p0 = pts[0]
    const outline = [{ x: p0.x + p0.tx * ws[0] * 1.15, y: p0.y + p0.ty * ws[0] * 1.15 }]
    for (let i = 0; i < n; i++) outline.push({ x: pts[i].x + pts[i].nx * ws[i], y: pts[i].y + pts[i].ny * ws[i] })
    for (let i = n - 1; i >= 0; i--) outline.push({ x: pts[i].x - pts[i].nx * ws[i], y: pts[i].y - pts[i].ny * ws[i] })

    this.body = { pts, ws, path: smoothClosedPath(outline) }
  }

  pointOnBody(t, side) {
    const { pts, ws } = this.body
    const n = pts.length
    const f = constrain(t, 0, 1) * (n - 1)
    const i = Math.floor(f)
    const j = Math.min(n - 1, i + 1)
    const k = f - i
    const a = pts[i]
    const b = pts[j]
    const w = ws[i] + (ws[j] - ws[i]) * k
    const nx = a.nx + (b.nx - a.nx) * k
    const ny = a.ny + (b.ny - a.ny) * k
    return {
      x: a.x + (b.x - a.x) * k + nx * side * w,
      y: a.y + (b.y - a.y) * k + ny * side * w,
    }
  }

  swim() {
    this.age++
    if (this.schoolingtimer > 0) this.schoolingtimer--

    // gentle wandering
    this.wanderT += 0.006
    this.vel.rotate((noise(this.wanderT, this.seed) - 0.5) * 0.07)

    // turn away from the edges smoothly instead of bouncing
    const m = this.len * 1.3
    const steer = createVector(0, 0)
    if (this.pos.x < m) steer.x += (m - this.pos.x) / m
    if (this.pos.x > width - m) steer.x -= (this.pos.x - (width - m)) / m
    if (this.pos.y < m) steer.y += (m - this.pos.y) / m
    if (this.pos.y > height - m) steer.y -= (this.pos.y - (height - m)) / m
    this.vel.add(steer.mult(0.09))

    // ease toward cruising speed
    let sp = this.vel.mag()
    if (sp < 0.05) {
      this.vel = p5.Vector.fromAngle(this.angle, 0.5)
      sp = 0.5
    }
    this.vel.setMag(lerp(sp, this.maxSpeed, 0.03))

    this.pos.add(this.vel)
    this.pos.x = constrain(this.pos.x, this.rad, width - this.rad)
    this.pos.y = constrain(this.pos.y, this.rad, height - this.rad)

    // always face the way it swims (fixes the sideways drift)
    this.angle = this.vel.heading()
    this.phase += 0.06 + this.vel.mag() * 0.07

    // spine follows the head
    this.spine[0].set(this.pos)
    for (let i = 1; i < this.segCount; i++) {
      const prev = this.spine[i - 1]
      const cur = this.spine[i]
      const dx = cur.x - prev.x
      const dy = cur.y - prev.y
      const d = Math.hypot(dx, dy) || 1
      cur.x = prev.x + (dx / d) * this.segLen
      cur.y = prev.y + (dy / d) * this.segLen
    }

    // ミ wake behind the tail
    if (this.age % 10 === 0) {
      const tail = this.spine[this.segCount - 1]
      this.trail.push({
        x: tail.x - Math.cos(this.angle) * this.len * 0.3,
        y: tail.y - Math.sin(this.angle) * this.len * 0.3,
        angle: this.angle,
        life: 1,
      })
    }
    for (const w of this.trail) w.life -= 0.018
    this.trail = this.trail.filter((w) => w.life > 0)

    this.computeBody()
  }

  // separation + alignment + cohesion, so they school without clumping
  makeFriends(others = []) {
    const sep = createVector(0, 0)
    const ali = createVector(0, 0)
    const coh = createVector(0, 0)
    let count = 0

    for (const f of others) {
      if (f === this) continue
      const d = p5.Vector.dist(this.pos, f.pos)
      const personal = (this.len + f.len) * 0.45
      if (d < personal && d > 0) {
        sep.add(p5.Vector.sub(this.pos, f.pos).setMag((personal - d) / personal))
      }
      if (d < 160) {
        ali.add(f.vel)
        coh.add(f.pos)
        count++
      }
    }

    if (count > 0) {
      ali.div(count).setMag(this.maxSpeed).sub(this.vel).limit(0.02)
      coh.div(count).sub(this.pos).setMag(0.012)
      this.vel.add(ali).add(coh)
      this.schoolingtimer = 30
    }
    this.vel.add(sep.mult(0.12))
    this.vel.limit(this.maxSpeed * 1.4)
  }

  drawShadow() {
    const ctx = drawingContext
    const off = this.len * 0.12
    ctx.save()
    ctx.globalAlpha = Math.min(1, this.age / 50) * sunlight
    ctx.translate(off * 0.6, off)
    ctx.fillStyle = 'rgba(2, 18, 26, 0.3)'
    ctx.fill(this.body.path)
    ctx.restore()
  }

  display(water) {
    const ctx = drawingContext
    const { pts, ws, path } = this.body
    const n = pts.length
    const fade = Math.min(1, this.age / 50)

    ctx.save()
    ctx.globalAlpha = fade

    // ---- ミ wake
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const w of this.trail) {
      ctx.save()
      ctx.translate(w.x, w.y)
      ctx.rotate(w.angle + HALF_PI)
      const size = Math.round(this.len * 0.2 * (1 + (1 - w.life) * 0.6))
      ctx.font = `${size}px "Shippori Mincho", "Hiragino Mincho ProN", serif`
      ctx.fillStyle = `rgba(235, 250, 245, ${0.5 * w.life})`
      ctx.fillText('ミ', 0, 0)
      ctx.restore()
    }

    const fin = this.fin
    const flap = Math.sin(this.phase * 0.5) * 0.25

    // ---- pectoral + pelvic fins
    const fins = [
      { i: 2, len: 0.17, wid: 0.065, spread: 0.6 },
      { i: 6, len: 0.09, wid: 0.04, spread: 0.85 },
    ]
    for (const f of fins) {
      const p = pts[f.i]
      const heading = Math.atan2(p.ty, p.tx)
      const fl = this.len * f.len
      const fw = this.len * f.wid
      for (const s of [-1, 1]) {
        const ang = heading + s * (HALF_PI + f.spread + flap)
        const bx = p.x + p.nx * s * ws[f.i] * 0.75
        const by = p.y + p.ny * s * ws[f.i] * 0.75
        ctx.beginPath()
        ctx.ellipse(bx + Math.cos(ang) * fl * 0.5, by + Math.sin(ang) * fl * 0.5, fl * 0.5, fw * 0.5, ang, 0, TWO_PI)
        ctx.fillStyle = koiRGBA(fin, 0.55)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
        ctx.lineWidth = 0.8
        for (let r = -1; r <= 1; r++) {
          ctx.beginPath()
          ctx.moveTo(bx, by)
          ctx.lineTo(bx + Math.cos(ang + r * 0.16) * fl * 0.9, by + Math.sin(ang + r * 0.16) * fl * 0.9)
          ctx.stroke()
        }
      }
    }

    // ---- tail fin
    const tb = pts[n - 1]
    const tp = pts[n - 2]
    const back = Math.atan2(tb.y - tp.y, tb.x - tp.x)
    const sway = Math.sin(this.phase - 5) * 0.3
    const tl = this.len * 0.3
    const a = back + sway
    const at = (off, k) => ({ x: tb.x + Math.cos(a + off) * tl * k, y: tb.y + Math.sin(a + off) * tl * k })
    const up = at(-0.5, 1)
    const lo = at(0.5, 1)
    const notch = at(0, 0.55)
    const c1 = at(-0.38, 0.5)
    const c2 = at(-0.12, 0.85)
    const c3 = at(0.12, 0.85)
    const c4 = at(0.38, 0.5)
    ctx.beginPath()
    ctx.moveTo(tb.x, tb.y)
    ctx.quadraticCurveTo(c1.x, c1.y, up.x, up.y)
    ctx.quadraticCurveTo(c2.x, c2.y, notch.x, notch.y)
    ctx.quadraticCurveTo(c3.x, c3.y, lo.x, lo.y)
    ctx.quadraticCurveTo(c4.x, c4.y, tb.x, tb.y)
    ctx.fillStyle = koiRGBA(fin, 0.6)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'
    ctx.lineWidth = 0.8
    for (let off = -0.42; off <= 0.43; off += 0.14) {
      const e = at(off, 0.6 + Math.abs(off) * 0.75)
      ctx.beginPath()
      ctx.moveTo(tb.x, tb.y)
      ctx.lineTo(e.x, e.y)
      ctx.stroke()
    }

    // ---- body
    ctx.fillStyle = koiRGBA(this.base, 1)
    ctx.fill(path)

    ctx.save()
    ctx.clip(path)

    // pattern patches
    for (const p of this.patches) {
      const q = this.pointOnBody(p.t, p.side)
      ctx.beginPath()
      ctx.arc(q.x, q.y, p.r * this.len, 0, TWO_PI)
      ctx.fillStyle = koiRGBA(p.col, 1)
      ctx.fill()
    }

    // scale net (Asagi, Chagoi)
    if (this.scales) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = 0.8
      const r = this.len * 0.03
      for (let t = 0.15; t < 0.9; t += 0.07) {
        for (const side of [-0.6, -0.2, 0.2, 0.6]) {
          const q = this.pointOnBody(t, side)
          ctx.beginPath()
          ctx.arc(q.x, q.y, r, this.angle + Math.PI - 1.1, this.angle + Math.PI + 1.1)
          ctx.stroke()
        }
      }
    }

    // rounded shading: darker toward the edges
    ctx.lineWidth = this.len * 0.09
    ctx.strokeStyle = 'rgba(0, 10, 20, 0.22)'
    ctx.stroke(path)

    // light along the back
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < n - 2; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = this.len * 0.06
    ctx.strokeStyle = `rgba(255, 255, 240, ${0.1 + this.sheen * 0.35})`
    ctx.stroke()
    ctx.restore()

    // dorsal fin
    ctx.beginPath()
    ctx.moveTo(pts[3].x, pts[3].y)
    for (let i = 4; i <= 7; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.lineCap = 'round'
    ctx.lineWidth = this.len * 0.028
    ctx.strokeStyle = koiRGBA(this.base.map((c) => c * 0.6), 0.35)
    ctx.stroke()

    // eyes
    const p0 = pts[0]
    for (const s of [-1, 1]) {
      const ex = p0.x + p0.tx * ws[0] * 0.45 + p0.nx * s * ws[0] * 0.62
      const ey = p0.y + p0.ty * ws[0] * 0.45 + p0.ny * s * ws[0] * 0.62
      ctx.beginPath()
      ctx.arc(ex, ey, this.len * 0.018, 0, TWO_PI)
      ctx.fillStyle = 'rgba(18, 18, 22, 0.9)'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(ex - this.len * 0.005, ey - this.len * 0.005, this.len * 0.006, 0, TWO_PI)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.fill()
    }

    ctx.restore()
  }
}
