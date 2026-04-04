import { WebGLRenderer, type GLTexture } from "./WebGLRenderer"

export interface TextStyleDef {
  fontFamily: string
  fontSize: number
  fill: string
  fontWeight?: string
  stroke?: string
  strokeWidth?: number
}

interface CachedText {
  texture: GLTexture
  width: number
  height: number
}

const MAX_CACHE = 64

export class TextRenderer {
  private renderer: WebGLRenderer
  private cache = new Map<string, CachedText>()
  private offscreen: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer
    this.offscreen = document.createElement("canvas")
    this.ctx = this.offscreen.getContext("2d")!
  }

  private makeKey(text: string, style: TextStyleDef): string {
    return `${text}|${style.fontFamily}|${style.fontSize}|${style.fill}|${style.fontWeight ?? ""}|${style.stroke ?? ""}|${style.strokeWidth ?? 0}`
  }

  private renderToTexture(text: string, style: TextStyleDef): CachedText {
    const ctx = this.ctx
    const font = `${style.fontWeight ?? "normal"} ${style.fontSize}px ${style.fontFamily}`
    ctx.font = font

    const metrics = ctx.measureText(text)
    const w = Math.ceil(metrics.width) + 4
    const h = Math.ceil(style.fontSize * 1.4) + 4

    this.offscreen.width = w
    this.offscreen.height = h

    ctx.font = font
    ctx.textBaseline = "top"
    ctx.clearRect(0, 0, w, h)

    if (style.stroke && style.strokeWidth) {
      ctx.strokeStyle = style.stroke
      ctx.lineWidth = style.strokeWidth
      ctx.lineJoin = "round"
      ctx.strokeText(text, 2, 2)
    }

    ctx.fillStyle = style.fill
    ctx.fillText(text, 2, 2)

    const key = this.makeKey(text, style)
    const existing = this.cache.get(key)
    let texture: GLTexture

    if (existing) {
      this.renderer.updateTextureFromCanvas(existing.texture, this.offscreen)
      texture = existing.texture
    } else {
      // Evict oldest entry if cache is full
      if (this.cache.size >= MAX_CACHE) {
        const oldestKey = this.cache.keys().next().value!
        const evicted = this.cache.get(oldestKey)!
        this.renderer.deleteTexture(evicted.texture)
        this.cache.delete(oldestKey)
      }
      texture = this.renderer.createTextureFromCanvas(this.offscreen)
    }

    const entry: CachedText = { texture, width: w, height: h }
    this.cache.set(key, entry)
    return entry
  }

  drawText(
    text: string,
    style: TextStyleDef,
    x: number,
    y: number,
    anchorX: number = 0,
    anchorY: number = 0,
  ): void {
    const key = this.makeKey(text, style)
    let cached = this.cache.get(key)

    if (!cached) {
      cached = this.renderToTexture(text, style)
    }

    const drawX = x - cached.width * anchorX
    const drawY = y - cached.height * anchorY

    this.renderer.drawSprite(
      cached.texture,
      drawX,
      drawY,
      cached.width,
      cached.height,
      0,
      0,
      1,
      1,
    )
  }
}
