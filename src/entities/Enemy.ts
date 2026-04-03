import { Sprite, Container } from "pixi.js";
import type { GameEntity, CollisionResult } from "../level/LevelLoader";
import { getEnemyFrame, applyChromaKey } from "../rendering/SpriteManager";

export abstract class Enemy implements GameEntity {
  x: number;
  y: number;
  width = 24;
  height = 24;
  active = true;
  protected sprite: Sprite;
  protected timer = 0;
  protected abstract enemyType: "crab" | "bee";

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    // Initial texture will be set by subclass in first render
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5, 0.5);
    this.sprite.width = 32;
    this.sprite.height = 32;
    applyChromaKey(this.sprite);
  }

  abstract update(dt: number): void;

  render() {
    if (!this.active) {
      this.sprite.visible = false;
      return;
    }
    this.sprite.visible = true;
    const frame = Math.floor(this.timer / 10) % 3;
    this.sprite.texture = getEnemyFrame(this.enemyType, frame);
    this.sprite.x = this.x;
    this.sprite.y = this.y;
  }

  onPlayerCollision(
    playerIsRolling: boolean,
    playerYSpeed: number,
    playerBottomY: number,
  ): CollisionResult | null {
    if (playerIsRolling && playerYSpeed > 0 && playerBottomY < this.y) {
      this.active = false;
      return { scorePoints: 100, setYSpeed: -4 };
    }
    return { hurtPlayer: true, scatterRings: true };
  }

  addToContainer(container: Container) {
    container.addChild(this.sprite);
  }

  destroy() {
    this.active = false;
  }
}
