import type { WebGLRenderer } from '../rendering/WebGLRenderer'

export interface Scene {
  enter(): void
  exit(): void
  update(dt: number): void
  render(interpolation: number, renderer: WebGLRenderer): void
}

export class SceneManager {
  private currentScene: Scene | null = null

  constructor(private renderer: WebGLRenderer) {}

  switchTo(scene: Scene) {
    if (this.currentScene) {
      this.currentScene.exit()
    }
    this.currentScene = scene
    scene.enter()
  }

  update(dt: number) {
    this.currentScene?.update(dt)
  }

  render(interpolation: number) {
    this.currentScene?.render(interpolation, this.renderer)
  }
}
