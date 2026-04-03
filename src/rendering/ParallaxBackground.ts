import { Container, Sprite, Texture } from "pixi.js";
import { SCREEN_WIDTH, SCREEN_HEIGHT } from "../constants";
import { backgrounds } from "./SpriteManager";

interface Layer {
  sprite: Sprite;
  speedFactor: number;
}

export class ParallaxBackground {
  container: Container;
  private layers: Layer[] = [];

  constructor(levelName?: string) {
    this.container = new Container();
    this.createLayers(levelName);
  }

  private createLayers(levelName?: string) {
    const bgKey = levelName === "Mechanical Plant" ? "industrial" : "greenhill";
    const bgTexture: Texture | undefined = backgrounds[bgKey];

    if (bgTexture) {
      // Use the generated background as a single large parallax layer
      // The image has 3 visual bands (top/mid/bottom) that we show as one
      const bg = new Sprite(bgTexture);
      bg.width = SCREEN_WIDTH * 2;
      bg.height = SCREEN_HEIGHT;
      this.container.addChild(bg);
      this.layers.push({ sprite: bg, speedFactor: 0.2 });

      // Duplicate for seamless scrolling
      const bg2 = new Sprite(bgTexture);
      bg2.width = SCREEN_WIDTH * 2;
      bg2.height = SCREEN_HEIGHT;
      bg2.x = SCREEN_WIDTH * 2;
      this.container.addChild(bg2);
      this.layers.push({ sprite: bg2, speedFactor: 0.2 });
    }
  }

  update(cameraX: number, _cameraY: number) {
    for (const layer of this.layers) {
      const baseX = -cameraX * layer.speedFactor;
      const tileWidth = SCREEN_WIDTH * 2;
      // Wrap horizontally
      layer.sprite.x =
        ((baseX + layer.sprite.x * 0) % tileWidth) -
        (baseX < 0 ? tileWidth - (-baseX % tileWidth) : 0);
      layer.sprite.x = baseX % tileWidth;
      if (layer.sprite.x > 0) {
        layer.sprite.x -= tileWidth;
      }
    }
    // Keep the second copy offset
    if (this.layers.length >= 2) {
      this.layers[1].sprite.x = this.layers[0].sprite.x + SCREEN_WIDTH * 2;
    }
  }
}
