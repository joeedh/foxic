import {
  Assets,
  Texture,
  Spritesheet,
  type SpritesheetData,
  type Sprite,
} from "pixi.js";
import { ChromaKeyFilter } from "./ChromaKeyFilter";

/**
 * Build SpritesheetData JSON for a uniform grid spritesheet,
 * with named frames and optional animation groups.
 */
function buildSheetData(
  width: number,
  height: number,
  cols: number,
  rows: number,
  frameNames: string[],
  animations?: Record<string, string[]>,
): SpritesheetData {
  const fw = Math.floor(width / cols);
  const fh = Math.floor(height / rows);
  const frames: SpritesheetData["frames"] = {};

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      if (idx >= frameNames.length) break;
      frames[frameNames[idx]] = {
        frame: { x: col * fw, y: row * fh, w: fw, h: fh },
        sourceSize: { w: fw, h: fh },
        spriteSourceSize: { x: 0, y: 0, w: fw, h: fh },
      };
    }
  }

  return {
    frames,
    animations,
    meta: { scale: 1 },
  };
}

// Parsed spritesheets
let playerSheet: Spritesheet;
let enemiesSheet: Spritesheet;
let itemsSheet: Spritesheet;

export const backgrounds: Record<string, Texture> = {};

/** Shared chroma key filter — magenta (#FF00FF) to transparent */
const chromaFilter = new ChromaKeyFilter([1.0, 0.0, 1.0], 0.45);

/** Apply chroma key filter to a sprite to remove magenta background */
export function applyChromaKey(sprite: Sprite) {
  sprite.filters = [chromaFilter];
}

export async function loadAllAssets() {
  // Load sprite sheet textures
  const [playerTex, enemiesTex, itemsTex] = await Promise.all([
    Assets.load<Texture>("/assets/sprites/player_spritesheet.jpg"),
    Assets.load<Texture>("/assets/sprites/enemies_spritesheet.jpg"),
    Assets.load<Texture>("/assets/sprites/items_spritesheet.jpg"),
  ]);

  // Player: 4x2 grid, 8 frames
  playerSheet = new Spritesheet(
    playerTex,
    buildSheetData(
      playerTex.width,
      playerTex.height,
      4,
      2,
      ["idle", "run1", "run2", "run3", "jump", "crouch", "skid", "push"],
      {
        idle: ["idle"],
        run: ["run1", "run2", "run3", "run2"],
        jump: ["jump"],
        crouch: ["crouch"],
        skid: ["skid"],
        push: ["push"],
      },
    ),
  );
  await playerSheet.parse();

  // Enemies: 3x2 grid, 6 frames
  enemiesSheet = new Spritesheet(
    enemiesTex,
    buildSheetData(
      enemiesTex.width,
      enemiesTex.height,
      3,
      2,
      ["crab1", "crab2", "crab3", "bee1", "bee2", "bee3"],
      {
        crab: ["crab1", "crab2", "crab3"],
        bee: ["bee1", "bee2", "bee3"],
      },
    ),
  );
  await enemiesSheet.parse();

  // Items: 4x2 grid, 8 frames
  itemsSheet = new Spritesheet(
    itemsTex,
    buildSheetData(
      itemsTex.width,
      itemsTex.height,
      4,
      2,
      [
        "ring1",
        "ring2",
        "ring3",
        "ring4",
        "spring_yellow_compressed",
        "spring_yellow_extended",
        "spring_red_compressed",
        "spring_red_extended",
      ],
      {
        ring: ["ring1", "ring2", "ring3", "ring4"],
      },
    ),
  );
  await itemsSheet.parse();

  // Load backgrounds
  const [bgGreenhill, bgIndustrial] = await Promise.all([
    Assets.load<Texture>("/assets/backgrounds/bg_greenhill.jpg"),
    Assets.load<Texture>("/assets/backgrounds/bg_industrial.jpg"),
  ]);
  backgrounds.greenhill = bgGreenhill;
  backgrounds.industrial = bgIndustrial;

  // Load tilesets
  const [tileGreenhill, tileIndustrial] = await Promise.all([
    Assets.load<Texture>("/assets/tiles/tileset_greenhill.jpg"),
    Assets.load<Texture>("/assets/tiles/tileset_industrial.jpg"),
  ]);
  backgrounds.tileGreenhill = tileGreenhill;
  backgrounds.tileIndustrial = tileIndustrial;
}

// --- Accessor functions ---

/** Get a named player texture */
export function getPlayerFrame(name: string): Texture {
  return playerSheet.textures[name];
}

/** Get player animation texture array (e.g. "run", "idle") */
export function getPlayerAnimation(name: string): Texture[] {
  return playerSheet.animations[name];
}

/** Get a single enemy frame by type and index */
export function getEnemyFrame(
  type: "crab" | "bee",
  frameIndex: number,
): Texture {
  const anim = enemiesSheet.animations[type];
  return anim[frameIndex % anim.length];
}

/** Get enemy animation texture array */
export function getEnemyAnimation(type: "crab" | "bee"): Texture[] {
  return enemiesSheet.animations[type];
}

/** Get ring frame by index */
export function getRingFrame(frameIndex: number): Texture {
  const anim = itemsSheet.animations.ring;
  return anim[frameIndex % anim.length];
}

/** Get ring animation texture array */
export function getRingAnimation(): Texture[] {
  return itemsSheet.animations.ring;
}

/** Get spring texture by color and state */
export function getSpringFrame(
  color: "yellow" | "red",
  compressed: boolean,
): Texture {
  const state = compressed ? "compressed" : "extended";
  return itemsSheet.textures[`spring_${color}_${state}`];
}
