import { Application, Container } from "pixi.js";

export interface Scene {
  container: Container;
  enter(): void;
  exit(): void;
  update(dt: number): void;
  render(interpolation: number): void;
}

export class SceneManager {
  private currentScene: Scene | null = null;

  constructor(private app: Application) {}

  switchTo(scene: Scene) {
    if (this.currentScene) {
      this.currentScene.exit();
      this.app.stage.removeChild(this.currentScene.container);
    }
    this.currentScene = scene;
    this.app.stage.addChild(scene.container);
    scene.enter();
  }

  update(dt: number) {
    this.currentScene?.update(dt);
  }

  render(interpolation: number) {
    this.currentScene?.render(interpolation);
  }
}
