import {
  Assets,
  Texture,
  Spritesheet,
  type SpritesheetData,
  type Sprite,
} from "pixi.js"
import { ChromaKeyFilter } from "./ChromaKeyFilter"

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
  // shrink sprite to eliminate border
  border=0
): SpritesheetData {
  const fw = Math.floor(width / cols)
  const fh = Math.floor(height / rows)
  const frames: SpritesheetData["frames"] = {}

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col
      if (idx >= frameNames.length) break
      const n = 0
      frames[frameNames[idx]] = {
        //frame: { x: col * fw, y: row * fh, w: fw, h: fh },
        frame: {
          x: col * fw+n,
          y: row * fh+n,
          w: fw - 2 * n,
          h: fh - 2 * n,
        },
        trimmed: false,
        spriteSourceSize: {
          x: col * fw+n,
          y: row * fh+n,
          w: fw - 2 * n,
          h: fh - 2 * n,
        },
        //borders: { left: 4, top: 4, right: 4, bottom: 4 },
      }
    }
  }

  return {
    frames,
    animations,
    meta: { scale: 0.2 },
  }
}

// Parsed spritesheets
let playerSheet: Spritesheet
let enemiesSheet: Spritesheet
let itemsSheet: Spritesheet
let tileSheets: Record<string, Spritesheet> = {}

export const backgrounds: Record<string, Texture> = {}

/** Shared chroma key filter — magenta (#FF00FF) to transparent */
const chromaFilter = new ChromaKeyFilter([1.0, 0.0, 1.0], 0.45)

/** Apply chroma key filter to a sprite to remove magenta background */
export function applyChromaKey(sprite: Sprite) {
  sprite.filters = [chromaFilter]
}

export async function loadAllAssets() {
  // Load sprite sheet textures
  const [playerTex, enemiesTex, itemsTex] = await Promise.all([
    Assets.load<Texture>("/assets/sprites/player_spritesheet.jpg"),
    Assets.load<Texture>("/assets/sprites/enemies_spritesheet.jpg"),
    Assets.load<Texture>("/assets/sprites/items_spritesheet.jpg"),
  ])

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
  )
  await playerSheet.parse()

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
  )
  await enemiesSheet.parse()

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
  )
  await itemsSheet.parse()

  // Load backgrounds
  const [bgGreenhill, bgIndustrial] = await Promise.all([
    Assets.load<Texture>("/assets/backgrounds/bg_greenhill.jpg"),
    Assets.load<Texture>("/assets/backgrounds/bg_industrial.jpg"),
  ])
  backgrounds.greenhill = bgGreenhill
  backgrounds.industrial = bgIndustrial

  // Load and parse tilesets as spritesheets
  // Tile IDs: 1=dirt, 2=grass, 3=slope-right-45, 4=slope-left-45,
  //           5=gentle-right-low, 6=gentle-right-high, 7=gentle-left-low (was high), 8=gentle-left-high (was low), 9=half-platform
  // Layout: 5 cols x 2 rows
  // Row 0: dirt(1), grass(2), slope-right-45(3), slope-left-45(4), half-platform(9)
  // Row 1: gentle-right-low(5), gentle-right-high(6), gentle-left-high(8), gentle-left-low(7), empty
  const tileFrameNames = [
    "tile_1",
    "tile_2",
    "tile_3",
    "tile_4",
    "tile_9",
    "tile_5",
    "tile_6",
    "tile_8",
    "tile_7",
    "tile_empty",
  ]

  const [tileGreenhillTex, tileIndustrialTex] = await Promise.all([
    Assets.load<Texture>("/assets/tiles/tileset_greenhill.jpg"),
    Assets.load<Texture>("/assets/tiles/tileset_industrial.jpg"),
  ])

  const greenhillSheet = new Spritesheet(
    tileGreenhillTex,
    buildSheetData(
      tileGreenhillTex.width,
      tileGreenhillTex.height,
      5,
      2,
      tileFrameNames,
    ),
  )
  await greenhillSheet.parse()
  tileSheets["greenhill"] = greenhillSheet

  const industrialSheet = new Spritesheet(
    tileIndustrialTex,
    buildSheetData(
      tileIndustrialTex.width,
      tileIndustrialTex.height,
      5,
      2,
      tileFrameNames,
    ),
  )
  await industrialSheet.parse()
  tileSheets["industrial"] = industrialSheet
}

// --- Accessor functions ---

/** Get a named player texture */
export function getPlayerFrame(name: string): Texture {
  return playerSheet.textures[name]
}

/** Get player animation texture array (e.g. "run", "idle") */
export function getPlayerAnimation(name: string): Texture[] {
  return playerSheet.animations[name]
}

/** Get a single enemy frame by type and index */
export function getEnemyFrame(
  type: "crab" | "bee",
  frameIndex: number,
): Texture {
  const anim = enemiesSheet.animations[type]
  return anim[frameIndex % anim.length]
}

/** Get enemy animation texture array */
export function getEnemyAnimation(type: "crab" | "bee"): Texture[] {
  return enemiesSheet.animations[type]
}

/** Get ring frame by index */
export function getRingFrame(frameIndex: number): Texture {
  const anim = itemsSheet.animations.ring
  return anim[frameIndex % anim.length]
}

/** Get ring animation texture array */
export function getRingAnimation(): Texture[] {
  return itemsSheet.animations.ring
}

/** Get spring texture by color and state */
export function getSpringFrame(
  color: "yellow" | "red",
  compressed: boolean,
): Texture {
  const state = compressed ? "compressed" : "extended"
  return itemsSheet.textures[`spring_${color}_${state}`]
}

/** Get tile texture by tile ID and tileset name */
export function getTileTexture(
  tileId: number,
  tileset: string,
): Texture | null {
  return tileSheets[tileset]?.textures[`tile_${tileId}`] ?? null 
}

/** Check if a tileset has been loaded */
export function hasTileset(name: string): boolean {
  return name in tileSheets
}
