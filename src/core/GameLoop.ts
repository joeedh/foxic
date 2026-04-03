const PHYSICS_DT = 1 / 60
const MAX_FRAME_TIME = 0.25 // prevent spiral of death

type UpdateFn = (dt: number) => void
type RenderFn = (interpolation: number) => void

export class GameLoop {
  private accumulator = 0
  private lastTime = 0
  private running = false
  private rafId = 0

  constructor(
    private onUpdate: UpdateFn,
    private onRender: RenderFn,
  ) {}

  start() {
    this.running = true
    this.lastTime = performance.now() / 1000
    this.tick()
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.rafId)
  }

  private tick = () => {
    if (!this.running) return
    this.rafId = requestAnimationFrame(this.tick)

    const now = performance.now() / 1000
    let frameTime = now - this.lastTime
    this.lastTime = now

    if (frameTime > MAX_FRAME_TIME) {
      frameTime = MAX_FRAME_TIME
    }

    this.accumulator += frameTime

    while (this.accumulator >= PHYSICS_DT) {
      this.onUpdate(PHYSICS_DT)
      this.accumulator -= PHYSICS_DT
    }

    const interpolation = this.accumulator / PHYSICS_DT
    this.onRender(interpolation)
  }
}
