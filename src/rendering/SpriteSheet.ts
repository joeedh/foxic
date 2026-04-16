import type { Texture } from './WebGL/texture'

export interface Frame {
  texture: Texture
  u0: number
  v0: number
  u1: number
  v1: number
}

export interface SheetDef {
  cols: number
  rows: number
  frameNames: string[]
  animations?: Record<string, string[]>
  borderTrim?: number
}

export class SpriteSheet {
  frames: Record<string, Frame> = {}
  animations: Record<string, Frame[]> = {}

  constructor(texture: Texture, def: SheetDef) {
    const { cols, rows, frameNames } = def

    const p = def.borderTrim ?? 0
    const px = p / texture.width
    const py = p / texture.height

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col
        if (idx >= frameNames.length) break
        this.frames[frameNames[idx]] = {
          texture,
          u0: col / cols + px,
          v0: row / rows + py,
          u1: (col + 1) / cols - px * 2.0,
          v1: (row + 1) / rows - py * 2.0,
        }
      }
    }

    if (def.animations) {
      for (const [name, frameList] of Object.entries(def.animations)) {
        this.animations[name] = frameList.map((fn) => this.frames[fn])
      }
    }
  }
}
