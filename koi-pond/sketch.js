// Koi Pond — v2
// Click the water to release a koi.
// Sound button turns on the generated soundtrack.
// It rains on its own every couple of minutes.
// Keys (for documentation): S saves a PNG, R starts/stops rain.

let koilist = []
let leaflist = []
let ripples = []
let namecards = []
let water
let rain
let sound
let sunlight = 1 // dims shadows and caustics when it's overcast
let nextAmbient = 200
const MAX_KOI = 40

function setup() {
  createCanvas(windowWidth, windowHeight)
  pixelDensity(Math.min(2, displayDensity()))
  textAlign(CENTER, CENTER)
  describe('A top-down koi pond. Koi swim under moving light between lily pads. Clicking the water releases a new koi. Every so often it rains.')

  water = new Water()
  rain = new Rain()
  sound = new PondSound()
  placeLeaves()

  for (let i = 0; i < 3; i++) {
    const koi = new KoiFish(random(width * 0.25, width * 0.75), random(height * 0.25, height * 0.75), 0)
    koi.age = 60 // already visible at the start
    koilist.push(koi)
  }

  const btn = document.getElementById('soundBtn')
  if (btn) {
    btn.addEventListener('click', () => {
      const on = sound.toggle()
      btn.setAttribute('aria-pressed', on ? 'true' : 'false')
      document.getElementById('soundLabel').textContent = on ? 'Sound on' : 'Sound off'
    })
  }
}

// lily pads, spread out so they don't overlap
function placeLeaves() {
  leaflist = []
  const base = min(width, height)
  const count = constrain(round((width * height) / 120000), 4, 9)
  let tries = 0
  while (leaflist.length < count && tries < 400) {
    tries++
    const s = constrain(random(0.12, 0.2) * base, 56, 210)
    const x = random(s * 0.6, width - s * 0.6)
    const y = random(s * 0.6, height - s * 0.6)
    let ok = true
    for (const l of leaflist) {
      if (dist(x, y, l.pos.x, l.pos.y) < (s + l.size) * 0.5 + 12) {
        ok = false
        break
      }
    }
    if (ok) leaflist.push(new Leaf(x, y, s))
  }
}

function draw() {
  // ---- update
  water.update()
  rain.update(leaflist)
  sunlight = 1 - 0.65 * rain.intensity
  sound.setRain(rain.intensity)

  for (const leaf of leaflist) {
    leaf.update()
    leaf.highlighted = false
  }

  for (const koi of koilist) {
    koi.makeFriends(koilist)
    for (const leaf of leaflist) {
      if (leaf.isNear(koi)) {
        leaf.highlighted = true
        leaf.repel(koi)
      }
    }
    water.applyTo(koi)
    koi.swim()
  }

  for (const r of ripples) {
    r.update()
    for (const leaf of leaflist) leaf.disturb(r)
  }
  ripples = ripples.filter((r) => !r.done)

  // the odd drop on a clear day
  if (frameCount > nextAmbient) {
    if (rain.intensity < 0.2) {
      ripples.push(new Ripple(random(width), random(height), 0.35))
      sound.plop(0.3)
    }
    nextAmbient = frameCount + random(180, 360)
  }

  // ---- draw (back to front)
  water.display(sunlight)
  rain.displayShade()
  for (const leaf of leaflist) leaf.drawShadow()
  for (const koi of koilist) koi.drawShadow()
  for (const r of ripples) r.display()
  rain.displayWater()
  for (const leaf of leaflist) leaf.display(leaf.highlighted)
  rain.displayPads()
  for (const koi of koilist) koi.display(water)
  rain.displayStreaks()
  drawNamecards()
}

// variety name that floats next to a newly released koi
function drawNamecards() {
  const ctx = drawingContext
  ctx.save()
  for (const card of namecards) {
    card.life -= 0.005
    const a = Math.min(1, (1 - card.life) * 8) * Math.min(1, card.life / 0.35)
    const koi = card.koi
    const x = constrain(koi.pos.x + koi.len * 0.45, 12, width - 140)
    const y = constrain(koi.pos.y - koi.len * 0.45, 40, height - 20)

    ctx.strokeStyle = `rgba(235, 248, 242, ${0.4 * a})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(koi.pos.x + koi.len * 0.12, koi.pos.y - koi.len * 0.12)
    ctx.lineTo(x - 6, y + 4)
    ctx.stroke()

    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = `rgba(240, 248, 242, ${0.95 * a})`
    ctx.font = '20px "Shippori Mincho", "Hiragino Mincho ProN", serif'
    ctx.fillText(koi.variety.jp, x, y)
    ctx.font = '500 11px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif'
    ctx.fillStyle = `rgba(240, 248, 242, ${0.7 * a})`
    ctx.fillText(koi.variety.name.toUpperCase(), x, y + 16)
  }
  ctx.restore()
  namecards = namecards.filter((c) => c.life > 0)
}

// every click adds a new koi
function mousePressed(event) {
  // ignore clicks on the sound button and labels
  if (event && event.target && event.target.tagName !== 'CANVAS') return

  if (koilist.length >= MAX_KOI) koilist.shift()
  const koi = new KoiFish(mouseX, mouseY, random(-1, 1))
  koilist.push(koi)
  ripples.push(new Ripple(mouseX, mouseY, 1))
  namecards.push({ koi, life: 1 })
  sound.release()

  const hint = document.getElementById('hint')
  if (hint) hint.classList.add('gone')
  return false
}

function keyPressed() {
  if (key === 's' || key === 'S') saveCanvas('koi-pond', 'png')
  if (key === 'r' || key === 'R') rain.toggle()
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
  water.build()
  placeLeaves()
}
