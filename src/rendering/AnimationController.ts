export interface AnimationDef {
  frames: string[]
  /** Ticks between frame advances at speedMultiplier=1 */
  ticksPerFrame: number
  loop: boolean
}

export class AnimationController {
  private currentAnim: string = ''
  private tickCounter = 0
  private frameIndex = 0
  private animations = new Map<string, AnimationDef>()
  private speedMultiplier = 1

  define(name: string, def: AnimationDef) {
    this.animations.set(name, def)
  }

  play(name: string) {
    if (name === this.currentAnim) return
    this.currentAnim = name
    this.tickCounter = 0
    this.frameIndex = 0
  }

  setSpeedMultiplier(mult: number) {
    this.speedMultiplier = mult
  }

  update() {
    const anim = this.animations.get(this.currentAnim)
    if (!anim || anim.frames.length <= 1) return

    this.tickCounter++
    const threshold = Math.max(
      1,
      Math.round(anim.ticksPerFrame / this.speedMultiplier),
    )
    if (this.tickCounter >= threshold) {
      this.tickCounter = 0
      this.frameIndex++
      if (this.frameIndex >= anim.frames.length) {
        this.frameIndex = anim.loop ? 0 : anim.frames.length - 1
      }
    }
  }

  getCurrentFrame(): string {
    const anim = this.animations.get(this.currentAnim)
    if (!anim || anim.frames.length === 0) return ''
    return anim.frames[this.frameIndex]
  }
}
