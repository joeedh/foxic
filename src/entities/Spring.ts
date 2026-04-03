import { Sprite, Container } from "pixi.js";
import type { GameEntity, CollisionResult } from "../level/LevelLoader";
import { getSpringFrame, applyChromaKey } from "../rendering/SpriteManager";

export class Spring implements GameEntity {
  x: number;
  y: number;
  width = 16;
  height = 16;
  active = true;
  private sprite: Sprite;
  force: number;
  private compressed = false;
  private compressTimer = 0;
  private color: "yellow" | "red";

  constructor(x: number, y: number, force: number) {
    this.x = x;
    this.y = y;
    this.force = force;
    this.color = force < -11 ? "red" : "yellow";
    this.sprite = new Sprite(getSpringFrame(this.color, false));
    this.sprite.anchor.set(0.5, 0.5);
    this.sprite.width = 20;
    this.sprite.height = 20;
    applyChromaKey(this.sprite);
  }

  trigger() {
    this.compressed = true;
    this.compressTimer = 10;
  }

  update(_dt: number) {
    if (this.compressTimer > 0) {
      this.compressTimer--;
      if (this.compressTimer === 0) {
        this.compressed = false;
      }
    }
  }

  render() {
    this.sprite.texture = getSpringFrame(this.color, this.compressed);
    this.sprite.x = this.x;
    this.sprite.y = this.y;
  }

  onPlayerCollision(
    _playerIsRolling: boolean,
    playerYSpeed: number,
  ): CollisionResult | null {
    if (playerYSpeed >= 0) {
      this.trigger();
      return { setYSpeed: this.force, detachFromGround: true };
    }
    return null;
  }

  addToContainer(container: Container) {
    container.addChild(this.sprite);
  }
}
