export const CANVAS_WIDTH = 400
export const CANVAS_HEIGHT = 300

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const { width } = ctx.measureText(testLine)
    if (width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

export function drawHello(ctx: CanvasRenderingContext2D): void {
  const { width, height } = ctx.canvas
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#FFD700'
  ctx.font = 'bold 28px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`Hello World — ${new Date().toLocaleTimeString()}`, width / 2, height / 2)
}

export function drawInstruction(
  ctx: CanvasRenderingContext2D,
  instruction: string,
  step: number,
  totalSteps: number,
): void {
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  const padding = 16
  const maxWidth = CANVAS_WIDTH - padding * 2
  const progressBarHeight = 8
  const textAreaHeight = CANVAS_HEIGHT - progressBarHeight

  ctx.fillStyle = '#FFD700'
  ctx.font = 'bold 24px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const lines = wrapText(ctx, instruction, maxWidth)
  const lineHeight = 30
  const totalTextHeight = lines.length * lineHeight
  const startY = (textAreaHeight - totalTextHeight) / 2 + lineHeight / 2

  lines.forEach((line, i) => {
    ctx.fillText(line, CANVAS_WIDTH / 2, startY + i * lineHeight)
  })

  // Progress bar background
  ctx.fillStyle = '#333333'
  ctx.fillRect(0, CANVAS_HEIGHT - progressBarHeight, CANVAS_WIDTH, progressBarHeight)

  // Progress bar fill
  const progress = step / totalSteps
  ctx.fillStyle = '#FFD700'
  ctx.fillRect(0, CANVAS_HEIGHT - progressBarHeight, CANVAS_WIDTH * progress, progressBarHeight)
}

export function drawScanning(ctx: CanvasRenderingContext2D): void {
  const { width, height } = ctx.canvas
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#aaaaaa'
  ctx.font = 'bold 28px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Scanning...', width / 2, height / 2)
}

const ZOOM_CYCLE_MS = 6400

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

function getZoomedCrop(
  target: { x: number; y: number; width: number; height: number },
  vw: number,
  vh: number,
  canvasAR: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const tx = target.x * vw
  const ty = target.y * vh
  const tw = target.width * vw
  const th = target.height * vh

  // Padding: 100% of the target's own size on each side, minimum 80px
  const padX = Math.max(tw, 80)
  const padY = Math.max(th, 80)

  let sx = tx - padX
  let sy = ty - padY
  let sw = tw + padX * 2
  let sh = th + padY * 2

  // Expand whichever axis is too short to match the canvas aspect ratio
  if (sw / sh < canvasAR) {
    const newSw = sh * canvasAR
    sx -= (newSw - sw) / 2
    sw = newSw
  } else {
    const newSh = sw / canvasAR
    sy -= (newSh - sh) / 2
    sh = newSh
  }

  // Clamp so the crop stays inside the video
  sw = Math.min(sw, vw)
  sh = Math.min(sh, vh)
  sx = Math.max(0, Math.min(sx, vw - sw))
  sy = Math.max(0, Math.min(sy, vh - sh))

  return { sx, sy, sw, sh }
}

export function drawOverviewWithBox(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  target: { x: number; y: number; width: number; height: number },
  label: string,
): void {
  const { width, height } = ctx.canvas
  const vw = video.videoWidth || width
  const vh = video.videoHeight || height

  // Animation: cycle between full-screen view and zoomed-in view
  // Phase:  0–15% hold full  |  15–50% zoom in  |  50–65% hold zoom  |  65–100% zoom out
  const phase = (Date.now() % ZOOM_CYCLE_MS) / ZOOM_CYCLE_MS
  let zoomT: number
  if (phase < 0.15) {
    zoomT = 0
  } else if (phase < 0.50) {
    zoomT = easeInOut((phase - 0.15) / 0.35)
  } else if (phase < 0.65) {
    zoomT = 1
  } else {
    zoomT = 1 - easeInOut((phase - 0.65) / 0.35)
  }

  // Interpolate source crop: full-screen → zoomed crop
  const zoom = getZoomedCrop(target, vw, vh, width / height)
  const iSx = zoom.sx * zoomT
  const iSy = zoom.sy * zoomT
  const iSw = vw + (zoom.sw - vw) * zoomT
  const iSh = vh + (zoom.sh - vh) * zoomT

  ctx.drawImage(video, iSx, iSy, iSw, iSh, 0, 0, width, height)

  // Map target bounding box from video space into the current cropped view
  const scaleX = width / iSw
  const scaleY = height / iSh
  const boxX = (target.x * vw - iSx) * scaleX
  const boxY = (target.y * vh - iSy) * scaleY
  const boxW = target.width * vw * scaleX
  const boxH = target.height * vh * scaleY

  // Draw crosshair/reticle symbol centered on the element
  const cx = boxX + boxW / 2
  const cy = boxY + boxH / 2
  const r = Math.max(Math.min(boxW, boxH) * 0.35, height * 0.04)
  const lineLen = r * 0.65
  const gap = r * 0.2
  const lw = Math.max(Math.round(height / 120), 2)

  ctx.strokeStyle = '#00bfff'
  ctx.lineWidth = lw

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(cx, cy - r - gap - lineLen)
  ctx.lineTo(cx, cy - r - gap)
  ctx.moveTo(cx, cy + r + gap)
  ctx.lineTo(cx, cy + r + gap + lineLen)
  ctx.moveTo(cx - r - gap - lineLen, cy)
  ctx.lineTo(cx - r - gap, cy)
  ctx.moveTo(cx + r + gap, cy)
  ctx.lineTo(cx + r + gap + lineLen, cy)
  ctx.stroke()

  // Label bar — proportionally sized so text is readable in the PiP window
  const fontSize = Math.round(height * 0.045)
  const barHeight = fontSize * 2
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)'
  ctx.fillRect(0, height - barHeight, width, barHeight)

  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const lines = wrapText(ctx, label, width * 0.9)
  const lineHeight = fontSize * 1.25
  const totalTextHeight = lines.length * lineHeight
  const startY = height - barHeight + (barHeight - totalTextHeight) / 2 + lineHeight / 2
  lines.forEach((line, i) => ctx.fillText(line, width / 2, startY + i * lineHeight))
}

export function drawConnectionLost(ctx: CanvasRenderingContext2D): void {
  const { width, height } = ctx.canvas
  ctx.fillStyle = '#8b0000'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 28px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Connection Lost', width / 2, height / 2)
}
