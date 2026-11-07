// Kandinsky Cam Paint — v8
// v8: shapes land where the fingertip was last seen in the past second (instead of jumping to center
//     when the fingertip drops out while gripping an object). Pencil keeps its short memory.
// v7: paper hold shortened to 4, since sketch.js now confirms labels first
// v6 notes:
// Changes from v5:
//  - Every mark is remembered (position, size, color, type) so the painting can be played as music (sound.js)
//  - Each new mark sounds immediately; pencil ticks softly while you draw
//  - Marks flash briefly when the playhead plays them (on screen only, never saved into the painting)

// Palette picked by eye from Kandinsky's 1920s geometric work (e.g. Composition VIII, Yellow-Red-Blue).
// Tweak these hex values freely (keep sound.js VOICES keys in sync).
const KANDINSKY_PALETTE = [
  '#F2C230', // yellow
  '#D63A2A', // vermilion red
  '#1E4D9B', // deep blue
  '#7FB3D5', // light blue
  '#6B4C9A', // violet
  '#E9A3A0', // soft pink
  '#E8822A', // orange
  '#3F8A5A', // green
  '#1B1B1B'  // black
]

class PaintSystem {
  constructor (w, h) {
    this.w = w
    this.h = h
    this.k = min(w, h) / 450

    this.targetX = w/2
    this.targetY = h/2
    this.cursorX = w/2
    this.cursorY = h/2
    this.cursorAge = 999
    this.cursorTimeout = 12
    this.smooth = 0.25

    this.penDown = false
    this.penX = 0
    this.penY = 0
    this.midX = 0
    this.midY = 0
    this.minStep = 1
    this.maxJump = 120 * this.k

    this.stampX = w/2
    this.stampY = h/2

    // last fingertip actually seen (used for placing shapes)
    this.lastTipX = w/2
    this.lastTipY = h/2
    this.lastTipTime = -99999
    this.stampMemory = 1000 // ms

    this.currentTool = "none"
    this.brushMode = "thin"
    this.isDrawing = false
    this.lastLabel = ""
    this.canvasArmed = false
    this.paperCount = 0
    this.paperCooldown = 0
    this.paperReady = true
    this.paperFrames = 4

    this.cirStamp = false
    this.squStamp = false
    this.triStamp = false

    // the score
    this.marks = []          // shapes: { type, x, y, size, col }
    this.strokes = []        // pencil: { pts: [{x,y}], minX, maxX, lastHit }
    this.currentStroke = null
    this.lastLiveTick = 0
    this.flashes = []

    this.bg = color('#F6F0D8')

    this.layer = createGraphics(w, h)
    this.layer.clear()
  }

  resize(w, h) {
    let sx = w / this.w
    let sy = h / this.h

    let old = this.layer
    this.layer = createGraphics(w, h)
    if (this.canvasArmed) {
      this.layer.background(this.bg)
      this.layer.image(old, 0, 0, w, h)
    }
    old.remove()

    // keep the score lined up with the stretched painting
    for (let m of this.marks) { m.x *= sx; m.y *= sy }
    this.lastTipX *= sx; this.lastTipY *= sy
    for (let st of this.strokes) {
      for (let p of st.pts) { p.x *= sx; p.y *= sy }
      st.minX *= sx; st.maxX *= sx
    }

    this.w = w
    this.h = h
    this.k = min(w, h) / 450
    this.maxJump = 120 * this.k
  }

  brushWeight() {
    return max(2, (this.brushMode === "thin" ? 2 : 6) * this.k)
  }

  pickHex() {
    return random(KANDINSKY_PALETTE)
  }

  withAlpha(hex, alpha) {
    let c = color(hex)
    c.setAlpha(alpha)
    return c
  }

  setTarget(x, y) {
    x = constrain(x, 0, this.w)
    y = constrain(y, 0, this.h)

    if (!this.hasFreshCursor()) {
      this.cursorX = x
      this.cursorY = y
      this.penDown = false
    }

    this.targetX = x
    this.targetY = y
    this.cursorAge = 0

    this.lastTipX = x
    this.lastTipY = y
    this.lastTipTime = millis()
  }

  update() {
    this.cursorAge++
    this.cursorX = lerp(this.cursorX, this.targetX, this.smooth)
    this.cursorY = lerp(this.cursorY, this.targetY, this.smooth)
  }

  hasFreshCursor() {
    return this.cursorAge <= this.cursorTimeout
  }

  latchStampPos() {
    // fingertip seen within the last second → use where it was; otherwise center
    if (millis() - this.lastTipTime < this.stampMemory) {
      this.stampX = this.lastTipX
      this.stampY = this.lastTipY
    } else {
      this.stampX = this.w/2
      this.stampY = this.h/2
    }
  }

  // add a shape to the score, sound it now, flash it
  addMark(type, x, y, size, col) {
    let m = { type, x, y, size, col }
    this.marks.push(m)
    Sound.playMark(m, this.h, this.k)
    this.flash(x, y, size)
  }

  flash(x, y, size) {
    this.flashes.push({ x, y, r: max(size, 16), t: millis() })
  }

  updateFromLabel(label, confidence) {
    if (confidence < 0.6) return

    if (label === "Paper" && confidence > 0.85) {
      this.paperCount++
    } else {
      this.paperCount = 0
      if (label !== "Paper") {
        this.paperReady = true
      }
    }

    if (this.paperCooldown > 0) {
      this.paperCooldown--
    }

    if (label === "Paper" && confidence > 0.85 && this.paperCount >= this.paperFrames && this.paperCooldown === 0 && this.paperReady) {
      this.canvasArmed = true
      this.layer.background(this.bg)
      this.currentTool = "none"
      this.isDrawing = false
      this.penDown = false

      // new paper = new score
      this.marks = []
      this.strokes = []
      this.currentStroke = null
      this.flashes = []

      this.paperCooldown = 30
      this.paperReady = false
    }

    if (label === "Pencil" && this.lastLabel !== "Pencil") {
      this.currentTool = "Pencil"
      this.isDrawing = true
      this.penDown = false
    }

    if (label === "Circle" && this.lastLabel !== "Circle") {
      this.currentTool = "Circle"
      this.isDrawing = true
      this.cirStamp = true
      this.latchStampPos()
    }

    if (label === "Square" && this.lastLabel !== "Square") {
      this.currentTool = "Square"
      this.isDrawing = true
      this.squStamp = true
      this.latchStampPos()
    }

    if (label === "Palm" && this.lastLabel !== "Palm") {
      this.currentTool = "Triangle"
      this.triStamp = true
      this.isDrawing = true
      this.latchStampPos()
    }

    if (label === "Fist" && this.lastLabel !== "Fist" && this.currentTool !== "none") {
      this.brushMode = (this.brushMode === "thin") ? "thick" : "thin"
    }

    if (label === "Sidehand") {
      this.isDrawing = false
      this.penDown = false
    }

    if (label === "Neither") {
      this.currentTool = "none"
      this.isDrawing = false
      this.penDown = false
    }

    this.lastLabel = label
  }

  render(video, fit) {
    if (!this.canvasArmed) return

    image(this.layer, 0, 0)

    let vw = video.width
    let vh = video.height
    let tw = constrain(this.w * 0.16, 120, 240)
    let th = tw * vh / vw
    let m = 16
    let tx = this.w - tw - m
    let ty = this.h - th - m

    push()
    tint(255, 220)
    image(video, tx, ty, tw, th)
    noTint()
    noFill()
    stroke(0)
    strokeWeight(1.5)
    rect(tx, ty, tw, th)

    if (this.hasFreshCursor()) {
      let vx = (this.cursorX - fit.ox) / fit.s
      let vy = (this.cursorY - fit.oy) / fit.s
      noStroke()
      fill(0)
      circle(tx + vx / vw * tw, ty + vy / vh * th, 5)
    }
    pop()
  }

  // rings that pulse out when a mark plays (screen only)
  drawFlashes() {
    if (!this.canvasArmed) return
    let now = millis()
    let life = 450

    push()
    noFill()
    for (let f of this.flashes) {
      let p = (now - f.t) / life
      if (p > 1) continue
      stroke(0, 140 * (1 - p))
      strokeWeight(2)
      circle(f.x, f.y, f.r * (1 + 0.5 * p))
    }
    pop()

    this.flashes = this.flashes.filter(f => now - f.t < life)
  }

  drawCursor() {
    if (!this.canvasArmed) return
    if (!this.hasFreshCursor()) return

    push()
    noFill()
    stroke(0, 150)
    strokeWeight(1.5)
    circle(this.cursorX, this.cursorY, 24)

    if (this.currentTool === "Pencil" && this.isDrawing) {
      noStroke()
      fill(0)
      circle(this.cursorX, this.cursorY, this.brushWeight() + 2)
    }
    pop()
  }

  // remember pencil points (sparsely) for playback
  recordStrokePoint(x, y) {
    let st = this.currentStroke
    if (!st) return
    let last = st.pts[st.pts.length - 1]
    if (last && dist(last.x, last.y, x, y) < 6) return
    st.pts.push({ x, y })
    st.minX = min(st.minX, x)
    st.maxX = max(st.maxX, x)
  }

  startStroke(x, y) {
    this.currentStroke = { pts: [{ x, y }], minX: x, maxX: x, lastHit: 0 }
    this.strokes.push(this.currentStroke)
  }

  paint() {
    if (!this.canvasArmed) return
    if (!this.isDrawing) return

    let bm = this.brushWeight()
    let L = this.layer

    // ---------- PENCIL ----------
    if (this.currentTool === "Pencil") {
      if (!this.hasFreshCursor()) {
        this.penDown = false
      } else {
        let x = this.cursorX
        let y = this.cursorY

        if (!this.penDown) {
          this.penX = x
          this.penY = y
          this.midX = x
          this.midY = y
          this.penDown = true
          this.startStroke(x, y)
        } else {
          let d = dist(this.penX, this.penY, x, y)

          if (d > this.maxJump) {
            this.penX = x
            this.penY = y
            this.midX = x
            this.midY = y
            this.startStroke(x, y)
          } else if (d >= this.minStep) {
            let mx = (this.penX + x) / 2
            let my = (this.penY + y) / 2

            L.push()
            L.noFill()
            L.stroke(0)
            L.strokeWeight(bm)
            L.strokeCap(ROUND)
            L.strokeJoin(ROUND)
            L.beginShape()
            L.vertex(this.midX, this.midY)
            L.quadraticVertex(this.penX, this.penY, mx, my)
            L.endShape()
            L.pop()

            this.recordStrokePoint(x, y)

            // soft ticks while drawing
            if (millis() - this.lastLiveTick > 140) {
              Sound.playLine(y, this.h)
              this.lastLiveTick = millis()
            }

            this.midX = mx
            this.midY = my
            this.penX = x
            this.penY = y
          }
        }
      }
    }

    // ---------- CIRCLE ----------
    if (this.currentTool === "Circle" && this.cirStamp) {
      this.cirStamp = false

      let hex = this.pickHex()
      L.push()
      L.fill(this.withAlpha(hex, 235))
      if (random() < 0.6) {
        L.noStroke()
      } else {
        L.stroke(0)
        L.strokeWeight(bm)
      }

      let d = random(15, 200) * this.k
      let x = constrain(this.stampX, d/2, this.w - d/2)
      let y = constrain(this.stampY, d/2, this.h - d/2)
      L.circle(x, y, d)
      L.pop()

      this.addMark("Circle", x, y, d, hex)
    }

    // ---------- SQUARE ----------
    if (this.currentTool === "Square" && this.squStamp) {
      this.squStamp = false

      let hex = this.pickHex()
      let filled = random() < 0.5
      L.push()
      if (filled) {
        L.noStroke()
        L.fill(this.withAlpha(hex, 225))
      } else {
        L.noFill()
        L.stroke(0)
        L.strokeWeight(bm)
      }

      let size = random(20, 190) * this.k
      let x = constrain(this.stampX - size/2, 0, this.w - size)
      let y = constrain(this.stampY - size/2, 0, this.h - size)
      L.square(x, y, size)
      L.pop()

      // outline-only = black = percussion
      this.addMark("Square", x + size/2, y + size/2, size, filled ? hex : '#1B1B1B')
    }

    // ---------- TRIANGLE ----------
    if (this.currentTool === "Triangle" && this.triStamp) {
      this.triStamp = false

      let hex = this.pickHex()
      let filled = random() < 0.7
      L.push()
      if (filled) {
        L.noStroke()
        L.fill(this.withAlpha(hex, 235))
      } else {
        L.noFill()
        L.stroke(0)
        L.strokeWeight(bm)
      }

      let s = random(30, 220) * this.k
      let x = constrain(this.stampX, s/2, this.w - s/2)
      let y = constrain(this.stampY, s/2, this.h - s/2)
      L.triangle(x, y - s/2, x - s/2, y + s/2, x + s/2, y + s/2)
      L.pop()

      this.addMark("Triangle", x, y, s, filled ? hex : '#1B1B1B')
    }
  }
}