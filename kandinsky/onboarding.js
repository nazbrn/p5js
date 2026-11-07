// Kandinsky Cam Paint — v6 onboarding
// Faint hints drawn over the camera before the paper appears.
// No buttons: everything here is just visual. It fades out once Paper arms the canvas.

let hintAlpha = 1 // 0..1, eased every frame

const HINTS = [
  { show: "Paper",       does: "start / reset", icon: "paper" },
  { show: "Circle",      does: "circle",        icon: "circle" },
  { show: "Square",      does: "square",        icon: "square" },
  { show: "Pencil",      does: "line that follows your finger", icon: "line" },
  { show: "Open palm",   does: "triangle",      icon: "triangle" },
  { show: "Fist",        does: "thin / thick",  icon: "weight" }
]

function drawOnboarding(painter) {
  let target = painter.canvasArmed ? 0 : 1
  hintAlpha = lerp(hintAlpha, target, 0.08)
  if (hintAlpha < 0.01) return

  let k = min(width, height) / 450
  let a = hintAlpha

  push()

  // soft dark wash so the text reads on top of the camera
  noStroke()
  fill(0, 110 * a)
  rect(0, 0, width, height)

  // title
  textAlign(CENTER, CENTER)
  fill(246, 240, 216, 255 * a)
  textSize(28 * k)
  textStyle(BOLD)
  text("Show paper to begin", width / 2, height * 0.32)

  textStyle(NORMAL)
  textSize(13 * k)
  fill(246, 240, 216, 190 * a)
  text("Then use objects and gestures to paint. Your index finger chooses where.", width / 2, height * 0.32 + 30 * k)
  text("Your painting plays as music: height is pitch, color is the instrument.", width / 2, height * 0.32 + 50 * k)

  if (!Sound.ready()) {
    fill(KANDINSKY_PALETTE[0])
    text("Click anywhere once to turn on sound", width / 2, height * 0.32 + 74 * k)
  }

  // paper hold progress (fills while the camera is confirming Paper)
  let p = constrain(painter.paperCount / painter.paperFrames, 0, 1)
  if (p > 0 && !painter.canvasArmed) {
    noFill()
    stroke(246, 240, 216, 80 * a)
    strokeWeight(3 * k)
    circle(width / 2, height * 0.32 + 110 * k, 30 * k)
    stroke(KANDINSKY_PALETTE[0])
    arc(width / 2, height * 0.32 + 110 * k, 30 * k, 30 * k, -HALF_PI, -HALF_PI + TWO_PI * p)
  }

  // hint row
  let n = HINTS.length
  let margin = 24 * k
  let cardW = min(130 * k, (width - margin * 2) / n)
  let rowW = cardW * n
  let startX = (width - rowW) / 2
  let iconY = height * 0.62
  let iconS = min(34 * k, cardW * 0.4)

  for (let i = 0; i < n; i++) {
    let h = HINTS[i]
    let cx = startX + cardW * i + cardW / 2

    drawHintIcon(h.icon, cx, iconY, iconS, a)

    noStroke()
    textAlign(CENTER, TOP)
    textStyle(BOLD)
    textSize(12 * k)
    fill(246, 240, 216, 235 * a)
    text(h.show, cx, iconY + iconS * 0.9)

    textStyle(NORMAL)
    textSize(10.5 * k)
    fill(246, 240, 216, 170 * a)
    text(h.does, cx - cardW / 2 + 6, iconY + iconS * 0.9 + 17 * k, cardW - 12)
  }

  pop()
}

// small icons showing the MARK each input makes
function drawHintIcon(type, x, y, s, a) {
  push()
  translate(x, y)
  let cream = color(246, 240, 216, 235 * a)
  let alphaOf = (hex) => { let c = color(hex); c.setAlpha(235 * a); return c }

  if (type === "paper") {
    noStroke()
    fill(cream)
    rect(-s * 0.4, -s * 0.5, s * 0.8, s)
    fill(0, 60 * a)
    triangle(s * 0.15, -s * 0.5, s * 0.4, -s * 0.5, s * 0.4, -s * 0.25)
  }

  if (type === "circle") {
    noStroke()
    fill(alphaOf(KANDINSKY_PALETTE[2]))
    circle(0, 0, s)
  }

  if (type === "square") {
    noStroke()
    fill(alphaOf(KANDINSKY_PALETTE[1]))
    rectMode(CENTER)
    square(0, 0, s * 0.85)
  }

  if (type === "triangle") {
    noStroke()
    fill(alphaOf(KANDINSKY_PALETTE[0]))
    triangle(0, -s / 2, -s / 2, s / 2, s / 2, s / 2)
  }

  if (type === "line") {
    noFill()
    stroke(cream)
    strokeWeight(2.5)
    strokeCap(ROUND)
    beginShape()
    vertex(-s / 2, s * 0.3)
    quadraticVertex(-s * 0.1, -s * 0.6, s / 2, -s * 0.2)
    endShape()
  }

  if (type === "weight") {
    stroke(cream)
    strokeCap(ROUND)
    strokeWeight(1.5)
    line(-s / 2, -s * 0.2, s / 2, -s * 0.2)
    strokeWeight(6)
    line(-s / 2, s * 0.25, s / 2, s * 0.25)
  }

  pop()
}