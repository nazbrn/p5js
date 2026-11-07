// Kandinsky Cam Paint — v8
// v8: hand tracking follows one hand only (maxHands: 1)
// v7 notes:
// Changes from v6:
//  - One threshold table for every label (Palm and Fist raised from 60% to 90%)
//  - A label only counts after the model says it HOLD_FRAMES times in a row
//    (one-frame flickers no longer stamp extra shapes or break pencil strokes)

let painter

let classifier
let imageModelURL = "https://teachablemachine.withgoogle.com/models/bsD922vsr/"
let video
let label = ""

let handposemodel
let hands = []

// how sure the model must be before a reading counts (0–1). Tweak freely.
const THRESHOLDS = {
  Paper:    0.95,
  Circle:   0.95,
  Square:   0.95,
  Pencil:   0.95,
  Palm:     0.90,
  Fist:     0.90,
  Sidehand: 0.85,
  Neither:  0.85
}
const DEFAULT_THRESHOLD = 0.9

// how many confident readings in a row before a label counts (~5 ≈ a quarter second)
const HOLD_FRAMES = 5

let candidate = ""      // label currently being confirmed
let candidateCount = 0
let stableLabel = ""    // last confirmed label (what the painter acts on)

// camera resolution (same as v2/v3, so the model behaves the same)
let vw = 800
let vh = 450

function preload() {
  classifier = ml5.imageClassifier(imageModelURL + "model.json")
  handposemodel = ml5.handPose({ flipped: true, maxHands: 1 })
}

function setup() {
  createCanvas(windowWidth, windowHeight)

  video = createCapture(VIDEO, { flipped: true })
  video.size(vw, vh)
  video.hide()

  painter = new PaintSystem(width, height)

  classifier.classifyStart(video, gotResult)
  handposemodel.detectStart(video, gotHandsResults)

  // sound: browsers only allow audio after one click / key press / tap on the page
  Sound.init()
  Sound.unlock()
  for (let ev of ['pointerdown', 'keydown', 'touchstart']) {
    window.addEventListener(ev, () => Sound.unlock(), { passive: true })
  }
}

// how the camera image is scaled to fill the window (like CSS "cover")
function videoFit() {
  let s = max(width / vw, height / vh)
  return { s: s, ox: (width - vw * s) / 2, oy: (height - vh * s) / 2 }
}

function draw() {
  background(0)
  let fit = videoFit()

  // before the paper appears, show the camera full screen
  if (!painter.canvasArmed) {
    image(video, fit.ox, fit.oy, vw * fit.s, vh * fit.s)
  }

  if (hands[0] && hands[0].index_finger_tip) {
    let tip = hands[0].index_finger_tip
    painter.setTarget(tip.x * fit.s + fit.ox, tip.y * fit.s + fit.oy)
  }

  painter.update()            // ease the cursor toward the fingertip
  painter.paint()             // new marks onto the paper
  updatePlayhead(painter)     // play marks the playhead passes (sound.js)

  painter.render(video, fit)  // paper + camera thumbnail
  drawPlayhead(painter)       // faint sweeping line
  painter.drawFlashes()       // rings on marks that just played
  painter.drawCursor()        // fingertip ring on top

  drawOnboarding(painter)     // faint hints before the paper appears (onboarding.js)

  // current label (debug), subtle
  noStroke()
  fill(painter.canvasArmed ? color(0, 90) : color(255))
  textSize(14)
  textAlign(LEFT, BOTTOM)
  text(label, 16, height - 12)

  // sound still locked by the browser: quiet reminder on the paper
  if (painter.canvasArmed && !Sound.ready()) {
    fill(0, 120)
    textAlign(RIGHT, TOP)
    text("click anywhere once for sound", width - 16, 14)
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
  painter.resize(width, height)
}

function gotResult(results, error) {
  if (error) {
    console.error(error)
    return
  }

  let newLabel = results[0].label
  let conf = results[0].confidence
  let needed = THRESHOLDS[newLabel] ?? DEFAULT_THRESHOLD

  // confident reading: count it toward confirming this label
  // unsure reading: ignore it (doesn't count, doesn't reset)
  if (conf >= needed) {
    if (newLabel === candidate) {
      candidateCount++
    } else {
      candidate = newLabel
      candidateCount = 1
    }

    if (candidateCount >= HOLD_FRAMES) {
      stableLabel = candidate
    }
  }

  label = stableLabel

  // the painter only ever sees confirmed labels
  if (stableLabel !== "") {
    painter.updateFromLabel(stableLabel, 1)
  }
}

function gotHandsResults(results, error) {
  if (error) {
    console.error(error)
    return
  }
  hands = results
}