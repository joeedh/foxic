import { SCREEN_WIDTH, SCREEN_HEIGHT } from "../constants"
import { backgroundTextures } from "./AssetLoader"
import type { GLTexture } from "./WebGLRenderer"
import type { WebGLRenderer } from "./WebGLRenderer"

export class ParallaxBackground {
  private bgTexture: GLTexture | null = null
  private speedFactor = 0.2
  private layer0X = 0
  private layer1X = 0

  constructor(levelName?: string) {
    const bgKey = levelName === "Mechanical Plant" ? "industrial" : "greenhill"
    this.bgTexture = backgroundTextures[bgKey] ?? null
  }

  update(cameraX: number, _cameraY: number) {
    if (!this.bgTexture) return
    const tileWidth = SCREEN_WIDTH * 2
    const baseX = -cameraX * this.speedFactor
    this.layer0X = baseX % tileWidth
    if (this.layer0X > 0) {
      this.layer0X -= tileWidth
    }
    this.layer1X = this.layer0X + tileWidth
  }

  render(renderer: WebGLRenderer) {
    if (!this.bgTexture) return
    const w = SCREEN_WIDTH * 2
    renderer.drawSprite(this.bgTexture, this.layer0X, 0, w, SCREEN_HEIGHT, 0, 0, 1, 1)
    renderer.drawSprite(this.bgTexture, this.layer1X, 0, w, SCREEN_HEIGHT, 0, 0, 1, 1)
  }
}
