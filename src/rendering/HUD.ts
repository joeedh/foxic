import type { WebGLRenderer } from './WebGLRenderer'
import { TextRenderer, type TextStyleDef } from './TextRenderer'

const hudStyle: TextStyleDef = {
  fontFamily : 'monospace',
  fontSize   : 16,
  fill       : '#ffffff',
  fontWeight : 'bold',
  stroke     : '#000000',
  strokeWidth: 3,
}

export class HUD {
  private textRenderer: TextRenderer
  private startTime = 0
  private scoreStr = 'SCORE: 0'
  private ringsStr = 'RINGS: 0'
  private timeStr = 'TIME: 0:00'
  private levelStr = ''

  constructor(renderer: WebGLRenderer) {
    this.textRenderer = new TextRenderer(renderer)
    this.startTime = performance.now()
  }

  reset() {
    this.startTime = performance.now()
  }

  update(score: number, rings: number, levelName: string) {
    this.scoreStr = `SCORE: ${score}`
    this.ringsStr = `RINGS: ${rings}`
    this.levelStr = levelName

    const elapsed = Math.floor((performance.now() - this.startTime) / 1000)
    const mins = Math.floor(elapsed / 60)
    const secs = elapsed % 60
    this.timeStr = `TIME: ${mins}:${secs.toString().padStart(2, '0')}`
  }

  render(_renderer: WebGLRenderer) {
    this.textRenderer.drawText(this.scoreStr, hudStyle, 10, 10)
    this.textRenderer.drawText(this.ringsStr, hudStyle, 10, 30)
    this.textRenderer.drawText(this.timeStr, hudStyle, 350, 10)
    this.textRenderer.drawText(this.levelStr, hudStyle, 350, 30)
  }
}
