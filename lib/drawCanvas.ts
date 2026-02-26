export const CANVAS_WIDTH = 400
export const CANVAS_HEIGHT = 150

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
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  ctx.fillStyle = '#FFD700'
  ctx.font = 'bold 28px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`Hello World — ${new Date().toLocaleTimeString()}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
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
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  ctx.fillStyle = '#aaaaaa'
  ctx.font = 'bold 28px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Scanning...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
}

export function drawConnectionLost(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#8b0000'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 28px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Connection Lost', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
}
